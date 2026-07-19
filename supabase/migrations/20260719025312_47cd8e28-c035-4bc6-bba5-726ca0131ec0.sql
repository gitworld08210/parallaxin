
-- =========================================================
-- Phase 2: Reusable department-routing engine
-- =========================================================

CREATE TABLE IF NOT EXISTS public.routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_event text NOT NULL DEFAULT 'insert',
  target_table text NOT NULL,
  department   text NOT NULL,
  sla_hours    int  NOT NULL DEFAULT 72,
  default_priority text NOT NULL DEFAULT 'normal',
  active       boolean NOT NULL DEFAULT true,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_event)
);

GRANT SELECT ON public.routing_rules TO authenticated;
GRANT ALL    ON public.routing_rules TO service_role;
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;

-- Helper: is caller an active Admin OS staff member (any role)?
CREATE OR REPLACE FUNCTION public.is_admin_os_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.employment_status = 'active'
  ) OR public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_os_founder()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.admin_roles r ON r.id = e.role_id
    WHERE e.user_id = auth.uid()
      AND e.employment_status = 'active'
      AND r.key IN ('founder', 'co_founder')
  );
$$;

CREATE POLICY "routing_rules readable by staff"
ON public.routing_rules FOR SELECT TO authenticated
USING (public.is_admin_os_staff());

CREATE POLICY "routing_rules manageable by founder"
ON public.routing_rules FOR ALL TO authenticated
USING (public.is_admin_os_founder())
WITH CHECK (public.is_admin_os_founder());

