
-- ============================================================
-- Phase 2.6 — Performance Management System
-- ============================================================

DO $$ BEGIN CREATE TYPE public.perf_cycle_period AS ENUM ('monthly','quarterly','half_yearly','annual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.perf_cycle_status AS ENUM ('draft','active','in_review','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.perf_goal_priority AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.perf_goal_status AS ENUM ('not_started','in_progress','at_risk','completed','missed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.perf_review_stage AS ENUM ('self','team_lead','department_head','hr','finalized'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.perf_reviewer_role AS ENUM ('self','team_lead','department_head','hr'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.recognition_type AS ENUM ('award','achievement','outstanding','innovation','leadership','special'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.pip_status AS ENUM ('draft','active','on_track','off_track','completed','failed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.promotion_readiness_level AS ENUM ('not_ready','emerging','developing','ready_soon','ready_now'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- performance_cycles
CREATE TABLE public.performance_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  period_type public.perf_cycle_period NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status public.perf_cycle_status NOT NULL DEFAULT 'draft',
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  created_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
GRANT SELECT, INSERT, UPDATE ON public.performance_cycles TO authenticated;
GRANT ALL ON public.performance_cycles TO service_role;
ALTER TABLE public.performance_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_view" ON public.performance_cycles FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "pc_ins" ON public.performance_cycles FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.performance.manage'));
CREATE POLICY "pc_upd" ON public.performance_cycles FOR UPDATE TO authenticated USING (public.has_admin_permission(auth.uid(),'people_ops.performance.manage')) WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.performance.manage'));
CREATE TRIGGER trg_perf_cycles_updated BEFORE UPDATE ON public.performance_cycles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- performance_kpis
CREATE TABLE public.performance_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.admin_departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  target_value NUMERIC,
  weightage INTEGER NOT NULL DEFAULT 10 CHECK (weightage BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.performance_kpis TO authenticated;
GRANT ALL ON public.performance_kpis TO service_role;
ALTER TABLE public.performance_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kpi_view" ON public.performance_kpis FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "kpi_ins" ON public.performance_kpis FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.performance.manage'));
CREATE POLICY "kpi_upd" ON public.performance_kpis FOR UPDATE TO authenticated USING (public.has_admin_permission(auth.uid(),'people_ops.performance.manage')) WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.performance.manage'));
CREATE TRIGGER trg_perf_kpis_updated BEFORE UPDATE ON public.performance_kpis FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- performance_goals
CREATE TABLE public.performance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.performance_cycles(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  kpi_id UUID REFERENCES public.performance_kpis(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority public.perf_goal_priority NOT NULL DEFAULT 'medium',
  weightage INTEGER NOT NULL DEFAULT 10 CHECK (weightage BETWEEN 0 AND 100),
  is_team_goal BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  status public.perf_goal_status NOT NULL DEFAULT 'not_started',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  assigned_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_perf_goals_employee ON public.performance_goals(employee_id);
CREATE INDEX idx_perf_goals_cycle ON public.performance_goals(cycle_id);
GRANT SELECT, INSERT, UPDATE ON public.performance_goals TO authenticated;
GRANT ALL ON public.performance_goals TO service_role;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goal_view" ON public.performance_goals FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.review')
);
CREATE POLICY "goal_ins" ON public.performance_goals FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.performance.manage'));
CREATE POLICY "goal_upd" ON public.performance_goals FOR UPDATE TO authenticated USING (
  public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
  OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
) WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
  OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);
CREATE TRIGGER trg_perf_goals_updated BEFORE UPDATE ON public.performance_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- performance_reviews
CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.performance_cycles(id) ON DELETE CASCADE,
  current_stage public.perf_review_stage NOT NULL DEFAULT 'self',
  overall_rating NUMERIC(3,1),
  finalized BOOLEAN NOT NULL DEFAULT false,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, cycle_id)
);
CREATE INDEX idx_perf_reviews_cycle ON public.performance_reviews(cycle_id);
GRANT SELECT, INSERT, UPDATE ON public.performance_reviews TO authenticated;
GRANT ALL ON public.performance_reviews TO service_role;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prv_view" ON public.performance_reviews FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.review')
);
CREATE POLICY "prv_ins" ON public.performance_reviews FOR INSERT TO authenticated WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.review')
  OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);
CREATE POLICY "prv_upd" ON public.performance_reviews FOR UPDATE TO authenticated USING (
  public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.review')
) WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.review')
);
CREATE TRIGGER trg_perf_reviews_updated BEFORE UPDATE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- performance_ratings
CREATE TABLE public.performance_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  reviewer_role public.perf_reviewer_role NOT NULL,
  reviewer_id UUID,
  overall_rating NUMERIC(3,1) NOT NULL CHECK (overall_rating BETWEEN 0 AND 5),
  category_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  strengths TEXT,
  weaknesses TEXT,
  improvement_suggestions TEXT,
  comments TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, reviewer_role)
);
GRANT SELECT, INSERT, UPDATE ON public.performance_ratings TO authenticated;
GRANT ALL ON public.performance_ratings TO service_role;
ALTER TABLE public.performance_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prt_view" ON public.performance_ratings FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.performance_reviews r
    WHERE r.id = review_id AND (
      r.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      OR public.has_admin_permission(auth.uid(),'people_ops.performance.view')
      OR public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
      OR public.has_admin_permission(auth.uid(),'people_ops.performance.review')
    )
  )
);
CREATE POLICY "prt_ins" ON public.performance_ratings FOR INSERT TO authenticated WITH CHECK (
  (reviewer_role = 'self' AND EXISTS (
    SELECT 1 FROM public.performance_reviews r
    JOIN public.employees e ON e.id = r.employee_id
    WHERE r.id = review_id AND e.user_id = auth.uid()
  ))
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.review')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
);
CREATE POLICY "prt_upd" ON public.performance_ratings FOR UPDATE TO authenticated USING (
  (reviewer_role = 'self' AND EXISTS (
    SELECT 1 FROM public.performance_reviews r
    JOIN public.employees e ON e.id = r.employee_id
    WHERE r.id = review_id AND e.user_id = auth.uid()
  ))
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.review')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
) WITH CHECK (
  (reviewer_role = 'self' AND EXISTS (
    SELECT 1 FROM public.performance_reviews r
    JOIN public.employees e ON e.id = r.employee_id
    WHERE r.id = review_id AND e.user_id = auth.uid()
  ))
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.review')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
);
CREATE TRIGGER trg_perf_ratings_updated BEFORE UPDATE ON public.performance_ratings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- recognitions
CREATE TABLE public.recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.performance_cycles(id) ON DELETE SET NULL,
  type public.recognition_type NOT NULL DEFAULT 'achievement',
  title TEXT NOT NULL,
  description TEXT,
  awarded_by UUID,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recognitions_employee ON public.recognitions(employee_id);
