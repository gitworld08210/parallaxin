
-- =========================================================
-- Phase 3: Unified approval engine (on platform_approval_* tables)
-- =========================================================

-- ---------- 1. Config: approval_chains ----------
CREATE TABLE IF NOT EXISTS public.approval_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL UNIQUE,      -- 'hire_compensation' | 'employee_movement' | 'expense_reimbursement'
  module      text NOT NULL,             -- 'people_ops' | 'finance' etc.
  title_template text NOT NULL,          -- e.g. 'Hire comp: {employee}'
  steps       jsonb NOT NULL,            -- [{role,department,sla_hours,required,label}]
  active      boolean NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.approval_chains TO authenticated;
GRANT ALL    ON public.approval_chains TO service_role;
ALTER TABLE public.approval_chains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_chains readable by staff"
ON public.approval_chains FOR SELECT TO authenticated
USING (public.is_admin_os_staff());

CREATE POLICY "approval_chains manageable by founder"
ON public.approval_chains FOR ALL TO authenticated
USING (public.is_admin_os_founder())
WITH CHECK (public.is_admin_os_founder());

-- ---------- 2. Seed the three chains ----------
INSERT INTO public.approval_chains (entity_type, module, title_template, steps, notes) VALUES
  ('hire_compensation', 'finance',
   'Hire compensation approval',
   '[
      {"label":"Finance L1 review","role":"finance_l1","department":"finance","sla_hours":24,"required":true},
      {"label":"Finance L2 sign-off","role":"finance_l2","department":"finance","sla_hours":24,"required":true}
    ]'::jsonb,
   'Compensation proposals raised by HR go through Finance L1 then L2.'),
  ('employee_movement', 'people_ops',
   'Employee movement approval',
   '[
      {"label":"Reporting manager","role":"manager","department":"people_ops","sla_hours":48,"required":true},
      {"label":"Department head","role":"department_head","department":"people_ops","sla_hours":48,"required":true},
      {"label":"HR head","role":"hr_head","department":"people_ops","sla_hours":48,"required":true}
    ]'::jsonb,
   'Promotions, transfers, role changes.'),
  ('expense_reimbursement', 'finance',
   'Expense reimbursement approval',
   '[
      {"label":"Reporting manager","role":"manager","department":"people_ops","sla_hours":48,"required":true},
      {"label":"Finance L1","role":"finance_l1","department":"finance","sla_hours":48,"required":true}
    ]'::jsonb,
   'Employee reimbursement claims.')
ON CONFLICT (entity_type) DO UPDATE
  SET module = EXCLUDED.module,
      title_template = EXCLUDED.title_template,
      steps  = EXCLUDED.steps,
      notes  = EXCLUDED.notes,
      active = true,
      updated_at = now();

