
-- Phase 2.4 : Workforce movement engine
DO $$ BEGIN
  CREATE TYPE public.movement_kind AS ENUM (
    'department_transfer','team_transfer','manager_change','promotion','demotion',
    'temporary_assignment','cross_department_assignment','acting_assignment',
    'leave','suspension','reinstatement','resignation','exit','rejoin',
    'workload_transfer','knowledge_transfer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.movement_status AS ENUM (
    'draft','pending_approval','approved','rejected','applied','expired','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.approval_decision AS ENUM ('pending','approved','rejected','skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.leave_kind AS ENUM ('annual','medical','emergency','unpaid','sabbatical','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ MOVEMENTS ============
CREATE TABLE public.employee_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  kind public.movement_kind NOT NULL,
  status public.movement_status NOT NULL DEFAULT 'draft',
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  business_justification TEXT,
  effective_date DATE,
  end_date DATE,
  -- target state
  target_department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  target_role_id UUID REFERENCES public.admin_roles(id) ON DELETE SET NULL,
  target_level TEXT,
  target_manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  target_team_name TEXT,
  -- snapshot of source values captured at request time
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workflow_run_id UUID REFERENCES public.platform_workflow_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX emp_move_employee_idx ON public.employee_movements(employee_id, created_at DESC);
CREATE INDEX emp_move_status_idx ON public.employee_movements(status);
GRANT SELECT, INSERT, UPDATE ON public.employee_movements TO authenticated;
GRANT ALL ON public.employee_movements TO service_role;
ALTER TABLE public.employee_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "move_select" ON public.employee_movements FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR requested_by = auth.uid() OR public.can_manage_passports(auth.uid()));
-- Employees can only request self-service movements (leave, resignation); HR/Founder can create any
CREATE POLICY "move_insert" ON public.employee_movements FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_passports(auth.uid())
    OR (
      employee_id = public.current_employee_id()
      AND kind IN ('leave','resignation')
    )
  );
