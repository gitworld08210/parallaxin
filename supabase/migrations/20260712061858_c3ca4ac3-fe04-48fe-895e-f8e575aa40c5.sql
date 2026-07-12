
-- =========================================================
-- Phase 3.4 — Company Governance Center
-- =========================================================

-- ---------- POLICIES ----------
CREATE TABLE public.governance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','approved','published','revision','archived')),
  current_version INT NOT NULL DEFAULT 1,
  effective_date DATE,
  review_date DATE,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX gov_policies_status_idx ON public.governance_policies(status);
CREATE INDEX gov_policies_category_idx ON public.governance_policies(category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.governance_policies TO authenticated;
GRANT ALL ON public.governance_policies TO service_role;
ALTER TABLE public.governance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gov_policies_read_published_or_founder" ON public.governance_policies
  FOR SELECT TO authenticated USING (
    status = 'published' OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "gov_policies_founder_write" ON public.governance_policies
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "gov_policies_founder_update" ON public.governance_policies
  FOR UPDATE TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "gov_policies_founder_delete" ON public.governance_policies
  FOR DELETE TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- ---------- POLICY VERSIONS ----------
CREATE TABLE public.governance_policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.governance_policies(id) ON DELETE CASCADE,
  version INT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  changelog TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','approved','published','archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (policy_id, version)
);
CREATE INDEX gov_policy_versions_policy_idx ON public.governance_policy_versions(policy_id, version DESC);

GRANT SELECT, INSERT, UPDATE ON public.governance_policy_versions TO authenticated;
GRANT ALL ON public.governance_policy_versions TO service_role;
ALTER TABLE public.governance_policy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gov_policy_versions_read" ON public.governance_policy_versions
  FOR SELECT TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
    OR (status = 'published' AND EXISTS (
      SELECT 1 FROM public.governance_policies p
      WHERE p.id = policy_id AND p.status = 'published'
    ))
  );
CREATE POLICY "gov_policy_versions_founder_write" ON public.governance_policy_versions
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "gov_policy_versions_founder_update" ON public.governance_policy_versions
  FOR UPDATE TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- ---------- POLICY ACKNOWLEDGEMENTS ----------
CREATE TABLE public.governance_policy_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.governance_policies(id) ON DELETE CASCADE,
  version INT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (policy_id, version, user_id)
);
CREATE INDEX gov_ack_policy_idx ON public.governance_policy_acknowledgements(policy_id, version);
CREATE INDEX gov_ack_user_idx ON public.governance_policy_acknowledgements(user_id);

GRANT SELECT, INSERT ON public.governance_policy_acknowledgements TO authenticated;
GRANT ALL ON public.governance_policy_acknowledgements TO service_role;
ALTER TABLE public.governance_policy_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gov_ack_read_self_or_founder" ON public.governance_policy_acknowledgements
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "gov_ack_insert_self" ON public.governance_policy_acknowledgements
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ---------- GOVERNANCE RULES ----------
CREATE TABLE public.governance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','suspended','archived')),
  effective_date DATE,
  related_policy_ids UUID[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.governance_rules TO authenticated;
GRANT ALL ON public.governance_rules TO service_role;
ALTER TABLE public.governance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gov_rules_read" ON public.governance_rules
  FOR SELECT TO authenticated USING (
    status = 'active' OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "gov_rules_founder_write" ON public.governance_rules
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));

-- ---------- AUTHORITY MATRIX ----------
CREATE TABLE public.governance_authority_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL,
  scope TEXT NOT NULL,
  authority_level TEXT NOT NULL
    CHECK (authority_level IN ('none','view','recommend','approve','veto','delegate','full')),
  description TEXT,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_key, scope, department_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.governance_authority_matrix TO authenticated;
GRANT ALL ON public.governance_authority_matrix TO service_role;
ALTER TABLE public.governance_authority_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gov_authority_read" ON public.governance_authority_matrix
  FOR SELECT TO authenticated USING (
    is_active OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "gov_authority_founder_write" ON public.governance_authority_matrix
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));

-- ---------- APPROVAL MATRIX ----------
CREATE TABLE public.governance_approval_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  request_type TEXT NOT NULL,
  approver_role TEXT,
  recommender_role TEXT,
  reviewer_role TEXT,
  delegate_role TEXT,
  notify_roles TEXT[] NOT NULL DEFAULT '{}',
  threshold_amount NUMERIC,
  threshold_currency TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX gov_approval_matrix_type_idx ON public.governance_approval_matrix(request_type, scope);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.governance_approval_matrix TO authenticated;
GRANT ALL ON public.governance_approval_matrix TO service_role;
ALTER TABLE public.governance_approval_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gov_approval_matrix_read" ON public.governance_approval_matrix
  FOR SELECT TO authenticated USING (
    is_active OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "gov_approval_matrix_founder_write" ON public.governance_approval_matrix
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));

-- ---------- AUTHORITY DELEGATIONS ----------
CREATE TABLE public.governance_authority_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  reason TEXT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','revoked','expired','completed','rejected')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX gov_deleg_delegate_idx ON public.governance_authority_delegations(delegate_id, status);
CREATE INDEX gov_deleg_delegator_idx ON public.governance_authority_delegations(delegator_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.governance_authority_delegations TO authenticated;
GRANT ALL ON public.governance_authority_delegations TO service_role;
ALTER TABLE public.governance_authority_delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gov_deleg_read" ON public.governance_authority_delegations
  FOR SELECT TO authenticated USING (
    delegator_id = auth.uid() OR delegate_id = auth.uid()
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "gov_deleg_founder_insert" ON public.governance_authority_delegations
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "gov_deleg_update" ON public.governance_authority_delegations
  FOR UPDATE TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
    OR delegate_id = auth.uid()
  );
CREATE POLICY "gov_deleg_founder_delete" ON public.governance_authority_delegations
  FOR DELETE TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- ---------- DEPARTMENT CHARTERS ----------
CREATE TABLE public.governance_department_charters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.admin_departments(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  mission TEXT,
  responsibilities TEXT,
  kpis TEXT,
  approval_rights TEXT,
  escalation_path TEXT,
  reporting_structure TEXT,
  training_standards TEXT,
  documentation_standards TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','approved','archived')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.governance_department_charters TO authenticated;
GRANT ALL ON public.governance_department_charters TO service_role;
ALTER TABLE public.governance_department_charters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gov_charters_read" ON public.governance_department_charters
  FOR SELECT TO authenticated USING (
    status = 'approved' OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "gov_charters_founder_write" ON public.governance_department_charters
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));

-- ---------- TRIGGERS ----------
CREATE TRIGGER trg_gov_policies_touch BEFORE UPDATE ON public.governance_policies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_gov_rules_touch BEFORE UPDATE ON public.governance_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_gov_authority_touch BEFORE UPDATE ON public.governance_authority_matrix
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_gov_approval_matrix_touch BEFORE UPDATE ON public.governance_approval_matrix
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_gov_deleg_touch BEFORE UPDATE ON public.governance_authority_delegations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_gov_charters_touch BEFORE UPDATE ON public.governance_department_charters
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
