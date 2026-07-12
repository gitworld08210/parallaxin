
-- Enums
DO $$ BEGIN
  CREATE TYPE public.open_position_status AS ENUM
    ('draft','pending_approval','approved','filled','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.open_position_priority AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.succession_scope AS ENUM
    ('department_head','deputy_head','team_lead','specialist');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.succession_readiness AS ENUM
    ('not_ready','dev_1y','dev_6m','ready_now');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- department_capacity
CREATE TABLE public.department_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL UNIQUE
    REFERENCES public.admin_departments(id) ON DELETE CASCADE,
  max_capacity INTEGER NOT NULL DEFAULT 0 CHECK (max_capacity >= 0),
  target_capacity INTEGER NOT NULL DEFAULT 0 CHECK (target_capacity >= 0),
  workload_score INTEGER NOT NULL DEFAULT 50 CHECK (workload_score BETWEEN 0 AND 100),
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_capacity TO authenticated;
GRANT ALL ON public.department_capacity TO service_role;
ALTER TABLE public.department_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dc_view" ON public.department_capacity FOR SELECT TO authenticated
  USING (public.is_active_employee(auth.uid()));
CREATE POLICY "dc_manage" ON public.department_capacity FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'people_ops.capacity.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'people_ops.capacity.manage'));
CREATE TRIGGER trg_department_capacity_updated
  BEFORE UPDATE ON public.department_capacity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- open_positions
CREATE TABLE public.open_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.admin_departments(id) ON DELETE RESTRICT,
  role_id UUID REFERENCES public.admin_roles(id) ON DELETE SET NULL,
  level TEXT,
  title TEXT NOT NULL,
  reason TEXT,
  priority public.open_position_priority NOT NULL DEFAULT 'medium',
  status public.open_position_status NOT NULL DEFAULT 'draft',
  requested_by UUID,
  approved_by UUID,
  expected_joining DATE,
  filled_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_open_positions_dept ON public.open_positions(department_id);
CREATE INDEX idx_open_positions_status ON public.open_positions(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.open_positions TO authenticated;
GRANT ALL ON public.open_positions TO service_role;
ALTER TABLE public.open_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op_view" ON public.open_positions FOR SELECT TO authenticated
  USING (public.is_active_employee(auth.uid()));
CREATE POLICY "op_manage" ON public.open_positions FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'people_ops.positions.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'people_ops.positions.manage'));
CREATE TRIGGER trg_open_positions_updated
  BEFORE UPDATE ON public.open_positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- succession_plans
CREATE TABLE public.succession_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.succession_scope NOT NULL,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE CASCADE,
  incumbent_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  primary_successor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  secondary_successor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  readiness_level public.succession_readiness NOT NULL DEFAULT 'not_ready',
  training_progress INTEGER NOT NULL DEFAULT 0 CHECK (training_progress BETWEEN 0 AND 100),
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (incumbent_employee_id, scope)
);
CREATE INDEX idx_succession_dept ON public.succession_plans(department_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.succession_plans TO authenticated;
GRANT ALL ON public.succession_plans TO service_role;
ALTER TABLE public.succession_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_view" ON public.succession_plans FOR SELECT TO authenticated
  USING (public.is_active_employee(auth.uid()));
CREATE POLICY "sp_manage" ON public.succession_plans FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'people_ops.succession.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'people_ops.succession.manage'));
CREATE TRIGGER trg_succession_plans_updated
  BEFORE UPDATE ON public.succession_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- workforce_forecasts
CREATE TABLE public.workforce_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.admin_departments(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  planned_headcount INTEGER NOT NULL DEFAULT 0 CHECK (planned_headcount >= 0),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);
CREATE INDEX idx_workforce_forecasts_dept ON public.workforce_forecasts(department_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workforce_forecasts TO authenticated;
GRANT ALL ON public.workforce_forecasts TO service_role;
ALTER TABLE public.workforce_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wf_view" ON public.workforce_forecasts FOR SELECT TO authenticated
  USING (public.is_active_employee(auth.uid()));
CREATE POLICY "wf_manage" ON public.workforce_forecasts FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'people_ops.org.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'people_ops.org.manage'));
CREATE TRIGGER trg_workforce_forecasts_updated
  BEFORE UPDATE ON public.workforce_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Register new permissions
INSERT INTO public.admin_permissions (permission_key, module, name, description) VALUES
  ('people_ops.org.view',          'people_ops', 'Organization View',      'View organization structure and planning'),
  ('people_ops.org.manage',        'people_ops', 'Organization Manage',    'Manage organization planning + forecasts'),
  ('people_ops.capacity.manage',   'people_ops', 'Capacity Manage',        'Edit department capacity'),
  ('people_ops.positions.manage',  'people_ops', 'Positions Manage',       'Manage open positions / hiring requests'),
  ('people_ops.succession.manage', 'people_ops', 'Succession Manage',      'Manage succession plans')
ON CONFLICT (permission_key) DO NOTHING;

-- Grant management perms to roles that already have people_ops.employees.manage
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, np.id
FROM public.admin_role_permissions rp
JOIN public.admin_permissions ep ON ep.id = rp.permission_id
  AND ep.permission_key = 'people_ops.employees.manage'
CROSS JOIN LATERAL (
  SELECT id FROM public.admin_permissions
  WHERE permission_key IN (
    'people_ops.org.view','people_ops.org.manage','people_ops.capacity.manage',
    'people_ops.positions.manage','people_ops.succession.manage'
  )
) np
ON CONFLICT DO NOTHING;

-- Grant view to roles with people_ops.employees.view
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, vp.id
FROM public.admin_role_permissions rp
JOIN public.admin_permissions ep ON ep.id = rp.permission_id
  AND ep.permission_key = 'people_ops.employees.view'
CROSS JOIN LATERAL (
  SELECT id FROM public.admin_permissions
  WHERE permission_key = 'people_ops.org.view'
) vp
ON CONFLICT DO NOTHING;