CREATE POLICY "move_update" ON public.employee_movements FOR UPDATE TO authenticated
  USING (
    (requested_by = auth.uid() AND status = 'draft')
    OR public.can_manage_passports(auth.uid())
  )
  WITH CHECK (
    (requested_by = auth.uid() AND status IN ('draft','cancelled'))
    OR public.can_manage_passports(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.movement_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'applied' AND NEW.status <> 'applied' THEN
    RAISE EXCEPTION 'Applied movements are immutable';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_movement_touch BEFORE UPDATE ON public.employee_movements
  FOR EACH ROW EXECUTE FUNCTION public.movement_touch();

-- ============ APPROVALS ============
CREATE TABLE public.movement_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES public.employee_movements(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  role_key TEXT NOT NULL,
  approver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision public.approval_decision NOT NULL DEFAULT 'pending',
  decided_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mov_appr_move_idx ON public.movement_approvals(movement_id, step_order);
GRANT SELECT, INSERT, UPDATE ON public.movement_approvals TO authenticated;
GRANT ALL ON public.movement_approvals TO service_role;
ALTER TABLE public.movement_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mov_appr_select" ON public.movement_approvals FOR SELECT TO authenticated
  USING (
    approver_user_id = auth.uid()
    OR public.can_manage_passports(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.employee_movements m
      WHERE m.id = movement_id
        AND (m.employee_id = public.current_employee_id() OR m.requested_by = auth.uid())
    )
  );
CREATE POLICY "mov_appr_insert" ON public.movement_approvals FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));
CREATE POLICY "mov_appr_update" ON public.movement_approvals FOR UPDATE TO authenticated
  USING (approver_user_id = auth.uid() OR public.can_manage_passports(auth.uid()))
  WITH CHECK (approver_user_id = auth.uid() OR public.can_manage_passports(auth.uid()));

-- ============ LEAVES ============
CREATE TABLE public.employee_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  movement_id UUID REFERENCES public.employee_movements(id) ON DELETE SET NULL,
  kind public.leave_kind NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  workload_covered_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  coverage_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX emp_leave_emp_idx ON public.employee_leaves(employee_id, start_date DESC);
GRANT SELECT, INSERT, UPDATE ON public.employee_leaves TO authenticated;
GRANT ALL ON public.employee_leaves TO service_role;
ALTER TABLE public.employee_leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_select" ON public.employee_leaves FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "leave_write" ON public.employee_leaves FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "leave_update" ON public.employee_leaves FOR UPDATE TO authenticated
  USING (public.can_manage_passports(auth.uid())) WITH CHECK (public.can_manage_passports(auth.uid()));

-- ============ SUSPENSIONS ============
CREATE TABLE public.employee_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  movement_id UUID REFERENCES public.employee_movements(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  investigation_reference TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX emp_susp_emp_idx ON public.employee_suspensions(employee_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.employee_suspensions TO authenticated;
GRANT ALL ON public.employee_suspensions TO service_role;
ALTER TABLE public.employee_suspensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "susp_select" ON public.employee_suspensions FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "susp_write" ON public.employee_suspensions FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));
CREATE POLICY "susp_update" ON public.employee_suspensions FOR UPDATE TO authenticated
  USING (public.can_manage_passports(auth.uid())) WITH CHECK (public.can_manage_passports(auth.uid()));

-- ============ KNOWLEDGE TRANSFER ============
CREATE TABLE public.knowledge_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID REFERENCES public.employee_movements(id) ON DELETE CASCADE,
  from_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  to_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kt_from_idx ON public.knowledge_transfers(from_employee_id);
GRANT SELECT, INSERT, UPDATE ON public.knowledge_transfers TO authenticated;
GRANT ALL ON public.knowledge_transfers TO service_role;
ALTER TABLE public.knowledge_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kt_select" ON public.knowledge_transfers FOR SELECT TO authenticated
  USING (
    from_employee_id = public.current_employee_id()
    OR to_employee_id = public.current_employee_id()
    OR public.can_manage_passports(auth.uid())
  );
CREATE POLICY "kt_write" ON public.knowledge_transfers FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));
CREATE POLICY "kt_update" ON public.knowledge_transfers FOR UPDATE TO authenticated
  USING (
    from_employee_id = public.current_employee_id()
    OR to_employee_id = public.current_employee_id()
    OR public.can_manage_passports(auth.uid())
  )
  WITH CHECK (
    from_employee_id = public.current_employee_id()
    OR to_employee_id = public.current_employee_id()
    OR public.can_manage_passports(auth.uid())
  );

-- ============ TEMPORARY / ACTING ASSIGNMENTS ============
CREATE TABLE public.temporary_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  movement_id UUID REFERENCES public.employee_movements(id) ON DELETE SET NULL,
  assignment_kind TEXT NOT NULL, -- 'project','department','task_force','acting','incident'
  target_department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  target_project TEXT,
  acting_role TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  approver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expired BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX temp_ass_emp_idx ON public.temporary_assignments(employee_id, start_date DESC);
GRANT SELECT, INSERT, UPDATE ON public.temporary_assignments TO authenticated;
GRANT ALL ON public.temporary_assignments TO service_role;
ALTER TABLE public.temporary_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "temp_ass_select" ON public.temporary_assignments FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_manage_passports(auth.uid()));
CREATE POLICY "temp_ass_write" ON public.temporary_assignments FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_passports(auth.uid()));
CREATE POLICY "temp_ass_update" ON public.temporary_assignments FOR UPDATE TO authenticated
  USING (public.can_manage_passports(auth.uid())) WITH CHECK (public.can_manage_passports(auth.uid()));

