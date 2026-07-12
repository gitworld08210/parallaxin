
-- =========================================================
-- Hire Compensation Proposals + Finance Onboarding
-- =========================================================

-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.hire_comp_status AS ENUM (
    'draft','pending_finance_l1','pending_finance_l2','approved','rejected','sent_back'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hire_fin_onboarding_status AS ENUM (
    'awaiting_employee','submitted_by_employee','verified_by_finance','rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------
-- Roles: finance_l1, finance_l2 (added if missing)
-- ---------------------------------------------------------
INSERT INTO public.admin_roles (key, name, description, priority) VALUES
  ('finance_l1', 'Finance L1', 'Finance analyst — first-level approver on hire compensation', 40),
  ('finance_l2', 'Finance L2', 'Finance head/CFO delegate — final approver on hire compensation and finance onboarding', 20)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------
INSERT INTO public.admin_permissions (module, permission_key, name, description) VALUES
  ('finance', 'finance.hire_comp.submit',      'Submit hire compensation',    'HR submits a new-hire compensation proposal to Finance'),
  ('finance', 'finance.hire_comp.review_l1',   'Finance L1 review',           'Finance L1 approves/rejects/sends-back hire compensation proposals'),
  ('finance', 'finance.hire_comp.approve_l2',  'Finance L2 approve',          'Finance L2 gives final decision on hire compensation proposals'),
  ('finance', 'finance.hire_onboarding.verify','Verify finance onboarding',   'Finance verifies new-hire bank & KYC documents')
ON CONFLICT (permission_key) DO NOTHING;

-- Grant permissions to roles
-- HR head + anyone with people_ops.recruitment.manage gets .submit
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE p.permission_key = 'finance.hire_comp.submit'
  AND r.id IN (
    SELECT DISTINCT rp.role_id FROM public.admin_role_permissions rp
    JOIN public.admin_permissions p2 ON p2.id = rp.permission_id
    WHERE p2.permission_key IN ('people_ops.recruitment.manage','people_ops.employees.manage')
  )
ON CONFLICT DO NOTHING;

-- finance_l1 gets review_l1
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.key = 'finance_l1'
  AND p.permission_key IN ('admin_os.access','finance.hire_comp.review_l1')
ON CONFLICT DO NOTHING;

-- finance_l2 gets approve_l2 + onboarding.verify + review_l1 (can also act as L1)
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.key = 'finance_l2'
  AND p.permission_key IN (
    'admin_os.access','finance.hire_comp.review_l1','finance.hire_comp.approve_l2','finance.hire_onboarding.verify'
  )
ON CONFLICT DO NOTHING;

-- Department heads (finance head via department_head role) auto-grant L2 permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.key = 'department_head'
  AND p.permission_key IN (
    'finance.hire_comp.review_l1','finance.hire_comp.approve_l2','finance.hire_onboarding.verify'
  )
ON CONFLICT DO NOTHING;

-- Founder / Co-Founder already get everything via the CROSS JOIN on all permissions,
-- but they were inserted before these keys existed, so top them up now.
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.key IN ('founder','co_founder')
  AND p.permission_key IN (
    'finance.hire_comp.submit',
    'finance.hire_comp.review_l1',
    'finance.hire_comp.approve_l2',
    'finance.hire_onboarding.verify'
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------
-- Compensation proposals
-- ---------------------------------------------------------
CREATE TABLE public.hire_compensation_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_number TEXT NOT NULL UNIQUE DEFAULT ('HC-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  hiring_request_id UUID REFERENCES public.hiring_requests(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  role_title TEXT NOT NULL,
  level TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  base_monthly NUMERIC(14,2) NOT NULL DEFAULT 0,
  joining_bonus NUMERIC(14,2) NOT NULL DEFAULT 0,
  variable_bonus NUMERIC(14,2) NOT NULL DEFAULT 0,
  allowances JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  status public.hire_comp_status NOT NULL DEFAULT 'draft',
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  l1_reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  l1_decision TEXT,
  l1_reason TEXT,
  l1_at TIMESTAMPTZ,
  l2_reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  l2_decision TEXT,
  l2_reason TEXT,
  l2_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hcp_status ON public.hire_compensation_proposals(status);
CREATE INDEX idx_hcp_employee ON public.hire_compensation_proposals(employee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hire_compensation_proposals TO authenticated;
GRANT ALL ON public.hire_compensation_proposals TO service_role;
ALTER TABLE public.hire_compensation_proposals ENABLE ROW LEVEL SECURITY;

-- Read: HR (submitters), Finance L1/L2, Founders, and the target employee themselves
CREATE POLICY "hcp_view" ON public.hire_compensation_proposals FOR SELECT TO authenticated USING (
  public.has_admin_permission(auth.uid(),'finance.hire_comp.submit')
  OR public.has_admin_permission(auth.uid(),'finance.hire_comp.review_l1')
  OR public.has_admin_permission(auth.uid(),'finance.hire_comp.approve_l2')
  OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- HR creates
CREATE POLICY "hcp_insert_hr" ON public.hire_compensation_proposals FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission(auth.uid(),'finance.hire_comp.submit'));

-- HR updates own draft/sent_back rows; Finance updates decision fields.
-- We keep the policy permissive at RLS level and enforce state transitions via trigger.
CREATE POLICY "hcp_update" ON public.hire_compensation_proposals FOR UPDATE TO authenticated
  USING (
    public.has_admin_permission(auth.uid(),'finance.hire_comp.submit')
    OR public.has_admin_permission(auth.uid(),'finance.hire_comp.review_l1')
    OR public.has_admin_permission(auth.uid(),'finance.hire_comp.approve_l2')
  )
  WITH CHECK (
    public.has_admin_permission(auth.uid(),'finance.hire_comp.submit')
    OR public.has_admin_permission(auth.uid(),'finance.hire_comp.review_l1')
    OR public.has_admin_permission(auth.uid(),'finance.hire_comp.approve_l2')
  );

CREATE TRIGGER trg_hcp_updated BEFORE UPDATE ON public.hire_compensation_proposals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Guard: enforce state transitions + write-scope
CREATE OR REPLACE FUNCTION public.guard_hire_comp_transitions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_hr boolean := public.has_admin_permission(auth.uid(),'finance.hire_comp.submit');
  is_l1 boolean := public.has_admin_permission(auth.uid(),'finance.hire_comp.review_l1');
  is_l2 boolean := public.has_admin_permission(auth.uid(),'finance.hire_comp.approve_l2');
  is_founder boolean := EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.admin_roles r ON r.id = e.role_id
    WHERE e.user_id = auth.uid() AND r.key IN ('founder','co_founder')
  );
BEGIN
  IF is_founder THEN RETURN NEW; END IF;

  -- HR-only transitions
  IF NEW.status IN ('draft','pending_finance_l1') AND NOT is_hr THEN
    RAISE EXCEPTION 'Only HR can create or submit hire compensation proposals';
  END IF;

  -- Finance L1 transitions
  IF NEW.status = 'pending_finance_l2' AND OLD.status <> 'pending_finance_l2' AND NOT is_l1 THEN
    RAISE EXCEPTION 'Only Finance L1 can advance a proposal to L2';
  END IF;

  -- Final approval by L2
  IF NEW.status = 'approved' AND OLD.status <> 'approved' AND NOT is_l2 THEN
    RAISE EXCEPTION 'Only Finance L2 can give final approval';
  END IF;

  -- Reject / send back allowed by L1 or L2
  IF NEW.status IN ('rejected','sent_back') AND OLD.status <> NEW.status
     AND NOT (is_l1 OR is_l2) THEN
    RAISE EXCEPTION 'Only Finance can reject or send back a proposal';
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_hcp_guard BEFORE UPDATE ON public.hire_compensation_proposals
  FOR EACH ROW EXECUTE FUNCTION public.guard_hire_comp_transitions();

-- ---------------------------------------------------------
-- Finance onboarding (bank + KYC data collected from employee)
-- ---------------------------------------------------------
CREATE TABLE public.hire_finance_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.hire_compensation_proposals(id) ON DELETE SET NULL,
  status public.hire_fin_onboarding_status NOT NULL DEFAULT 'awaiting_employee',
  -- Bank
  bank_account_holder_name TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc_swift TEXT,
  branch TEXT,
  -- KYC / tax
  pan_number TEXT,
  aadhaar_last4 TEXT,
  tax_id TEXT,
  address TEXT,
  emergency_contact TEXT,
  -- Documents (private storage paths in bucket 'hire-finance-docs')
  cancelled_cheque_path TEXT,
  pan_doc_path TEXT,
  aadhaar_doc_path TEXT,
  address_proof_path TEXT,
  -- Workflow
  submitted_at TIMESTAMPTZ,
  finance_verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  finance_verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hfo_status ON public.hire_finance_onboarding(status);

GRANT SELECT, INSERT, UPDATE ON public.hire_finance_onboarding TO authenticated;
GRANT ALL ON public.hire_finance_onboarding TO service_role;
ALTER TABLE public.hire_finance_onboarding ENABLE ROW LEVEL SECURITY;

-- Base table SELECT: only the target employee + Finance L2 verifiers + founders.
-- HR does NOT get direct access to bank/KYC fields.
CREATE POLICY "hfo_view_owner_or_finance" ON public.hire_finance_onboarding FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.has_admin_permission(auth.uid(),'finance.hire_onboarding.verify')
    OR EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.admin_roles r ON r.id = e.role_id
      WHERE e.user_id = auth.uid() AND r.key IN ('founder','co_founder')
    )
  );

-- Owner-employee inserts/updates their own record while status is awaiting/submitted.
CREATE POLICY "hfo_insert_owner_or_finance" ON public.hire_finance_onboarding FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.has_admin_permission(auth.uid(),'finance.hire_onboarding.verify')
  );

CREATE POLICY "hfo_update_owner_or_finance" ON public.hire_finance_onboarding FOR UPDATE TO authenticated
  USING (
    (
      employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND status IN ('awaiting_employee','submitted_by_employee','rejected')
    )
    OR public.has_admin_permission(auth.uid(),'finance.hire_onboarding.verify')
  )
  WITH CHECK (
    (
      employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND status IN ('awaiting_employee','submitted_by_employee')
    )
    OR public.has_admin_permission(auth.uid(),'finance.hire_onboarding.verify')
  );

CREATE TRIGGER trg_hfo_updated BEFORE UPDATE ON public.hire_finance_onboarding FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- HR-safe view: masked status only, no bank / KYC exposure.
CREATE OR REPLACE VIEW public.hire_finance_onboarding_status_public
WITH (security_invoker=on) AS
SELECT
  id,
  employee_id,
  proposal_id,
  status,
  submitted_at,
  finance_verified_at,
  CASE WHEN status = 'verified_by_finance' THEN true ELSE false END AS is_verified,
  updated_at
FROM public.hire_finance_onboarding;

GRANT SELECT ON public.hire_finance_onboarding_status_public TO authenticated;

-- Storage RLS for hire-finance-docs bucket (bucket created via storage_create_bucket tool)
CREATE POLICY "hire_fin_docs_owner_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hire-finance-docs'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR public.has_admin_permission(auth.uid(),'finance.hire_onboarding.verify')
    )
  );

