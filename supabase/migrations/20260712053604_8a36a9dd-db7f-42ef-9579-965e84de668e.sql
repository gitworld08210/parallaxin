
-- ============================================================
-- Phase 2.7 — Learning, Skills & Certification Platform
-- ============================================================

DO $$ BEGIN CREATE TYPE public.course_difficulty AS ENUM ('beginner','intermediate','advanced','expert'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.course_status AS ENUM ('draft','published','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.course_category AS ENUM ('department','policy','technical','leadership','security','compliance','ai','onboarding'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.enrollment_status AS ENUM ('assigned','in_progress','completed','overdue','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.skill_verify_status AS ENUM ('pending','assessing','dept_head_review','verified','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cert_category AS ENUM ('technical','leadership','compliance','security','department','process'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cert_status AS ENUM ('active','expired','revoked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.roadmap_requirement_type AS ENUM ('course','skill','certification'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Learning Catalog
-- ============================================================
CREATE TABLE public.learning_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  category public.course_category NOT NULL DEFAULT 'department',
  difficulty public.course_difficulty NOT NULL DEFAULT 'beginner',
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes >= 0),
  prerequisites TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status public.course_status NOT NULL DEFAULT 'draft',
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.learning_courses TO authenticated;
GRANT ALL ON public.learning_courses TO service_role;
ALTER TABLE public.learning_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lc_view" ON public.learning_courses FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "lc_ins" ON public.learning_courses FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'));
CREATE POLICY "lc_upd" ON public.learning_courses FOR UPDATE TO authenticated USING (public.has_admin_permission(auth.uid(),'people_ops.learning.manage')) WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'));
CREATE TRIGGER trg_lc_updated BEFORE UPDATE ON public.learning_courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  target_role TEXT,
  status public.course_status NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.learning_paths TO authenticated;
GRANT ALL ON public.learning_paths TO service_role;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_view" ON public.learning_paths FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "lp_ins" ON public.learning_paths FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'));
CREATE POLICY "lp_upd" ON public.learning_paths FOR UPDATE TO authenticated USING (public.has_admin_permission(auth.uid(),'people_ops.learning.manage')) WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'));
CREATE TRIGGER trg_lp_updated BEFORE UPDATE ON public.learning_paths FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.learning_path_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (path_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_path_courses TO authenticated;
GRANT ALL ON public.learning_path_courses TO service_role;
ALTER TABLE public.learning_path_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lpc_view" ON public.learning_path_courses FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "lpc_manage" ON public.learning_path_courses FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'));

-- ============================================================
-- Enrollments
-- ============================================================
CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status public.enrollment_status NOT NULL DEFAULT 'assigned',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, employee_id)
);
CREATE INDEX idx_enroll_employee ON public.course_enrollments(employee_id);
CREATE INDEX idx_enroll_course ON public.course_enrollments(course_id);
GRANT SELECT, INSERT, UPDATE ON public.course_enrollments TO authenticated;
GRANT ALL ON public.course_enrollments TO service_role;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "en_view" ON public.course_enrollments FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.enroll')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.manage')
);
CREATE POLICY "en_ins" ON public.course_enrollments FOR INSERT TO authenticated WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.learning.enroll')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.manage')
);
CREATE POLICY "en_upd" ON public.course_enrollments FOR UPDATE TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.enroll')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.manage')
) WITH CHECK (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.enroll')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.manage')
);
CREATE TRIGGER trg_en_updated BEFORE UPDATE ON public.course_enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Skills catalog + verification
-- ============================================================
CREATE TABLE public.skills_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, department_id)
);
GRANT SELECT, INSERT, UPDATE ON public.skills_catalog TO authenticated;
GRANT ALL ON public.skills_catalog TO service_role;
ALTER TABLE public.skills_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_view" ON public.skills_catalog FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "sc_ins" ON public.skills_catalog FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'));
CREATE POLICY "sc_upd" ON public.skills_catalog FOR UPDATE TO authenticated USING (public.has_admin_permission(auth.uid(),'people_ops.learning.manage')) WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'));
CREATE TRIGGER trg_sc_updated BEFORE UPDATE ON public.skills_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.skill_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills_catalog(id) ON DELETE CASCADE,
  requested_level TEXT NOT NULL DEFAULT 'intermediate',
  status public.skill_verify_status NOT NULL DEFAULT 'pending',
  assessor_id UUID,
  dept_head_id UUID,
  decided_at TIMESTAMPTZ,
  evidence TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sv_employee ON public.skill_verifications(employee_id);