-- ============ APPLY MOVEMENT ============
CREATE OR REPLACE FUNCTION public.apply_movement(_movement_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.employee_movements%ROWTYPE;
BEGIN
  SELECT * INTO m FROM public.employee_movements WHERE id = _movement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movement not found'; END IF;
  IF m.status = 'applied' THEN RAISE EXCEPTION 'Already applied'; END IF;
  IF m.status NOT IN ('approved') THEN RAISE EXCEPTION 'Movement is not approved'; END IF;
  IF NOT public.can_manage_passports(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised to apply movements';
  END IF;

  -- Snapshot source before applying
  UPDATE public.employees SET
    department_id = CASE WHEN m.kind IN ('department_transfer','cross_department_assignment') AND m.target_department_id IS NOT NULL THEN m.target_department_id ELSE department_id END,
    role_id = CASE WHEN m.target_role_id IS NOT NULL AND m.kind IN ('promotion','demotion','department_transfer') THEN m.target_role_id ELSE role_id END,
    level = CASE WHEN m.target_level IS NOT NULL AND m.kind IN ('promotion','demotion') THEN m.target_level ELSE level END,
    reporting_manager_id = CASE WHEN m.kind IN ('manager_change','department_transfer') AND m.target_manager_id IS NOT NULL THEN m.target_manager_id ELSE reporting_manager_id END,
    employment_status = CASE
      WHEN m.kind = 'leave' THEN 'on_leave'::employment_status
      WHEN m.kind = 'suspension' THEN 'suspended'::employment_status
      WHEN m.kind = 'reinstatement' THEN 'active'::employment_status
      WHEN m.kind = 'resignation' THEN 'resigned'::employment_status
      WHEN m.kind = 'exit' THEN 'exited'::employment_status
      WHEN m.kind = 'rejoin' THEN 'active'::employment_status
      ELSE employment_status
    END,
    exit_date = CASE WHEN m.kind = 'exit' THEN COALESCE(m.effective_date, CURRENT_DATE) ELSE exit_date END
  WHERE id = m.employee_id;

  UPDATE public.employee_movements
    SET status = 'applied', applied_at = now(), applied_by = auth.uid()
    WHERE id = m.id;

  INSERT INTO public.admin_audit_logs(actor_user_id, module, action, target_type, target_id, after)
  VALUES (auth.uid(), 'people_ops', 'movement.applied', 'employee_movement', m.id, jsonb_build_object('kind', m.kind));
END $$;
GRANT EXECUTE ON FUNCTION public.apply_movement(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_movement(uuid) FROM PUBLIC, anon;

-- Recompute movement status from approvals
CREATE OR REPLACE FUNCTION public.recompute_movement_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total int; rejected int; pending int; approved int; mv uuid;
BEGIN
  mv := COALESCE(NEW.movement_id, OLD.movement_id);
  SELECT count(*), count(*) FILTER (WHERE decision='rejected'),
         count(*) FILTER (WHERE decision='pending'),
         count(*) FILTER (WHERE decision='approved')
  INTO total, rejected, pending, approved
  FROM public.movement_approvals WHERE movement_id = mv;

  IF total = 0 THEN RETURN NEW; END IF;
  IF rejected > 0 THEN
    UPDATE public.employee_movements SET status='rejected' WHERE id=mv AND status <> 'applied';
  ELSIF pending = 0 THEN
    UPDATE public.employee_movements SET status='approved' WHERE id=mv AND status NOT IN ('applied','rejected');
  ELSE
    UPDATE public.employee_movements SET status='pending_approval' WHERE id=mv AND status = 'draft';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_recompute_movement_status
AFTER INSERT OR UPDATE ON public.movement_approvals
FOR EACH ROW EXECUTE FUNCTION public.recompute_movement_status();

-- Auto expire temporary assignments (called by scheduler)
CREATE OR REPLACE FUNCTION public.expire_temporary_assignments() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.temporary_assignments
    SET expired = true
    WHERE expired = false AND end_date < CURRENT_DATE;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;
GRANT EXECUTE ON FUNCTION public.expire_temporary_assignments() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_temporary_assignments() FROM PUBLIC, anon;
