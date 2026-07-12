
-- =========================================================
-- Phase 2.8 — Recruitment & Hiring Management
-- =========================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.hiring_request_status AS ENUM (
    'draft','pending_hr','pending_founder','approved','on_hold','rejected','closed','filled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hiring_priority AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.candidate_stage AS ENUM (
    'applied','screening','hr_interview','technical_interview','manager_interview',
    'founder_interview','final_review','offer','hired','rejected','withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.candidate_status AS ENUM ('active','on_hold','rejected','withdrawn','hired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.application_status AS ENUM ('active','on_hold','rejected','withdrawn','offer_extended','hired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.interview_round_status AS ENUM ('scheduled','completed','cancelled','no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.interview_decision AS ENUM ('pending','pass','hold','reject','reopen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.interview_recommendation AS ENUM ('strong_hire','hire','no_hire','strong_no_hire');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.offer_status AS ENUM (
    'draft','pending_approval','approved','sent','accepted','rejected','expired','withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.candidate_event_type AS ENUM (
    'application','stage_change','interview_scheduled','interview_completed',
    'feedback_submitted','offer_generated','offer_sent','offer_accepted','offer_rejected',
    'offer_withdrawn','communication','status_change','hired','rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------
-- Hiring requests
-- ---------------------------------------------------------
CREATE TABLE public.hiring_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE DEFAULT ('HR-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  role_title TEXT NOT NULL,
  level TEXT,
  vacancies INTEGER NOT NULL DEFAULT 1 CHECK (vacancies > 0),
  reason TEXT NOT NULL,
  priority public.hiring_priority NOT NULL DEFAULT 'medium',
  expected_joining DATE,
  budget_approved BOOLEAN NOT NULL DEFAULT false,
  budget_notes TEXT,
  status public.hiring_request_status NOT NULL DEFAULT 'draft',
  requested_by UUID,
  approver_id UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  filled_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hr_status ON public.hiring_requests(status);
CREATE INDEX idx_hr_dept   ON public.hiring_requests(department_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hiring_requests TO authenticated;
GRANT ALL ON public.hiring_requests TO service_role;
ALTER TABLE public.hiring_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_view" ON public.hiring_requests FOR SELECT TO authenticated USING (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
);
CREATE POLICY "hr_ins" ON public.hiring_requests FOR INSERT TO authenticated WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
);
CREATE POLICY "hr_upd" ON public.hiring_requests FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage'));
CREATE TRIGGER trg_hr_updated BEFORE UPDATE ON public.hiring_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- Candidates
-- ---------------------------------------------------------
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_number TEXT NOT NULL UNIQUE DEFAULT ('C-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  resume_url TEXT,
  linkedin_url TEXT,
  location TEXT,
  source TEXT,
  headline TEXT,
  notes TEXT,
  current_stage public.candidate_stage NOT NULL DEFAULT 'applied',
  status public.candidate_status NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cand_stage ON public.candidates(current_stage);
CREATE INDEX idx_cand_status ON public.candidates(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cand_view" ON public.candidates FOR SELECT TO authenticated USING (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.interview')
);
CREATE POLICY "cand_ins" ON public.candidates FOR INSERT TO authenticated WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
);
CREATE POLICY "cand_upd" ON public.candidates FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage'));
CREATE TRIGGER trg_cand_updated BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- Applications (candidate ↔ hiring_request)
-- ---------------------------------------------------------
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  hiring_request_id UUID NOT NULL REFERENCES public.hiring_requests(id) ON DELETE CASCADE,
  current_stage public.candidate_stage NOT NULL DEFAULT 'applied',
  status public.application_status NOT NULL DEFAULT 'active',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rejection_reason TEXT,
  assigned_recruiter UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, hiring_request_id)
);
CREATE INDEX idx_app_candidate ON public.applications(candidate_id);
CREATE INDEX idx_app_hr ON public.applications(hiring_request_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_view" ON public.applications FOR SELECT TO authenticated USING (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.interview')
);
CREATE POLICY "app_ins" ON public.applications FOR INSERT TO authenticated WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
);
CREATE POLICY "app_upd" ON public.applications FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage'));
CREATE TRIGGER trg_app_updated BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- Interview rounds
-- ---------------------------------------------------------
CREATE TABLE public.interview_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  stage public.candidate_stage NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 1,
  interviewer_id UUID,
  interviewer_name TEXT,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  meeting_url TEXT,
  location TEXT,
  status public.interview_round_status NOT NULL DEFAULT 'scheduled',
  decision public.interview_decision NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ir_app ON public.interview_rounds(application_id);
