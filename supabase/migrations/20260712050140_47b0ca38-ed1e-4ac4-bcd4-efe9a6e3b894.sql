
-- ===== Phase 2.3: Employee Passport & Digital Employment File =====

-- Enum for timeline event categories
DO $$ BEGIN
  CREATE TYPE public.passport_event_type AS ENUM (
    'joined','department_changed','manager_changed','team_changed',
    'promotion','transfer','award','training_completed','skill_verified',
    'certification_earned','warning_issued','suspension','leave',
    'resignation','exit','archive','document_uploaded','project_added','note'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.passport_doc_type AS ENUM (
    'offer_letter','appointment_letter','nda','government_document',
    'educational_document','promotion_letter','warning','transfer_letter',
    'exit_document','certificate','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.passport_skill_status AS ENUM ('proposed','verified','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper: current employee id for the auth user
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;

-- Helper: HR / founder office privilege
CREATE OR REPLACE FUNCTION public.can_manage_passports(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_admin_permission(_uid, 'people_ops.employees.manage')
      OR public.is_admin_department_member(_uid, 'founder_office')
      OR public.is_admin_department_member(_uid, 'people_ops');
$$;
GRANT EXECUTE ON FUNCTION public.can_manage_passports(uuid) TO authenticated;

-- ============ EMPLOYEE PASSPORTS ============
CREATE TABLE public.employee_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE RESTRICT,
  passport_number TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  office_location TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.employee_passports TO authenticated;
GRANT ALL ON public.employee_passports TO service_role;
ALTER TABLE public.employee_passports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passport_select" ON public.employee_passports FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "passport_insert" ON public.employee_passports FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));
-- Update allowed only on mutable fields (photo, emergency contact, office location, metadata)
CREATE POLICY "passport_update" ON public.employee_passports FOR UPDATE TO authenticated
  USING (public.can_manage_passports(auth.uid()) OR employee_id = public.current_employee_id())
  WITH CHECK (public.can_manage_passports(auth.uid()) OR employee_id = public.current_employee_id());

-- Prevent changing immutable fields + block deletes
CREATE OR REPLACE FUNCTION public.passport_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Employee passports cannot be deleted';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.passport_number <> OLD.passport_number THEN
      RAISE EXCEPTION 'Passport number is immutable';
    END IF;
    IF NEW.employee_id <> OLD.employee_id THEN
      RAISE EXCEPTION 'Passport employee is immutable';
    END IF;
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_passport_guard BEFORE UPDATE OR DELETE ON public.employee_passports
  FOR EACH ROW EXECUTE FUNCTION public.passport_guard();

-- ============ TIMELINE ============
CREATE TABLE public.passport_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  event_type public.passport_event_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX passport_timeline_employee_idx ON public.passport_timeline(employee_id, occurred_at DESC);
GRANT SELECT, INSERT ON public.passport_timeline TO authenticated;
GRANT ALL ON public.passport_timeline TO service_role;
ALTER TABLE public.passport_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_select" ON public.passport_timeline FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "timeline_insert" ON public.passport_timeline FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));

CREATE OR REPLACE FUNCTION public.timeline_no_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Timeline records are immutable';
END $$;
CREATE TRIGGER trg_timeline_no_mutation BEFORE UPDATE OR DELETE ON public.passport_timeline
  FOR EACH ROW EXECUTE FUNCTION public.timeline_no_mutation();

-- Convenience append helper
CREATE OR REPLACE FUNCTION public.passport_log_event(
  _employee_id uuid, _event public.passport_event_type,
  _title text, _description text DEFAULT NULL, _payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.passport_timeline(employee_id, event_type, title, description, payload, actor_user_id)
  VALUES (_employee_id, _event, _title, _description, COALESCE(_payload,'{}'::jsonb), auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.passport_log_event(uuid, public.passport_event_type, text, text, jsonb) TO authenticated, service_role;

-- ============ DEPARTMENT HISTORY ============
CREATE TABLE public.passport_department_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  department_slug TEXT,
  date_joined DATE NOT NULL,
  date_left DATE,
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  audit_reference UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX passport_dept_hist_emp_idx ON public.passport_department_history(employee_id, date_joined DESC);
GRANT SELECT, INSERT ON public.passport_department_history TO authenticated;
GRANT ALL ON public.passport_department_history TO service_role;
ALTER TABLE public.passport_department_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dept_hist_select" ON public.passport_department_history FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "dept_hist_insert" ON public.passport_department_history FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));

-- ============ TEAM HISTORY ============
CREATE TABLE public.passport_team_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  team_name TEXT NOT NULL,
  role_in_team TEXT,
  reporting_manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  date_joined DATE NOT NULL,
  date_left DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX passport_team_hist_emp_idx ON public.passport_team_history(employee_id, date_joined DESC);
GRANT SELECT, INSERT ON public.passport_team_history TO authenticated;
GRANT ALL ON public.passport_team_history TO service_role;
ALTER TABLE public.passport_team_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_hist_select" ON public.passport_team_history FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "team_hist_insert" ON public.passport_team_history FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));

-- ============ PROMOTION HISTORY ============
CREATE TABLE public.passport_promotion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  old_level TEXT,
  new_level TEXT NOT NULL,
  old_role_id UUID REFERENCES public.admin_roles(id) ON DELETE SET NULL,
  new_role_id UUID REFERENCES public.admin_roles(id) ON DELETE SET NULL,
  promotion_date DATE NOT NULL,
  recommendation TEXT,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  supporting_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX passport_prom_emp_idx ON public.passport_promotion_history(employee_id, promotion_date DESC);
GRANT SELECT, INSERT ON public.passport_promotion_history TO authenticated;
GRANT ALL ON public.passport_promotion_history TO service_role;
ALTER TABLE public.passport_promotion_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prom_hist_select" ON public.passport_promotion_history FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "prom_hist_insert" ON public.passport_promotion_history FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));

-- ============ SKILLS ============
CREATE TABLE public.passport_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  skill_name TEXT NOT NULL,
  skill_level TEXT,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  status public.passport_skill_status NOT NULL DEFAULT 'proposed',
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX passport_skills_emp_idx ON public.passport_skills(employee_id);
GRANT SELECT, INSERT, UPDATE ON public.passport_skills TO authenticated;
GRANT ALL ON public.passport_skills TO service_role;
ALTER TABLE public.passport_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills_select" ON public.passport_skills FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "skills_insert" ON public.passport_skills FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = public.current_employee_id()
    OR public.can_manage_passports(auth.uid())
  );
-- Only department members with manage permission or founder office can flip to verified
CREATE POLICY "skills_verify" ON public.passport_skills FOR UPDATE TO authenticated
  USING (public.can_manage_passports(auth.uid()))
  WITH CHECK (public.can_manage_passports(auth.uid()));

-- ============ CERTIFICATIONS ============
CREATE TABLE public.passport_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  certification_name TEXT NOT NULL,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX passport_cert_emp_idx ON public.passport_certifications(employee_id);
GRANT SELECT, INSERT, UPDATE ON public.passport_certifications TO authenticated;
GRANT ALL ON public.passport_certifications TO service_role;
ALTER TABLE public.passport_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_select" ON public.passport_certifications FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "cert_write" ON public.passport_certifications FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));
CREATE POLICY "cert_update" ON public.passport_certifications FOR UPDATE TO authenticated
  USING (public.can_manage_passports(auth.uid())) WITH CHECK (public.can_manage_passports(auth.uid()));

-- ============ AWARDS ============
CREATE TABLE public.passport_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  award_name TEXT NOT NULL,
  category TEXT,
  award_date DATE NOT NULL,
  awarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX passport_award_emp_idx ON public.passport_awards(employee_id);
GRANT SELECT, INSERT ON public.passport_awards TO authenticated;
GRANT ALL ON public.passport_awards TO service_role;
ALTER TABLE public.passport_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "award_select" ON public.passport_awards FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "award_insert" ON public.passport_awards FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));

-- ============ PROJECTS ============
CREATE TABLE public.passport_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  project_name TEXT NOT NULL,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  role_in_project TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX passport_proj_emp_idx ON public.passport_projects(employee_id);
GRANT SELECT, INSERT, UPDATE ON public.passport_projects TO authenticated;
GRANT ALL ON public.passport_projects TO service_role;
ALTER TABLE public.passport_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proj_select" ON public.passport_projects FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "proj_insert" ON public.passport_projects FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));
CREATE POLICY "proj_update" ON public.passport_projects FOR UPDATE TO authenticated
  USING (public.can_manage_passports(auth.uid())) WITH CHECK (public.can_manage_passports(auth.uid()));

-- ============ TRAINING ============
CREATE TABLE public.passport_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  course_name TEXT NOT NULL,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  trainer TEXT,
  completion_date DATE,
  result TEXT,
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX passport_train_emp_idx ON public.passport_training(employee_id);
GRANT SELECT, INSERT ON public.passport_training TO authenticated;
GRANT ALL ON public.passport_training TO service_role;
ALTER TABLE public.passport_training ENABLE ROW LEVEL SECURITY;
CREATE POLICY "train_select" ON public.passport_training FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "train_insert" ON public.passport_training FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));