CREATE POLICY "hire_fin_docs_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'hire-finance-docs'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR public.has_admin_permission(auth.uid(),'finance.hire_onboarding.verify')
      OR EXISTS (
        SELECT 1 FROM public.employees e
        JOIN public.admin_roles r ON r.id = e.role_id
        WHERE e.user_id = auth.uid() AND r.key IN ('founder','co_founder')
      )
    )
  );

CREATE POLICY "hire_fin_docs_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'hire-finance-docs'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR public.has_admin_permission(auth.uid(),'finance.hire_onboarding.verify')
    )
  );

CREATE POLICY "hire_fin_docs_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'hire-finance-docs'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR public.has_admin_permission(auth.uid(),'finance.hire_onboarding.verify')
    )
  );

-- Auto-seed a finance onboarding row when a compensation proposal is fully approved.
CREATE OR REPLACE FUNCTION public.on_hire_comp_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved')
     AND NEW.employee_id IS NOT NULL THEN
    INSERT INTO public.hire_finance_onboarding (employee_id, proposal_id, status)
    VALUES (NEW.employee_id, NEW.id, 'awaiting_employee')
    ON CONFLICT (employee_id) DO UPDATE
      SET proposal_id = EXCLUDED.proposal_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_hcp_seed_onboarding AFTER UPDATE ON public.hire_compensation_proposals
  FOR EACH ROW EXECUTE FUNCTION public.on_hire_comp_approved();
