
-- Phase 2.10 Payroll, Compensation & Benefits

CREATE TYPE public.compensation_type AS ENUM ('monthly_salary','hourly','intern_stipend','contract','project_based');
CREATE TYPE public.salary_structure_status AS ENUM ('draft','active','superseded','archived');
CREATE TYPE public.payroll_cycle_status AS ENUM ('draft','finance_review','hr_review','founder_review','approved','released','cancelled');
CREATE TYPE public.bonus_type AS ENUM ('performance','festival','joining','retention','referral','spot_award','custom');
CREATE TYPE public.bonus_status AS ENUM ('draft','approved','paid','rejected');
CREATE TYPE public.reimbursement_status AS ENUM ('pending_manager','pending_finance','approved','rejected','paid');
CREATE TYPE public.salary_revision_status AS ENUM ('pending_hr','pending_finance','pending_founder','approved','rejected');

-- Compensation plans
CREATE TABLE public.compensation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  comp_type public.compensation_type NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compensation_plans TO authenticated;
GRANT ALL ON public.compensation_plans TO service_role;
ALTER TABLE public.compensation_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp plans view" ON public.compensation_plans FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.payroll.view'));
CREATE POLICY "comp plans manage" ON public.compensation_plans FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.compensation.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.compensation.manage'));

-- Salary structures (versioned per employee)
CREATE TABLE public.salary_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.compensation_plans(id),
  currency text NOT NULL DEFAULT 'INR',
  basic numeric(14,2) NOT NULL DEFAULT 0,
  house_allowance numeric(14,2) NOT NULL DEFAULT 0,
  transport_allowance numeric(14,2) NOT NULL DEFAULT 0,
  medical_allowance numeric(14,2) NOT NULL DEFAULT 0,
  special_allowance numeric(14,2) NOT NULL DEFAULT 0,
  other_allowances jsonb NOT NULL DEFAULT '[]'::jsonb,
  deductions jsonb NOT NULL DEFAULT '[]'::jsonb,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  gross_monthly numeric(14,2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  effective_to date,
  status public.salary_structure_status NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX salary_structures_emp_idx ON public.salary_structures(employee_id, effective_from DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_structures TO authenticated;
GRANT ALL ON public.salary_structures TO service_role;
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salary view" ON public.salary_structures FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.payroll.view'));
CREATE POLICY "salary manage" ON public.salary_structures FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.compensation.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.compensation.manage'));

-- Salary revisions workflow
CREATE TABLE public.salary_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  from_structure_id uuid REFERENCES public.salary_structures(id),
  to_structure_id uuid REFERENCES public.salary_structures(id),
  reason text NOT NULL,
  proposed_gross numeric(14,2),
  effective_date date NOT NULL,
  status public.salary_revision_status NOT NULL DEFAULT 'pending_hr',
  requested_by uuid,
  hr_reviewer uuid, hr_reviewed_at timestamptz,
  finance_reviewer uuid, finance_reviewed_at timestamptz,
  founder_reviewer uuid, founder_reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_revisions TO authenticated;
GRANT ALL ON public.salary_revisions TO service_role;
ALTER TABLE public.salary_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rev view" ON public.salary_revisions FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.payroll.view'));
CREATE POLICY "rev manage" ON public.salary_revisions FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.compensation.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.compensation.manage'));

-- Payroll cycles
CREATE TABLE public.payroll_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month date NOT NULL UNIQUE,
  status public.payroll_cycle_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'INR',
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid, generated_at timestamptz,
  finance_reviewer uuid, finance_reviewed_at timestamptz,
  hr_reviewer uuid, hr_reviewed_at timestamptz,
  founder_reviewer uuid, founder_reviewed_at timestamptz,
  approved_by uuid, approved_at timestamptz,
  released_by uuid, released_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_cycles TO authenticated;
GRANT ALL ON public.payroll_cycles TO service_role;
ALTER TABLE public.payroll_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cycles view" ON public.payroll_cycles FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.payroll.view'));
CREATE POLICY "cycles manage" ON public.payroll_cycles FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.payroll.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.payroll.manage'));

-- Payroll items (per-employee snapshot)
CREATE TABLE public.payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.payroll_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  structure_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  worked_days numeric(6,2) NOT NULL DEFAULT 0,
  leave_days numeric(6,2) NOT NULL DEFAULT 0,
  loss_of_pay_days numeric(6,2) NOT NULL DEFAULT 0,
  gross numeric(14,2) NOT NULL DEFAULT 0,
  bonuses_total numeric(14,2) NOT NULL DEFAULT 0,
  reimbursements_total numeric(14,2) NOT NULL DEFAULT 0,
  deductions_total numeric(14,2) NOT NULL DEFAULT 0,
  net_pay numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, employee_id)
);
CREATE INDEX payroll_items_emp_idx ON public.payroll_items(employee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_items TO authenticated;
GRANT ALL ON public.payroll_items TO service_role;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items view" ON public.payroll_items FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.payroll.view'));
CREATE POLICY "items manage" ON public.payroll_items FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.payroll.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.payroll.manage'));

-- Immutability: prevent update/delete when parent cycle is released
CREATE OR REPLACE FUNCTION public.prevent_payroll_item_edit_when_released()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE s public.payroll_cycle_status;
BEGIN
  SELECT status INTO s FROM public.payroll_cycles WHERE id = COALESCE(NEW.cycle_id, OLD.cycle_id);
  IF s = 'released' THEN
    RAISE EXCEPTION 'Payroll items are immutable once the cycle is released';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payroll_items_immutable
  BEFORE UPDATE OR DELETE ON public.payroll_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payroll_item_edit_when_released();

-- Bonuses
CREATE TABLE public.compensation_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  bonus_type public.bonus_type NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  reason text NOT NULL,
  status public.bonus_status NOT NULL DEFAULT 'draft',
  requested_by uuid,
  approver uuid, approved_at timestamptz,
  paid_cycle_id uuid REFERENCES public.payroll_cycles(id),
  paid_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compensation_bonuses TO authenticated;
GRANT ALL ON public.compensation_bonuses TO service_role;
ALTER TABLE public.compensation_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bonus view" ON public.compensation_bonuses FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.payroll.view'));
CREATE POLICY "bonus manage" ON public.compensation_bonuses FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.bonus.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.bonus.manage'));

-- Benefits catalog
CREATE TABLE public.benefits_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  monthly_cost numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefits_catalog TO authenticated;
GRANT ALL ON public.benefits_catalog TO service_role;
ALTER TABLE public.benefits_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "benefits view" ON public.benefits_catalog FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.payroll.view'));
CREATE POLICY "benefits manage" ON public.benefits_catalog FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.benefits.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.benefits.manage'));

-- Employee benefits enrollments
CREATE TABLE public.employee_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  benefit_id uuid NOT NULL REFERENCES public.benefits_catalog(id) ON DELETE RESTRICT,
  enrolled_from date NOT NULL,
  enrolled_to date,
  notes text,
  enrolled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_benefits TO authenticated;
GRANT ALL ON public.employee_benefits TO service_role;
ALTER TABLE public.employee_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ebenefits view" ON public.employee_benefits FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.payroll.view'));
CREATE POLICY "ebenefits manage" ON public.employee_benefits FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.benefits.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.benefits.manage'));

-- Reimbursements
CREATE TABLE public.reimbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category text NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  description text NOT NULL,
  receipt_url text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.reimbursement_status NOT NULL DEFAULT 'pending_manager',
  submitted_by uuid,
  manager_reviewer uuid, manager_reviewed_at timestamptz,
  finance_reviewer uuid, finance_reviewed_at timestamptz,
  paid_cycle_id uuid REFERENCES public.payroll_cycles(id),
  paid_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reimbursements TO authenticated;
GRANT ALL ON public.reimbursements TO service_role;
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reimb view all" ON public.reimbursements FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.payroll.view')
         OR submitted_by = auth.uid());
