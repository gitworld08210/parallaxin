CREATE OR REPLACE FUNCTION public.vw_is_reviewer(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin_department_member(_uid, 'verification')
      OR public.is_admin_department_member(_uid, 'founder-office')
      OR public.is_admin_department_member(_uid, 'trust-safety');
$$;

CREATE TABLE public.virtual_world_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  aadhaar_number text NOT NULL,
  aadhaar_front_path text,
  aadhaar_back_path text,
  selfie_path text,
  purpose text NOT NULL,
  contact_phone text,
  status text NOT NULL DEFAULT 'pending',
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vw_app_status_chk CHECK (status IN ('pending','approved','rejected'))
);

GRANT SELECT, INSERT, UPDATE ON public.virtual_world_applications TO authenticated;
GRANT ALL ON public.virtual_world_applications TO service_role;
ALTER TABLE public.virtual_world_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vw_app_insert_own" ON public.virtual_world_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "vw_app_select_own_or_staff" ON public.virtual_world_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.vw_is_reviewer(auth.uid()));
CREATE POLICY "vw_app_staff_update" ON public.virtual_world_applications
  FOR UPDATE TO authenticated USING (public.vw_is_reviewer(auth.uid())) WITH CHECK (public.vw_is_reviewer(auth.uid()));

CREATE UNIQUE INDEX vw_app_one_pending ON public.virtual_world_applications (user_id) WHERE status = 'pending';

CREATE TABLE public.virtual_world_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  daily_limit integer NOT NULL DEFAULT 25,
  application_id uuid REFERENCES public.virtual_world_applications(id) ON DELETE SET NULL,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.virtual_world_access TO authenticated;
GRANT ALL ON public.virtual_world_access TO service_role;
ALTER TABLE public.virtual_world_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vw_access_select_own_or_staff" ON public.virtual_world_access
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.vw_is_reviewer(auth.uid()));
CREATE POLICY "vw_access_staff_all" ON public.virtual_world_access
  FOR ALL TO authenticated USING (public.vw_is_reviewer(auth.uid())) WITH CHECK (public.vw_is_reviewer(auth.uid()));

CREATE TABLE public.virtual_world_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL,
  to_number text NOT NULL,
  body text,
  provider_sid text,
  status text NOT NULL DEFAULT 'queued',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vw_log_channel_chk CHECK (channel IN ('sms','whatsapp','voice'))
);

GRANT SELECT ON public.virtual_world_logs TO authenticated;
GRANT ALL ON public.virtual_world_logs TO service_role;
ALTER TABLE public.virtual_world_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vw_log_select_own_or_staff" ON public.virtual_world_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.vw_is_reviewer(auth.uid()));

CREATE INDEX vw_logs_user_created_idx ON public.virtual_world_logs (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.vw_has_access(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.virtual_world_access a WHERE a.user_id = _uid AND a.is_active);
$$;

CREATE OR REPLACE FUNCTION public.vw_decide_application(_application_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _app public.virtual_world_applications%ROWTYPE;
BEGIN
  IF NOT public.vw_is_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO _app FROM public.virtual_world_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;

  UPDATE public.virtual_world_applications
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         review_note = _note,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _application_id;

  IF _approve THEN
    INSERT INTO public.virtual_world_access (user_id, application_id, granted_by, is_active, revoked_at)
    VALUES (_app.user_id, _application_id, auth.uid(), true, NULL)
    ON CONFLICT (user_id) DO UPDATE
      SET is_active = true, revoked_at = NULL, application_id = EXCLUDED.application_id,
          granted_by = EXCLUDED.granted_by, granted_at = now(), updated_at = now();
  END IF;
END;
$$;

CREATE TRIGGER vw_app_updated_at BEFORE UPDATE ON public.virtual_world_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER vw_access_updated_at BEFORE UPDATE ON public.virtual_world_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();