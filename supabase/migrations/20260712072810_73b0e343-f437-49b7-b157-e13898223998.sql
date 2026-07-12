
-- Enums
DO $$ BEGIN
  CREATE TYPE ver_type AS ENUM (
    'individual','creator','organization','business','employee','public_figure','government','education'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ver_status AS ENUM (
    'pending','under_review','info_required','approved','rejected','suspended','revoked','expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ver_badge_kind AS ENUM (
    'blue','organization','business','employee_affiliation','creator','public_figure','government','education'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ver_affiliation_kind AS ENUM (
    'employee_org','creator_brand','executive_company','partner_org'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Staff helper
CREATE OR REPLACE FUNCTION public.is_verification_staff(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      JOIN public.admin_departments d ON d.id = e.department_id
      WHERE e.user_id = _user
        AND e.employment_status = 'active'
        AND d.key IN ('verification','trust_safety','founder_office')
    );
$$;

-- Applications
CREATE TABLE public.ver_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number text UNIQUE NOT NULL,
  ver_type ver_type NOT NULL,
  subject_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_org_id uuid,
  subject_display_name text NOT NULL,
  status ver_status NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'normal',
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requires_dual_review boolean NOT NULL DEFAULT false,
  submission_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ver_applications TO authenticated;
GRANT ALL ON public.ver_applications TO service_role;
ALTER TABLE public.ver_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver_app_staff_all" ON public.ver_applications
  FOR ALL TO authenticated USING (public.is_verification_staff(auth.uid()))
  WITH CHECK (public.is_verification_staff(auth.uid()));
CREATE POLICY "ver_app_subject_read" ON public.ver_applications
  FOR SELECT TO authenticated
  USING (subject_user_id = auth.uid() OR submitted_by = auth.uid());
CREATE POLICY "ver_app_self_submit" ON public.ver_applications
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE INDEX ver_app_status_idx ON public.ver_applications(status);
CREATE INDEX ver_app_type_idx ON public.ver_applications(ver_type);
CREATE INDEX ver_app_subject_user_idx ON public.ver_applications(subject_user_id);

-- Documents (immutable after insert)
CREATE TABLE public.ver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.ver_applications(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_url text NOT NULL,
  file_name text,
  content_hash text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ver_documents TO authenticated;
GRANT ALL ON public.ver_documents TO service_role;
ALTER TABLE public.ver_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver_doc_staff_all" ON public.ver_documents
  FOR ALL TO authenticated USING (public.is_verification_staff(auth.uid()))
  WITH CHECK (public.is_verification_staff(auth.uid()));
CREATE POLICY "ver_doc_subject_read" ON public.ver_documents
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ver_applications a
      WHERE a.id = ver_documents.application_id
        AND (a.subject_user_id = auth.uid() OR a.submitted_by = auth.uid()))
  );
CREATE POLICY "ver_doc_self_upload" ON public.ver_documents
  FOR INSERT TO authenticated WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.ver_applications a
      WHERE a.id = application_id
        AND (a.subject_user_id = auth.uid() OR a.submitted_by = auth.uid()))
  );

-- Reviews
CREATE TABLE public.ver_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.ver_applications(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  round int NOT NULL DEFAULT 1,
  decision ver_status NOT NULL,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  policy_refs text[] NOT NULL DEFAULT '{}',
  is_final boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ver_reviews TO authenticated;
GRANT ALL ON public.ver_reviews TO service_role;
ALTER TABLE public.ver_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver_rev_staff_all" ON public.ver_reviews
  FOR ALL TO authenticated USING (public.is_verification_staff(auth.uid()))
  WITH CHECK (public.is_verification_staff(auth.uid()));
CREATE POLICY "ver_rev_subject_read" ON public.ver_reviews
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ver_applications a
      WHERE a.id = ver_reviews.application_id
        AND (a.subject_user_id = auth.uid() OR a.submitted_by = auth.uid()))
  );