-- ---------- audit: routing_events ----------
CREATE TABLE IF NOT EXISTS public.routing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id    uuid NOT NULL,
  target_table text NOT NULL,
  target_id    uuid,
  department   text NOT NULL,
  actor_id     uuid,
  status       text NOT NULL DEFAULT 'routed',
  sla_due_at   timestamptz,
  error        text,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routing_events_source ON public.routing_events(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_routing_events_dept   ON public.routing_events(department, created_at DESC);

GRANT SELECT ON public.routing_events TO authenticated;
GRANT ALL    ON public.routing_events TO service_role;
ALTER TABLE public.routing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routing_events readable by staff"
ON public.routing_events FOR SELECT TO authenticated
USING (public.is_admin_os_staff());

CREATE POLICY "routing_events insertable by system"
ON public.routing_events FOR INSERT TO authenticated
WITH CHECK (true);

-- ---------- helper: log_routing_event ----------
CREATE OR REPLACE FUNCTION public.log_routing_event(
  p_source_table text,
  p_source_id    uuid,
  p_target_table text,
  p_target_id    uuid,
  p_actor_id     uuid,
  p_metadata     jsonb DEFAULT '{}'::jsonb,
  p_status       text  DEFAULT 'routed',
  p_error        text  DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.routing_rules%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT * INTO v_rule
  FROM public.routing_rules
  WHERE source_table = p_source_table AND active = true
  LIMIT 1;

  INSERT INTO public.routing_events (
    source_table, source_id, target_table, target_id,
    department, actor_id, status, sla_due_at, error, metadata
  ) VALUES (
    p_source_table, p_source_id, p_target_table, p_target_id,
    COALESCE(v_rule.department, 'unassigned'),
    p_actor_id,
    p_status,
    CASE WHEN v_rule.sla_hours IS NOT NULL
         THEN now() + (v_rule.sla_hours || ' hours')::interval END,
    p_error,
    p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- ---------- seed rules ----------
INSERT INTO public.routing_rules (source_table, source_event, target_table, department, sla_hours, default_priority, notes) VALUES
  ('verification_requests', 'insert', 'ver_applications', 'verification', 72, 'normal', 'User-submitted verification'),
  ('kyc_submissions',       'insert', 'ver_applications', 'verification', 48, 'normal', 'KYC intake'),
  ('reports',               'insert', 'ts_cases',         'trust_safety', 24, 'normal', 'User content reports'),
  ('payout_requests',       'insert', 'payout_requests',  'finance',      48, 'normal', 'Creator payout requests'),
  ('sup_tickets',           'insert', 'sup_tickets',      'support',      24, 'normal', 'User support tickets')
ON CONFLICT (source_table, source_event) DO UPDATE
  SET target_table = EXCLUDED.target_table,
      department   = EXCLUDED.department,
      sla_hours    = EXCLUDED.sla_hours,
      notes        = EXCLUDED.notes,
      active       = true,
      updated_at   = now();

-- ---------- refactor existing triggers to log events ----------
CREATE OR REPLACE FUNCTION public.route_verification_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_id uuid;
  v_ver_type text;
BEGIN
  IF NEW.ver_application_id IS NOT NULL THEN RETURN NEW; END IF;

  v_ver_type := CASE NEW.category
    WHEN 'public_figure' THEN 'public_figure'
    WHEN 'government'   THEN 'government'
    WHEN 'business'     THEN 'business'
    WHEN 'founder'      THEN 'creator'
    WHEN 'media'        THEN 'individual'
    ELSE 'individual'
  END;

  INSERT INTO public.ver_applications (
    application_number, ver_type, subject_user_id, subject_display_name,
    status, submitted_by, submission_notes, metadata
  ) VALUES (
    'VR-' || to_char(NEW.created_at, 'YYYY') || '-' || replace(NEW.id::text, '-', '')::text,
    v_ver_type, NEW.user_id, NEW.full_name,
    'pending', NEW.user_id, NEW.reason,
    jsonb_build_object('source','verification_requests','source_id',NEW.id,
      'organization',NEW.organization,'official_email',NEW.official_email,
      'country',NEW.country,'dob',NEW.dob,'links',NEW.links)
  )
  RETURNING id INTO v_app_id;

  IF NEW.id_doc_url IS NOT NULL THEN
    INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
    VALUES (v_app_id, 'id_document', NEW.id_doc_url, NEW.user_id);
  END IF;
  IF NEW.supporting_doc_url IS NOT NULL THEN
    INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
    VALUES (v_app_id, 'supporting_document', NEW.supporting_doc_url, NEW.user_id);
  END IF;

  INSERT INTO public.ver_history (application_id, event_type, actor_id, details)
  VALUES (v_app_id, 'submitted', NEW.user_id,
    jsonb_build_object('source','verification_requests','source_id',NEW.id));

  NEW.ver_application_id := v_app_id;

  PERFORM public.log_routing_event(
    'verification_requests', NEW.id, 'ver_applications', v_app_id, NEW.user_id,
    jsonb_build_object('category', NEW.category)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.route_kyc_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_id uuid;
BEGIN
  IF NEW.ver_application_id IS NOT NULL THEN RETURN NEW; END IF;

  INSERT INTO public.ver_applications (
    application_number, ver_type, subject_user_id, subject_display_name,
    status, submitted_by, metadata
  ) VALUES (
    'KYC-' || to_char(NEW.created_at, 'YYYY') || '-' || replace(NEW.id::text, '-', '')::text,
    'individual', NEW.user_id, NEW.full_name,
    'pending', NEW.user_id,
    jsonb_build_object('source','kyc_submissions','source_id',NEW.id,
      'pan_number',NEW.pan_number,'bank_name',NEW.bank_name,'bank_ifsc',NEW.bank_ifsc,
      'bank_account_last4', right(coalesce(NEW.bank_account_number,''),4))
  )
  RETURNING id INTO v_app_id;

  IF NEW.id_photo_url IS NOT NULL THEN
    INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
    VALUES (v_app_id, 'kyc_id_photo', NEW.id_photo_url, NEW.user_id);
  END IF;
  IF NEW.passbook_photo_url IS NOT NULL THEN
    INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
    VALUES (v_app_id, 'kyc_passbook_photo', NEW.passbook_photo_url, NEW.user_id);
  END IF;

  INSERT INTO public.ver_history (application_id, event_type, actor_id, details)
  VALUES (v_app_id, 'submitted', NEW.user_id,
    jsonb_build_object('source','kyc_submissions','source_id',NEW.id,'kind','kyc'));

  NEW.ver_application_id := v_app_id;

  PERFORM public.log_routing_event(
    'kyc_submissions', NEW.id, 'ver_applications', v_app_id, NEW.user_id,
    jsonb_build_object('kind','kyc')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.route_user_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_subject_user uuid;
  v_severity text;
  v_priority text;
  v_high_sev constant text[] := ARRAY['violence','hate','nudity'];
BEGIN
  IF NEW.ts_case_id IS NOT NULL THEN RETURN NEW; END IF;

  IF NEW.target_kind = 'profile' THEN
    v_subject_user := NEW.target_id;
  ELSIF NEW.target_kind = 'post' THEN
    SELECT user_id INTO v_subject_user FROM public.posts WHERE id = NEW.target_id;
  ELSIF NEW.target_kind = 'comment' THEN
    SELECT user_id INTO v_subject_user FROM public.comments WHERE id = NEW.target_id;
  ELSIF NEW.target_kind = 'message' THEN
    SELECT sender_id INTO v_subject_user FROM public.messages WHERE id = NEW.target_id;
  END IF;

  v_severity := CASE WHEN NEW.reason = ANY(v_high_sev) THEN 'high' ELSE 'medium' END;
  v_priority := CASE WHEN NEW.reason = ANY(v_high_sev) THEN 'high' ELSE 'normal' END;

  INSERT INTO public.ts_cases (
    category, severity, status, source, reporter_id,
    subject_user_id, subject_content_type, subject_content_id,
    title, description, priority, created_by
  ) VALUES (
    NEW.reason, v_severity, 'new', 'user_report', NEW.reporter_id,
    v_subject_user,
    CASE WHEN NEW.target_kind = 'profile' THEN NULL ELSE NEW.target_kind END,
    CASE WHEN NEW.target_kind = 'profile' THEN NULL ELSE NEW.target_id END,
    'Report: ' || NEW.reason || ' on ' || NEW.target_kind,
    NEW.details, v_priority, NEW.reporter_id
  )
  RETURNING id INTO v_case_id;

  INSERT INTO public.ts_case_timeline (case_id, event_type, actor_id, description, metadata)
  VALUES (v_case_id, 'case_opened', NEW.reporter_id, 'Reported by user',
    jsonb_build_object('source','reports','source_id',NEW.id));

  NEW.ts_case_id := v_case_id;

  PERFORM public.log_routing_event(
    'reports', NEW.id, 'ts_cases', v_case_id, NEW.reporter_id,
    jsonb_build_object('reason',NEW.reason,'target_kind',NEW.target_kind,'severity',v_severity)
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_routing_event IS
  'Phase 2 department-routing engine: log a system-of-record dispatch. Rule lookup uses public.routing_rules by source_table.';
COMMENT ON TABLE public.routing_rules  IS 'Config-driven routing: source table -> department queue with SLA.';
COMMENT ON TABLE public.routing_events IS 'Audit log of every intake dispatch; drives the Admin OS intake dashboard.';