-- ============ DOCUMENTS ============
CREATE TABLE public.passport_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  doc_type public.passport_doc_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  storage_bucket TEXT NOT NULL DEFAULT 'platform-documents',
  storage_path TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  supersedes_id UUID REFERENCES public.passport_documents(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  access_scope TEXT NOT NULL DEFAULT 'restricted',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX passport_doc_emp_idx ON public.passport_documents(employee_id, doc_type);
GRANT SELECT, INSERT ON public.passport_documents TO authenticated;
GRANT ALL ON public.passport_documents TO service_role;
ALTER TABLE public.passport_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_select" ON public.passport_documents FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "doc_insert" ON public.passport_documents FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));

-- Prevent doc/history mutation
CREATE OR REPLACE FUNCTION public.immutable_history_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Historical records cannot be modified or deleted';
END $$;
CREATE TRIGGER trg_dept_hist_immut BEFORE UPDATE OR DELETE ON public.passport_department_history FOR EACH ROW EXECUTE FUNCTION public.immutable_history_guard();
CREATE TRIGGER trg_team_hist_immut BEFORE UPDATE OR DELETE ON public.passport_team_history FOR EACH ROW EXECUTE FUNCTION public.immutable_history_guard();
CREATE TRIGGER trg_prom_hist_immut BEFORE UPDATE OR DELETE ON public.passport_promotion_history FOR EACH ROW EXECUTE FUNCTION public.immutable_history_guard();
CREATE TRIGGER trg_award_immut BEFORE UPDATE OR DELETE ON public.passport_awards FOR EACH ROW EXECUTE FUNCTION public.immutable_history_guard();
CREATE TRIGGER trg_train_immut BEFORE UPDATE OR DELETE ON public.passport_training FOR EACH ROW EXECUTE FUNCTION public.immutable_history_guard();
CREATE TRIGGER trg_doc_immut BEFORE UPDATE OR DELETE ON public.passport_documents FOR EACH ROW EXECUTE FUNCTION public.immutable_history_guard();

-- ============ AUTO CREATE PASSPORT + JOIN EVENT ============
CREATE OR REPLACE FUNCTION public.ensure_employee_passport() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid text; _new_passport uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.employee_passports WHERE employee_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  _pid := 'AXP-' || to_char(now(),'YYYY') || '-' || lpad((floor(random()*100000))::text,5,'0') || '-' || substr(NEW.id::text,1,4);
  INSERT INTO public.employee_passports(employee_id, passport_number, photo_url)
  VALUES (NEW.id, _pid, NEW.photo_url)
  RETURNING id INTO _new_passport;

  INSERT INTO public.passport_timeline(employee_id, event_type, title, description, payload, actor_user_id)
  VALUES (NEW.id, 'joined', 'Joined Aurelix', 'Employee record created', jsonb_build_object('employee_number', NEW.employee_number), auth.uid());

  IF NEW.department_id IS NOT NULL THEN
    INSERT INTO public.passport_department_history(employee_id, department_id, date_joined, reason)
    VALUES (NEW.id, NEW.department_id, COALESCE(NEW.joining_date, CURRENT_DATE), 'Initial assignment');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ensure_passport AFTER INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.ensure_employee_passport();

-- Auto timeline on department / manager / status change
CREATE OR REPLACE FUNCTION public.employee_change_timeline() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    INSERT INTO public.passport_timeline(employee_id, event_type, title, description, payload, actor_user_id)
    VALUES (NEW.id, 'department_changed', 'Department changed', NULL,
      jsonb_build_object('from', OLD.department_id, 'to', NEW.department_id), auth.uid());

    UPDATE public.passport_department_history
      SET date_left = CURRENT_DATE
      WHERE employee_id = NEW.id AND date_left IS NULL;
    INSERT INTO public.passport_department_history(employee_id, department_id, date_joined, reason)
      VALUES (NEW.id, NEW.department_id, CURRENT_DATE, 'Transfer');
  END IF;

  IF NEW.reporting_manager_id IS DISTINCT FROM OLD.reporting_manager_id THEN
    INSERT INTO public.passport_timeline(employee_id, event_type, title, description, payload, actor_user_id)
    VALUES (NEW.id, 'manager_changed', 'Reporting manager changed', NULL,
      jsonb_build_object('from', OLD.reporting_manager_id, 'to', NEW.reporting_manager_id), auth.uid());
  END IF;

  IF NEW.employment_status IS DISTINCT FROM OLD.employment_status THEN
    INSERT INTO public.passport_timeline(employee_id, event_type, title, description, payload, actor_user_id)
    VALUES (NEW.id,
      CASE NEW.employment_status
        WHEN 'suspended' THEN 'suspension'::public.passport_event_type
        WHEN 'on_leave' THEN 'leave'::public.passport_event_type
        WHEN 'resigned' THEN 'resignation'::public.passport_event_type
        WHEN 'exited' THEN 'exit'::public.passport_event_type
        WHEN 'archived' THEN 'archive'::public.passport_event_type
        ELSE 'note'::public.passport_event_type
      END,
      'Employment status: ' || NEW.employment_status::text, NULL,
      jsonb_build_object('from', OLD.employment_status, 'to', NEW.employment_status), auth.uid());
  END IF;

  IF NEW.level IS DISTINCT FROM OLD.level AND NEW.level IS NOT NULL THEN
    INSERT INTO public.passport_promotion_history(employee_id, old_level, new_level, old_role_id, new_role_id, promotion_date, approver_id, reason)
      VALUES (NEW.id, OLD.level, NEW.level, OLD.role_id, NEW.role_id, CURRENT_DATE, auth.uid(), 'Level change');
    INSERT INTO public.passport_timeline(employee_id, event_type, title, description, payload, actor_user_id)
      VALUES (NEW.id, 'promotion', 'Promoted to ' || NEW.level, NULL,
        jsonb_build_object('old_level', OLD.level, 'new_level', NEW.level), auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_employee_change_timeline AFTER UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.employee_change_timeline();

-- Skill verification writes timeline
CREATE OR REPLACE FUNCTION public.skill_verify_timeline() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'verified' AND (OLD.status IS DISTINCT FROM 'verified') THEN
    NEW.verified_at := now();
    NEW.verified_by := auth.uid();
    INSERT INTO public.passport_timeline(employee_id, event_type, title, description, payload, actor_user_id)
      VALUES (NEW.employee_id, 'skill_verified', 'Skill verified: ' || NEW.skill_name, NULL,
        jsonb_build_object('skill', NEW.skill_name, 'level', NEW.skill_level), auth.uid());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_skill_verify BEFORE UPDATE ON public.passport_skills
  FOR EACH ROW EXECUTE FUNCTION public.skill_verify_timeline();

-- Backfill passports for existing employees
INSERT INTO public.employee_passports(employee_id, passport_number, photo_url)
SELECT e.id,
       'AXP-' || to_char(e.created_at,'YYYY') || '-' || lpad((floor(random()*100000))::int::text,5,'0') || '-' || substr(e.id::text,1,4),
       e.photo_url
FROM public.employees e
WHERE NOT EXISTS (SELECT 1 FROM public.employee_passports p WHERE p.employee_id = e.id);

INSERT INTO public.passport_timeline(employee_id, event_type, title, description, payload)
SELECT e.id, 'joined', 'Joined Aurelix', 'Backfilled from existing record',
       jsonb_build_object('employee_number', e.employee_number)
FROM public.employees e
WHERE NOT EXISTS (
  SELECT 1 FROM public.passport_timeline t WHERE t.employee_id = e.id AND t.event_type = 'joined'
);