-- ---------- 3. Helper: create_approval_request ----------
CREATE OR REPLACE FUNCTION public.create_approval_request(
  p_entity_type text,
  p_entity_id   text,
  p_title       text,
  p_payload     jsonb,
  p_requested_by uuid,
  p_priority    text DEFAULT 'normal'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chain public.approval_chains%ROWTYPE;
  v_request_id uuid;
  v_step jsonb;
  v_idx  int := 0;
  v_first_sla int;
BEGIN
  SELECT * INTO v_chain FROM public.approval_chains
  WHERE entity_type = p_entity_type AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active approval chain for entity_type=%', p_entity_type;
  END IF;

  v_first_sla := COALESCE((v_chain.steps -> 0 ->> 'sla_hours')::int, 48);

  INSERT INTO public.platform_approval_requests (
    module, entity_type, entity_id, title, payload,
    status, priority, requested_by, current_step, due_at
  ) VALUES (
    v_chain.module, p_entity_type, p_entity_id, p_title, p_payload,
    'pending', p_priority, p_requested_by, 0,
    now() + (v_first_sla || ' hours')::interval
  )
  RETURNING id INTO v_request_id;

  FOR v_step IN SELECT * FROM jsonb_array_elements(v_chain.steps) LOOP
    INSERT INTO public.platform_approval_steps (
      request_id, step_index, approver_role, approver_department,
      required, status
    ) VALUES (
      v_request_id, v_idx,
      v_step ->> 'role',
      v_step ->> 'department',
      COALESCE((v_step ->> 'required')::boolean, true),
      CASE WHEN v_idx = 0 THEN 'pending' ELSE 'waiting' END
    );
    v_idx := v_idx + 1;
  END LOOP;

  RETURN v_request_id;
END;
$$;

-- ---------- 4. Helper: can_decide_current_step ----------
CREATE OR REPLACE FUNCTION public.can_decide_current_step(
  p_request_id uuid, p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_dept text;
  v_current int;
BEGIN
  SELECT current_step INTO v_current
  FROM public.platform_approval_requests WHERE id = p_request_id;
  IF v_current IS NULL THEN RETURN false; END IF;

  SELECT approver_role, approver_department INTO v_role, v_dept
  FROM public.platform_approval_steps
  WHERE request_id = p_request_id AND step_index = v_current;

  IF v_role IS NULL THEN RETURN false; END IF;

  -- Founder / co_founder can always decide
  IF public.is_admin_os_founder() THEN RETURN true; END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.admin_roles r ON r.id = e.role_id
    LEFT JOIN public.admin_departments d ON d.id = e.department_id
    WHERE e.user_id = p_user_id
      AND e.employment_status = 'active'
      AND (r.key = v_role OR v_role = 'manager')
      AND (v_dept IS NULL OR d.key = v_dept)
  );
END;
$$;

-- ---------- 5. Helper: decide_approval_step ----------
CREATE OR REPLACE FUNCTION public.decide_approval_step(
  p_request_id uuid,
  p_decision   text,        -- 'approved' | 'rejected'
  p_reason     text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current int;
  v_step public.platform_approval_steps%ROWTYPE;
  v_chain public.approval_chains%ROWTYPE;
  v_entity_type text;
  v_total int;
  v_next_sla int;
  v_decision_id uuid;
  v_user uuid := auth.uid();
BEGIN
  IF p_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'decision must be approved or rejected';
  END IF;

  IF NOT public.can_decide_current_step(p_request_id, v_user) THEN
    RAISE EXCEPTION 'not authorized to decide this step';
  END IF;

  SELECT current_step, entity_type INTO v_current, v_entity_type
  FROM public.platform_approval_requests WHERE id = p_request_id FOR UPDATE;

  SELECT * INTO v_step FROM public.platform_approval_steps
  WHERE request_id = p_request_id AND step_index = v_current;

  INSERT INTO public.platform_approval_decisions (
    request_id, step_id, decided_by, decision, reason
  ) VALUES (p_request_id, v_step.id, v_user, p_decision, p_reason)
  RETURNING id INTO v_decision_id;

  UPDATE public.platform_approval_steps
     SET status = p_decision, updated_at = now(),
         approver_user_id = v_user
   WHERE id = v_step.id;

  IF p_decision = 'rejected' THEN
    UPDATE public.platform_approval_requests
       SET status = 'rejected', completed_at = now(), updated_at = now()
     WHERE id = p_request_id;
    RETURN v_decision_id;
  END IF;

  SELECT count(*) INTO v_total FROM public.platform_approval_steps WHERE request_id = p_request_id;

  IF v_current + 1 >= v_total THEN
    UPDATE public.platform_approval_requests
       SET status = 'approved', completed_at = now(), updated_at = now()
     WHERE id = p_request_id;
  ELSE
    SELECT * INTO v_chain FROM public.approval_chains WHERE entity_type = v_entity_type;
    v_next_sla := COALESCE((v_chain.steps -> (v_current + 1) ->> 'sla_hours')::int, 48);

    UPDATE public.platform_approval_requests
       SET current_step = v_current + 1,
           due_at = now() + (v_next_sla || ' hours')::interval,
           updated_at = now()
     WHERE id = p_request_id;

    UPDATE public.platform_approval_steps
       SET status = 'pending', updated_at = now()
     WHERE request_id = p_request_id AND step_index = v_current + 1;
  END IF;

  RETURN v_decision_id;
END;
$$;

-- ---------- 6. Intake triggers on source tables ----------
CREATE OR REPLACE FUNCTION public.trg_seed_hire_comp_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_req uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_approval_requests
    WHERE entity_type = 'hire_compensation' AND entity_id = NEW.id::text
  ) THEN
    v_req := public.create_approval_request(
      'hire_compensation', NEW.id::text,
      'Hire compensation: candidate ' || COALESCE(NEW.employee_id::text,'new hire'),
      to_jsonb(NEW), NEW.submitted_by, 'normal'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_hire_comp_approval ON public.hire_compensation_proposals;
CREATE TRIGGER trg_seed_hire_comp_approval
AFTER INSERT ON public.hire_compensation_proposals
FOR EACH ROW EXECUTE FUNCTION public.trg_seed_hire_comp_approval();

CREATE OR REPLACE FUNCTION public.trg_seed_movement_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_approval_requests
    WHERE entity_type = 'employee_movement' AND entity_id = NEW.id::text
  ) THEN
    PERFORM public.create_approval_request(
      'employee_movement', NEW.id::text,
      'Employee movement for ' || NEW.employee_id::text,
      to_jsonb(NEW), NEW.requested_by, 'normal'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_movement_approval ON public.employee_movements;
CREATE TRIGGER trg_seed_movement_approval
AFTER INSERT ON public.employee_movements
FOR EACH ROW EXECUTE FUNCTION public.trg_seed_movement_approval();

CREATE OR REPLACE FUNCTION public.trg_seed_reimbursement_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_approval_requests
    WHERE entity_type = 'expense_reimbursement' AND entity_id = NEW.id::text
  ) THEN
    PERFORM public.create_approval_request(
      'expense_reimbursement', NEW.id::text,
      'Reimbursement claim ' || COALESCE(NEW.amount::text,'') ,
      to_jsonb(NEW), NEW.submitted_by,
      CASE WHEN COALESCE(NEW.amount, 0) > 50000 THEN 'high' ELSE 'normal' END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_reimbursement_approval ON public.reimbursements;
CREATE TRIGGER trg_seed_reimbursement_approval
AFTER INSERT ON public.reimbursements
FOR EACH ROW EXECUTE FUNCTION public.trg_seed_reimbursement_approval();

COMMENT ON TABLE public.approval_chains IS
  'Phase 3 approval engine: entity_type -> ordered steps. Read by create_approval_request().';
COMMENT ON FUNCTION public.decide_approval_step IS
  'Phase 3 approval engine: record a decision, advance/close request atomically. Enforces can_decide_current_step().';