CREATE INDEX idx_ir_int ON public.interview_rounds(interviewer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_rounds TO authenticated;
GRANT ALL ON public.interview_rounds TO service_role;
ALTER TABLE public.interview_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ir_view" ON public.interview_rounds FOR SELECT TO authenticated USING (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.interview')
);
CREATE POLICY "ir_ins" ON public.interview_rounds FOR INSERT TO authenticated WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
);
CREATE POLICY "ir_upd" ON public.interview_rounds FOR UPDATE TO authenticated
  USING (
    public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
    OR (interviewer_id IS NOT NULL AND interviewer_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
    OR (interviewer_id IS NOT NULL AND interviewer_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
  );
CREATE TRIGGER trg_ir_updated BEFORE UPDATE ON public.interview_rounds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- Interview feedback (immutable after submit)
-- ---------------------------------------------------------
CREATE TABLE public.interview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.interview_rounds(id) ON DELETE CASCADE,
  interviewer_id UUID,
  interviewer_name TEXT,
  technical_rating SMALLINT CHECK (technical_rating BETWEEN 1 AND 5),
  communication_rating SMALLINT CHECK (communication_rating BETWEEN 1 AND 5),
  problem_solving_rating SMALLINT CHECK (problem_solving_rating BETWEEN 1 AND 5),
  culture_fit_rating SMALLINT CHECK (culture_fit_rating BETWEEN 1 AND 5),
  overall_rating SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  comments TEXT,
  recommendation public.interview_recommendation NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, interviewer_id)
);
CREATE INDEX idx_if_round ON public.interview_feedback(round_id);
GRANT SELECT, INSERT ON public.interview_feedback TO authenticated;
GRANT ALL ON public.interview_feedback TO service_role;
ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "if_view" ON public.interview_feedback FOR SELECT TO authenticated USING (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.interview')
);
CREATE POLICY "if_ins" ON public.interview_feedback FOR INSERT TO authenticated WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.interview')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
);
-- No UPDATE / DELETE policy → feedback is immutable after submission.

-- ---------------------------------------------------------
-- Offers
-- ---------------------------------------------------------
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_number TEXT NOT NULL UNIQUE DEFAULT ('OF-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  salary_amount NUMERIC(14,2),
  salary_currency TEXT DEFAULT 'USD',
  level TEXT,
  role_title TEXT,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  effective_date DATE,
  expires_at TIMESTAMPTZ,
  status public.offer_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  generated_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, version)
);
CREATE INDEX idx_off_app ON public.offers(application_id);
CREATE INDEX idx_off_status ON public.offers(status);
GRANT SELECT, INSERT, UPDATE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "off_view" ON public.offers FOR SELECT TO authenticated USING (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.offer')
);
CREATE POLICY "off_ins" ON public.offers FOR INSERT TO authenticated WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.offer')
);
CREATE POLICY "off_upd" ON public.offers FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.recruitment.offer'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.recruitment.offer'));
CREATE TRIGGER trg_off_updated BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- Candidate timeline (immutable event log)
-- ---------------------------------------------------------
CREATE TABLE public.candidate_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  event_type public.candidate_event_type NOT NULL,
  actor_user_id UUID,
  notes TEXT,
  metadata JSONB,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ct_candidate ON public.candidate_timeline(candidate_id, event_at DESC);
GRANT SELECT, INSERT ON public.candidate_timeline TO authenticated;
GRANT ALL ON public.candidate_timeline TO service_role;
ALTER TABLE public.candidate_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_view" ON public.candidate_timeline FOR SELECT TO authenticated USING (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.interview')
);
CREATE POLICY "ct_ins" ON public.candidate_timeline FOR INSERT TO authenticated WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.recruitment.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.manage')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.interview')
  OR public.has_admin_permission(auth.uid(),'people_ops.recruitment.offer')
);