GRANT SELECT, INSERT, UPDATE ON public.recognitions TO authenticated;
GRANT ALL ON public.recognitions TO service_role;
ALTER TABLE public.recognitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_view" ON public.recognitions FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "rec_ins" ON public.recognitions FOR INSERT TO authenticated WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.recognition.grant')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
);
CREATE POLICY "rec_upd" ON public.recognitions FOR UPDATE TO authenticated USING (
  public.has_admin_permission(auth.uid(),'people_ops.recognition.grant')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
) WITH CHECK (
  public.has_admin_permission(auth.uid(),'people_ops.recognition.grant')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
);
CREATE TRIGGER trg_recognitions_updated BEFORE UPDATE ON public.recognitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- improvement_plans
CREATE TABLE public.improvement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  objectives TEXT NOT NULL,
  timeline_start DATE NOT NULL,
  timeline_end DATE NOT NULL,
  review_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status public.pip_status NOT NULL DEFAULT 'draft',
  final_outcome TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (timeline_end >= timeline_start)
);
CREATE INDEX idx_pip_employee ON public.improvement_plans(employee_id);
GRANT SELECT, INSERT, UPDATE ON public.improvement_plans TO authenticated;
GRANT ALL ON public.improvement_plans TO service_role;
ALTER TABLE public.improvement_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pip_view" ON public.improvement_plans FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR coach_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
);
CREATE POLICY "pip_ins" ON public.improvement_plans FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.performance.manage'));
CREATE POLICY "pip_upd" ON public.improvement_plans FOR UPDATE TO authenticated USING (public.has_admin_permission(auth.uid(),'people_ops.performance.manage')) WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.performance.manage'));
CREATE TRIGGER trg_pip_updated BEFORE UPDATE ON public.improvement_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- career_progress
CREATE TABLE public.career_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  current_level TEXT,
  target_level TEXT,
  required_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  training_needed TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  experience_required_months INTEGER NOT NULL DEFAULT 0 CHECK (experience_required_months >= 0),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.career_progress TO authenticated;
GRANT ALL ON public.career_progress TO service_role;
ALTER TABLE public.career_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_view" ON public.career_progress FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
);
CREATE POLICY "cp_ins" ON public.career_progress FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.performance.manage'));
CREATE POLICY "cp_upd" ON public.career_progress FOR UPDATE TO authenticated USING (public.has_admin_permission(auth.uid(),'people_ops.performance.manage')) WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.performance.manage'));
CREATE TRIGGER trg_career_progress_updated BEFORE UPDATE ON public.career_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- promotion_readiness_snapshots
CREATE TABLE public.promotion_readiness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  performance_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  skills_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  training_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  audit_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  department_recommendation BOOLEAN NOT NULL DEFAULT false,
  readiness_level public.promotion_readiness_level NOT NULL DEFAULT 'not_ready',
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  notes TEXT,
  computed_by UUID,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prs_employee ON public.promotion_readiness_snapshots(employee_id);
GRANT SELECT, INSERT, UPDATE ON public.promotion_readiness_snapshots TO authenticated;
GRANT ALL ON public.promotion_readiness_snapshots TO service_role;
ALTER TABLE public.promotion_readiness_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prs_view" ON public.promotion_readiness_snapshots FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.performance.manage')
);
CREATE POLICY "prs_ins" ON public.promotion_readiness_snapshots FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.performance.manage'));
CREATE POLICY "prs_upd" ON public.promotion_readiness_snapshots FOR UPDATE TO authenticated USING (public.has_admin_permission(auth.uid(),'people_ops.performance.manage')) WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.performance.manage'));
CREATE TRIGGER trg_prs_updated BEFORE UPDATE ON public.promotion_readiness_snapshots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Permission registry
INSERT INTO public.admin_permissions (permission_key, name, description, module) VALUES
  ('people_ops.performance.view',   'View performance',   'View performance cycles, goals, reviews across employees', 'people_ops'),
  ('people_ops.performance.manage', 'Manage performance', 'Create cycles, KPIs, goals, PIP, career records, finalize reviews', 'people_ops'),
  ('people_ops.performance.review', 'Submit reviews',     'Submit team-lead, department-head, HR performance ratings', 'people_ops'),
  ('people_ops.recognition.grant',  'Grant recognition',  'Create awards, achievements, and outstanding-performance entries', 'people_ops')
ON CONFLICT (permission_key) DO NOTHING;