CREATE INDEX idx_sv_skill ON public.skill_verifications(skill_id);
GRANT SELECT, INSERT, UPDATE ON public.skill_verifications TO authenticated;
GRANT ALL ON public.skill_verifications TO service_role;
ALTER TABLE public.skill_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sv_view" ON public.skill_verifications FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.verify_skill')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.manage')
);
-- Employees can submit their own; verifiers/managers can also submit
CREATE POLICY "sv_ins" ON public.skill_verifications FOR INSERT TO authenticated WITH CHECK (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.verify_skill')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.manage')
);
CREATE POLICY "sv_upd" ON public.skill_verifications FOR UPDATE TO authenticated USING (
  public.has_admin_permission(auth.uid(),'people_ops.learning.verify_skill')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.manage')
) WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.learning.verify_skill')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.manage')
);
CREATE TRIGGER trg_sv_updated BEFORE UPDATE ON public.skill_verifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Certifications
-- ============================================================
CREATE TABLE public.certifications_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category public.cert_category NOT NULL DEFAULT 'technical',
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  description TEXT,
  validity_months INTEGER,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.certifications_catalog TO authenticated;
GRANT ALL ON public.certifications_catalog TO service_role;
ALTER TABLE public.certifications_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_view" ON public.certifications_catalog FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "cc_ins" ON public.certifications_catalog FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'));
CREATE POLICY "cc_upd" ON public.certifications_catalog FOR UPDATE TO authenticated USING (public.has_admin_permission(auth.uid(),'people_ops.learning.manage')) WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'));
CREATE TRIGGER trg_cc_updated BEFORE UPDATE ON public.certifications_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.employee_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES public.certifications_catalog(id) ON DELETE CASCADE,
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at DATE,
  status public.cert_status NOT NULL DEFAULT 'active',
  issued_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ec_employee ON public.employee_certifications(employee_id);
GRANT SELECT, INSERT, UPDATE ON public.employee_certifications TO authenticated;
GRANT ALL ON public.employee_certifications TO service_role;
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec_view" ON public.employee_certifications FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.verify_skill')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.manage')
);
CREATE POLICY "ec_ins" ON public.employee_certifications FOR INSERT TO authenticated WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.learning.verify_skill')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.manage')
);
CREATE POLICY "ec_upd" ON public.employee_certifications FOR UPDATE TO authenticated USING (
  public.has_admin_permission(auth.uid(),'people_ops.learning.verify_skill')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.manage')
) WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.learning.verify_skill')
  OR public.has_admin_permission(auth.uid(),'people_ops.learning.manage')
);
CREATE TRIGGER trg_ec_updated BEFORE UPDATE ON public.employee_certifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Career roadmaps
-- ============================================================
CREATE TABLE public.career_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  target_level TEXT NOT NULL,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.career_roadmaps TO authenticated;
GRANT ALL ON public.career_roadmaps TO service_role;
ALTER TABLE public.career_roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr_view" ON public.career_roadmaps FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "cr_ins" ON public.career_roadmaps FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'));
CREATE POLICY "cr_upd" ON public.career_roadmaps FOR UPDATE TO authenticated USING (public.has_admin_permission(auth.uid(),'people_ops.learning.manage')) WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'));
CREATE TRIGGER trg_cr_updated BEFORE UPDATE ON public.career_roadmaps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.career_roadmap_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES public.career_roadmaps(id) ON DELETE CASCADE,
  requirement_type public.roadmap_requirement_type NOT NULL,
  course_id UUID REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills_catalog(id) ON DELETE CASCADE,
  certification_id UUID REFERENCES public.certifications_catalog(id) ON DELETE CASCADE,
  notes TEXT,
  sequence INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (requirement_type = 'course' AND course_id IS NOT NULL AND skill_id IS NULL AND certification_id IS NULL) OR
    (requirement_type = 'skill' AND skill_id IS NOT NULL AND course_id IS NULL AND certification_id IS NULL) OR
    (requirement_type = 'certification' AND certification_id IS NOT NULL AND course_id IS NULL AND skill_id IS NULL)
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_roadmap_requirements TO authenticated;
GRANT ALL ON public.career_roadmap_requirements TO service_role;
ALTER TABLE public.career_roadmap_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crr_view" ON public.career_roadmap_requirements FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "crr_manage" ON public.career_roadmap_requirements FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.learning.manage'));

-- ============================================================
-- Permission registry
-- ============================================================
INSERT INTO public.admin_permissions (permission_key, name, description, module) VALUES
  ('people_ops.learning.view',         'View learning',      'View catalog, enrollments, certifications, skill verifications', 'people_ops'),
  ('people_ops.learning.manage',       'Manage learning',    'Create courses, paths, skills catalog, certifications, roadmaps', 'people_ops'),
  ('people_ops.learning.enroll',       'Enroll in learning', 'Assign courses to employees and mark completion',                'people_ops'),
  ('people_ops.learning.verify_skill', 'Verify skills',      'Approve skill verifications and issue employee certifications',  'people_ops')
ON CONFLICT (permission_key) DO NOTHING;