-- ---------------------------------------------------------
-- Automatic candidate timeline on major changes
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_application_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.candidate_timeline (candidate_id, application_id, event_type, notes)
    VALUES (NEW.candidate_id, NEW.id, 'application', 'Application created');
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN
      INSERT INTO public.candidate_timeline (candidate_id, application_id, event_type, notes, metadata)
      VALUES (NEW.candidate_id, NEW.id, 'stage_change',
        'Stage changed to ' || NEW.current_stage,
        jsonb_build_object('from', OLD.current_stage, 'to', NEW.current_stage));
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.candidate_timeline (candidate_id, application_id, event_type, notes, metadata)
      VALUES (NEW.candidate_id, NEW.id, 'status_change',
        'Status changed to ' || NEW.status,
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_app_timeline
AFTER INSERT OR UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.log_application_change();

CREATE OR REPLACE FUNCTION public.log_interview_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cand UUID;
BEGIN
  SELECT candidate_id INTO v_cand FROM public.applications WHERE id = NEW.application_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.candidate_timeline (candidate_id, application_id, event_type, notes, metadata)
    VALUES (v_cand, NEW.application_id, 'interview_scheduled',
      'Interview scheduled: ' || NEW.stage,
      jsonb_build_object('round_id', NEW.id, 'scheduled_at', NEW.scheduled_at));
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    INSERT INTO public.candidate_timeline (candidate_id, application_id, event_type, notes, metadata)
    VALUES (v_cand, NEW.application_id, 'interview_completed',
      'Interview completed: ' || NEW.stage,
      jsonb_build_object('round_id', NEW.id, 'decision', NEW.decision));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_interview_timeline
AFTER INSERT OR UPDATE ON public.interview_rounds
FOR EACH ROW EXECUTE FUNCTION public.log_interview_change();

CREATE OR REPLACE FUNCTION public.log_offer_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cand UUID;
BEGIN
  SELECT candidate_id INTO v_cand FROM public.applications WHERE id = NEW.application_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.candidate_timeline (candidate_id, application_id, event_type, notes, metadata)
    VALUES (v_cand, NEW.application_id, 'offer_generated',
      'Offer generated v' || NEW.version,
      jsonb_build_object('offer_id', NEW.id, 'version', NEW.version));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'sent' THEN
      INSERT INTO public.candidate_timeline (candidate_id, application_id, event_type, notes, metadata)
      VALUES (v_cand, NEW.application_id, 'offer_sent', 'Offer sent to candidate',
        jsonb_build_object('offer_id', NEW.id));
    ELSIF NEW.status = 'accepted' THEN
      INSERT INTO public.candidate_timeline (candidate_id, application_id, event_type, notes, metadata)
      VALUES (v_cand, NEW.application_id, 'offer_accepted', 'Offer accepted by candidate',
        jsonb_build_object('offer_id', NEW.id));
      -- Sync candidate + application state
      UPDATE public.candidates SET current_stage = 'hired', status = 'hired' WHERE id = v_cand;
      UPDATE public.applications SET current_stage = 'hired', status = 'hired' WHERE id = NEW.application_id;
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.candidate_timeline (candidate_id, application_id, event_type, notes, metadata)
      VALUES (v_cand, NEW.application_id, 'offer_rejected', 'Offer rejected by candidate',
        jsonb_build_object('offer_id', NEW.id, 'reason', NEW.rejection_reason));
    ELSIF NEW.status = 'withdrawn' THEN
      INSERT INTO public.candidate_timeline (candidate_id, application_id, event_type, notes, metadata)
      VALUES (v_cand, NEW.application_id, 'offer_withdrawn', 'Offer withdrawn',
        jsonb_build_object('offer_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_offer_timeline
AFTER INSERT OR UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.log_offer_change();

-- Interview feedback → seal round with pass/reject/hold via recommendation
CREATE OR REPLACE FUNCTION public.log_feedback_submit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cand UUID; v_app UUID;
BEGIN
  SELECT r.application_id, a.candidate_id INTO v_app, v_cand
  FROM public.interview_rounds r JOIN public.applications a ON a.id = r.application_id
  WHERE r.id = NEW.round_id;
  INSERT INTO public.candidate_timeline (candidate_id, application_id, event_type, notes, metadata)
  VALUES (v_cand, v_app, 'feedback_submitted',
    'Feedback submitted: ' || NEW.recommendation,
    jsonb_build_object('round_id', NEW.round_id, 'overall_rating', NEW.overall_rating));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_feedback_timeline
AFTER INSERT ON public.interview_feedback
FOR EACH ROW EXECUTE FUNCTION public.log_feedback_submit();

-- ---------------------------------------------------------
-- Permission registry + auto-grant to People Ops roles
-- ---------------------------------------------------------
INSERT INTO public.admin_permissions (permission_key, name, description, module) VALUES
  ('people_ops.recruitment.view',      'View recruitment',    'View hiring requests, candidates, interviews and offers', 'people_ops'),
  ('people_ops.recruitment.manage',    'Manage recruitment',  'Manage hiring requests, candidates, applications and interviews', 'people_ops'),
  ('people_ops.recruitment.interview', 'Submit interview feedback', 'Update interview rounds and submit interview feedback', 'people_ops'),
  ('people_ops.recruitment.offer',     'Manage offers',       'Generate, approve, send, and withdraw offers', 'people_ops')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE p.permission_key IN (
  'people_ops.recruitment.view',
  'people_ops.recruitment.manage',
  'people_ops.recruitment.interview',
  'people_ops.recruitment.offer'
)
AND r.id IN (
  SELECT DISTINCT rp.role_id FROM public.admin_role_permissions rp
  JOIN public.admin_permissions p2 ON p2.id = rp.permission_id
  WHERE p2.permission_key = 'people_ops.employees.manage'
)
ON CONFLICT DO NOTHING;