CREATE POLICY "reimb submit" ON public.reimbursements FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid()
              OR public.has_admin_permission(auth.uid(),'people_ops.reimbursement.manage'));
CREATE POLICY "reimb manage" ON public.reimbursements FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.reimbursement.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.reimbursement.manage'));
CREATE POLICY "reimb delete" ON public.reimbursements FOR DELETE TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.reimbursement.manage'));

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.payroll_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER t_comp_plans_touch BEFORE UPDATE ON public.compensation_plans FOR EACH ROW EXECUTE FUNCTION public.payroll_touch_updated_at();
CREATE TRIGGER t_sal_struct_touch BEFORE UPDATE ON public.salary_structures FOR EACH ROW EXECUTE FUNCTION public.payroll_touch_updated_at();
CREATE TRIGGER t_sal_rev_touch BEFORE UPDATE ON public.salary_revisions FOR EACH ROW EXECUTE FUNCTION public.payroll_touch_updated_at();
CREATE TRIGGER t_cycle_touch BEFORE UPDATE ON public.payroll_cycles FOR EACH ROW EXECUTE FUNCTION public.payroll_touch_updated_at();
CREATE TRIGGER t_items_touch BEFORE UPDATE ON public.payroll_items FOR EACH ROW EXECUTE FUNCTION public.payroll_touch_updated_at();
CREATE TRIGGER t_bonus_touch BEFORE UPDATE ON public.compensation_bonuses FOR EACH ROW EXECUTE FUNCTION public.payroll_touch_updated_at();
CREATE TRIGGER t_ben_cat_touch BEFORE UPDATE ON public.benefits_catalog FOR EACH ROW EXECUTE FUNCTION public.payroll_touch_updated_at();
CREATE TRIGGER t_emp_ben_touch BEFORE UPDATE ON public.employee_benefits FOR EACH ROW EXECUTE FUNCTION public.payroll_touch_updated_at();
CREATE TRIGGER t_reimb_touch BEFORE UPDATE ON public.reimbursements FOR EACH ROW EXECUTE FUNCTION public.payroll_touch_updated_at();

-- Auto-compute gross_monthly on salary_structures
CREATE OR REPLACE FUNCTION public.compute_salary_gross()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE extra numeric(14,2) := 0;
BEGIN
  SELECT COALESCE(SUM((v->>'amount')::numeric),0) INTO extra FROM jsonb_array_elements(NEW.other_allowances) v;
  NEW.gross_monthly := COALESCE(NEW.basic,0) + COALESCE(NEW.house_allowance,0) + COALESCE(NEW.transport_allowance,0)
                       + COALESCE(NEW.medical_allowance,0) + COALESCE(NEW.special_allowance,0) + extra;
  RETURN NEW;
END $$;
CREATE TRIGGER t_sal_struct_gross BEFORE INSERT OR UPDATE ON public.salary_structures
  FOR EACH ROW EXECUTE FUNCTION public.compute_salary_gross();