-- Badges
CREATE TABLE public.ver_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id text UNIQUE NOT NULL,
  application_id uuid REFERENCES public.ver_applications(id) ON DELETE SET NULL,
  subject_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_org_id uuid,
  badge_kind ver_badge_kind NOT NULL,
  status ver_status NOT NULL DEFAULT 'approved',
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ver_badges TO authenticated;
GRANT SELECT ON public.ver_badges TO anon;
GRANT ALL ON public.ver_badges TO service_role;
ALTER TABLE public.ver_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver_badge_public_read" ON public.ver_badges
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ver_badge_staff_write" ON public.ver_badges
  FOR ALL TO authenticated USING (public.is_verification_staff(auth.uid()))
  WITH CHECK (public.is_verification_staff(auth.uid()));

CREATE INDEX ver_badge_subject_user_idx ON public.ver_badges(subject_user_id);
CREATE INDEX ver_badge_subject_org_idx ON public.ver_badges(subject_org_id);

-- Affiliations
CREATE TABLE public.ver_affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliation_kind ver_affiliation_kind NOT NULL,
  subject_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  organization_name text NOT NULL,
  role_label text,
  status ver_status NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  badge_id uuid REFERENCES public.ver_badges(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ver_affiliations TO authenticated;
GRANT ALL ON public.ver_affiliations TO service_role;
ALTER TABLE public.ver_affiliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver_aff_staff_all" ON public.ver_affiliations
  FOR ALL TO authenticated USING (public.is_verification_staff(auth.uid()))
  WITH CHECK (public.is_verification_staff(auth.uid()));
CREATE POLICY "ver_aff_subject_read" ON public.ver_affiliations
  FOR SELECT TO authenticated USING (subject_user_id = auth.uid());

-- Appeals
CREATE TABLE public.ver_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.ver_applications(id) ON DELETE CASCADE,
  original_review_id uuid REFERENCES public.ver_reviews(id) ON DELETE SET NULL,
  filed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  status ver_status NOT NULL DEFAULT 'pending',
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ver_appeals TO authenticated;
GRANT ALL ON public.ver_appeals TO service_role;
ALTER TABLE public.ver_appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver_appeal_staff_all" ON public.ver_appeals
  FOR ALL TO authenticated USING (public.is_verification_staff(auth.uid()))
  WITH CHECK (public.is_verification_staff(auth.uid()));
CREATE POLICY "ver_appeal_filer_read" ON public.ver_appeals
  FOR SELECT TO authenticated USING (filed_by = auth.uid());
CREATE POLICY "ver_appeal_filer_insert" ON public.ver_appeals
  FOR INSERT TO authenticated WITH CHECK (filed_by = auth.uid());

-- Renewals
CREATE TABLE public.ver_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id uuid NOT NULL REFERENCES public.ver_badges(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.ver_applications(id) ON DELETE SET NULL,
  status ver_status NOT NULL DEFAULT 'pending',
  reminder_sent_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_notes text,
  new_expiry timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ver_renewals TO authenticated;
GRANT ALL ON public.ver_renewals TO service_role;
ALTER TABLE public.ver_renewals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver_ren_staff_all" ON public.ver_renewals
  FOR ALL TO authenticated USING (public.is_verification_staff(auth.uid()))
  WITH CHECK (public.is_verification_staff(auth.uid()));

-- History (append-only immutable)
CREATE TABLE public.ver_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.ver_applications(id) ON DELETE SET NULL,
  badge_id uuid REFERENCES public.ver_badges(id) ON DELETE SET NULL,
  affiliation_id uuid REFERENCES public.ver_affiliations(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ver_history TO authenticated;
GRANT ALL ON public.ver_history TO service_role;
ALTER TABLE public.ver_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver_hist_staff_read" ON public.ver_history
  FOR SELECT TO authenticated USING (public.is_verification_staff(auth.uid()));
CREATE POLICY "ver_hist_subject_read" ON public.ver_history
  FOR SELECT TO authenticated USING (
    application_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.ver_applications a
      WHERE a.id = ver_history.application_id
        AND (a.subject_user_id = auth.uid() OR a.submitted_by = auth.uid())
    )
  );
CREATE POLICY "ver_hist_insert_any_auth" ON public.ver_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Immutability: block updates/deletes on history, documents, reviews
CREATE OR REPLACE FUNCTION public.ver_block_write() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable record'; END; $$;

CREATE TRIGGER ver_history_no_update BEFORE UPDATE OR DELETE ON public.ver_history
  FOR EACH ROW EXECUTE FUNCTION public.ver_block_write();
CREATE TRIGGER ver_documents_no_update BEFORE UPDATE OR DELETE ON public.ver_documents
  FOR EACH ROW EXECUTE FUNCTION public.ver_block_write();
CREATE TRIGGER ver_reviews_no_update BEFORE UPDATE OR DELETE ON public.ver_reviews
  FOR EACH ROW EXECUTE FUNCTION public.ver_block_write();

-- App number + updated_at
CREATE OR REPLACE FUNCTION public.ver_app_before_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.application_number IS NULL OR NEW.application_number = '' THEN
    NEW.application_number := 'VER-' || to_char(now(),'YYYY') || '-' ||
      lpad((floor(random()*900000)::int + 100000)::text, 6, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER ver_app_num BEFORE INSERT ON public.ver_applications
  FOR EACH ROW EXECUTE FUNCTION public.ver_app_before_insert();

CREATE OR REPLACE FUNCTION public.ver_badge_before_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.verification_id IS NULL OR NEW.verification_id = '' THEN
    NEW.verification_id := 'VID-' || to_char(now(),'YYYYMMDD') || '-' ||
      lpad((floor(random()*900000)::int + 100000)::text, 6, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER ver_badge_id BEFORE INSERT ON public.ver_badges
  FOR EACH ROW EXECUTE FUNCTION public.ver_badge_before_insert();

CREATE TRIGGER ver_app_touch BEFORE UPDATE ON public.ver_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ver_badge_touch BEFORE UPDATE ON public.ver_badges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ver_aff_touch BEFORE UPDATE ON public.ver_affiliations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ver_appeal_touch BEFORE UPDATE ON public.ver_appeals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ver_ren_touch BEFORE UPDATE ON public.ver_renewals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-history on application status change
CREATE OR REPLACE FUNCTION public.ver_app_status_hist() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ver_history(application_id, event_type, actor_id, details)
    VALUES (NEW.id, 'application_created', NEW.submitted_by,
      jsonb_build_object('ver_type', NEW.ver_type, 'number', NEW.application_number));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.ver_history(application_id, event_type, actor_id, details)
    VALUES (NEW.id, 'status_changed', auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER ver_app_hist AFTER INSERT OR UPDATE OF status ON public.ver_applications
  FOR EACH ROW EXECUTE FUNCTION public.ver_app_status_hist();

CREATE OR REPLACE FUNCTION public.ver_badge_hist() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ver_history(badge_id, application_id, event_type, actor_id, details)
    VALUES (NEW.id, NEW.application_id, 'badge_issued', NEW.issued_by,
      jsonb_build_object('kind', NEW.badge_kind, 'verification_id', NEW.verification_id));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.ver_history(badge_id, event_type, actor_id, details)
    VALUES (NEW.id, 'badge_status_changed', auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status, 'reason', NEW.revoked_reason));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER ver_badge_hist_trg AFTER INSERT OR UPDATE OF status ON public.ver_badges
  FOR EACH ROW EXECUTE FUNCTION public.ver_badge_hist();

-- Seed Verification department if missing
INSERT INTO public.admin_departments (key, name, description, is_system)
VALUES ('verification','Verification','Identity, creator, organization, and affiliation verification',true)
ON CONFLICT (key) DO NOTHING;
