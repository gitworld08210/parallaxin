
-- ============================================================
-- AURELIX ADMIN OS — Phase 1 Foundation
-- ============================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.employment_status AS ENUM (
    'candidate','offer_sent','offer_accepted','pre_onboarding',
    'joining_today','active','on_leave','suspended','resigned','exited','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.admin_user_type AS ENUM ('founder','co_founder','employee','contractor','temporary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- DEPARTMENTS ----------
CREATE TABLE public.admin_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_departments TO authenticated;
GRANT ALL ON public.admin_departments TO service_role;
ALTER TABLE public.admin_departments ENABLE ROW LEVEL SECURITY;

-- ---------- ROLES ----------
CREATE TABLE public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  priority int NOT NULL DEFAULT 100,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_roles TO authenticated;
GRANT ALL ON public.admin_roles TO service_role;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- ---------- PERMISSIONS ----------
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  permission_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- ---------- ROLE ↔ PERMISSION ----------
CREATE TABLE public.admin_role_permissions (
  role_id uuid NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);
GRANT SELECT ON public.admin_role_permissions TO authenticated;
GRANT ALL ON public.admin_role_permissions TO service_role;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;

-- ---------- EMPLOYEES ----------
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_number text NOT NULL UNIQUE,
  full_name text NOT NULL,
  company_email text NOT NULL UNIQUE,
  department_id uuid REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  role_id uuid REFERENCES public.admin_roles(id) ON DELETE SET NULL,
  user_type public.admin_user_type NOT NULL DEFAULT 'employee',
  level text,
  employment_status public.employment_status NOT NULL DEFAULT 'pre_onboarding',
  reporting_manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  photo_url text,
  passport_id text,
  joining_date date,
  exit_date date,
  requires_password_change boolean NOT NULL DEFAULT true,
  requires_2fa_setup boolean NOT NULL DEFAULT true,
  policies_accepted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employees_department_idx ON public.employees(department_id);
CREATE INDEX employees_role_idx ON public.employees(role_id);
CREATE INDEX employees_status_idx ON public.employees(employment_status);
GRANT SELECT, INSERT, UPDATE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- ---------- SESSIONS ----------
CREATE TABLE public.employee_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  device_id uuid,
  ip inet,
  user_agent text,
  region text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoke_reason text
);
CREATE INDEX employee_sessions_employee_idx ON public.employee_sessions(employee_id);
GRANT SELECT, INSERT, UPDATE ON public.employee_sessions TO authenticated;
GRANT ALL ON public.employee_sessions TO service_role;
ALTER TABLE public.employee_sessions ENABLE ROW LEVEL SECURITY;

-- ---------- DEVICES ----------
CREATE TABLE public.employee_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  device_name text,
  browser text,
  os text,
  region text,
  ip inet,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  trusted boolean NOT NULL DEFAULT false
);
CREATE INDEX employee_devices_employee_idx ON public.employee_devices(employee_id);
GRANT SELECT, INSERT, UPDATE ON public.employee_devices TO authenticated;
GRANT ALL ON public.employee_devices TO service_role;
ALTER TABLE public.employee_devices ENABLE ROW LEVEL SECURITY;

-- ---------- AUDIT LOG (append-only) ----------
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  module text NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_actor_idx ON public.admin_audit_logs(actor_employee_id);
CREATE INDEX admin_audit_module_idx ON public.admin_audit_logs(module);
CREATE INDEX admin_audit_created_idx ON public.admin_audit_logs(created_at DESC);
GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECURITY DEFINER HELPERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_employment_status()
RETURNS public.employment_status LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT employment_status FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_active_employee(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = _uid
      AND employment_status IN ('active','on_leave','joining_today')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_admin_permission(_uid uuid, _permission_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.admin_role_permissions rp ON rp.role_id = e.role_id
    JOIN public.admin_permissions p ON p.id = rp.permission_id
    WHERE e.user_id = _uid
      AND e.employment_status IN ('active','on_leave','joining_today')
      AND p.permission_key = _permission_key
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_department_member(_uid uuid, _department_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.admin_departments d ON d.id = e.department_id
    WHERE e.user_id = _uid
      AND d.key = _department_key
      AND e.employment_status IN ('active','on_leave','joining_today')
  );
$$;

-- ============================================================
-- POLICIES
-- ============================================================

-- Departments / Roles / Permissions: readable by any active employee, write only by Founder Office.
CREATE POLICY "active employees can read departments" ON public.admin_departments
  FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "founder office manages departments" ON public.admin_departments
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE POLICY "active employees can read roles" ON public.admin_roles
  FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "founder office manages roles" ON public.admin_roles
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE POLICY "active employees can read permissions" ON public.admin_permissions
  FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "founder office manages permissions" ON public.admin_permissions
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE POLICY "active employees can read role permissions" ON public.admin_role_permissions
  FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
CREATE POLICY "founder office manages role permissions" ON public.admin_role_permissions
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

-- Employees
CREATE POLICY "employee can view own record" ON public.employees
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "hr and founders can view all employees" ON public.employees
  FOR SELECT TO authenticated USING (
    public.is_admin_department_member(auth.uid(),'people_ops')
    OR public.is_admin_department_member(auth.uid(),'founder_office')
  );
CREATE POLICY "hr and founders can create employees" ON public.employees
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_department_member(auth.uid(),'people_ops')
    OR public.is_admin_department_member(auth.uid(),'founder_office')
  );
CREATE POLICY "hr and founders can update employees" ON public.employees
  FOR UPDATE TO authenticated USING (
    public.is_admin_department_member(auth.uid(),'people_ops')
    OR public.is_admin_department_member(auth.uid(),'founder_office')
  );
CREATE POLICY "employees can update own first-login flags" ON public.employees
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Sessions
CREATE POLICY "employees can view own sessions" ON public.employee_sessions
  FOR SELECT TO authenticated USING (
    employee_id = public.get_current_employee_id()
    OR public.is_admin_department_member(auth.uid(),'security')
    OR public.is_admin_department_member(auth.uid(),'founder_office')
  );
CREATE POLICY "employees can insert own sessions" ON public.employee_sessions
  FOR INSERT TO authenticated WITH CHECK (employee_id = public.get_current_employee_id());
CREATE POLICY "session revocation" ON public.employee_sessions
  FOR UPDATE TO authenticated USING (
    employee_id = public.get_current_employee_id()
    OR public.is_admin_department_member(auth.uid(),'security')
    OR public.is_admin_department_member(auth.uid(),'founder_office')
  );

-- Devices
CREATE POLICY "employees can view own devices" ON public.employee_devices
  FOR SELECT TO authenticated USING (
    employee_id = public.get_current_employee_id()
    OR public.is_admin_department_member(auth.uid(),'security')
    OR public.is_admin_department_member(auth.uid(),'founder_office')
  );
CREATE POLICY "employees can insert own devices" ON public.employee_devices
  FOR INSERT TO authenticated WITH CHECK (employee_id = public.get_current_employee_id());
CREATE POLICY "employees can update own devices" ON public.employee_devices
  FOR UPDATE TO authenticated USING (employee_id = public.get_current_employee_id())
  WITH CHECK (employee_id = public.get_current_employee_id());

-- Audit logs: insert by any active employee, read by security + founder office + own actions
CREATE POLICY "active employees can insert audit logs" ON public.admin_audit_logs
  FOR INSERT TO authenticated WITH CHECK (
    public.is_active_employee(auth.uid())
    AND actor_user_id = auth.uid()
  );
CREATE POLICY "audit logs readable by owner/security/founders" ON public.admin_audit_logs
  FOR SELECT TO authenticated USING (
    actor_user_id = auth.uid()
    OR public.is_admin_department_member(auth.uid(),'security')
    OR public.is_admin_department_member(auth.uid(),'founder_office')
  );
-- No UPDATE / DELETE policies → append-only.

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE TRIGGER trg_admin_departments_updated BEFORE UPDATE ON public.admin_departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_admin_roles_updated BEFORE UPDATE ON public.admin_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SEED DATA — departments, roles, permissions, role→permission
-- ============================================================

-- Departments
INSERT INTO public.admin_departments (key, name, description) VALUES
  ('founder_office',   'Founder Office',      'Executive governance and overrides'),
  ('people_ops',       'People Operations',   'HR, onboarding, employee lifecycle'),
  ('trust_safety',     'Trust & Safety',      'Content moderation, reports, appeals'),
  ('verification',     'Verification',        'Identity and account verification'),
  ('finance',          'Finance',             'Payments, payouts, ledgers, tax'),
  ('support',          'Support',             'User support and internal tickets'),
  ('engineering',      'Engineering',         'Platform and product engineering'),
  ('security',         'Security',            'Access, audit, incident response'),
  ('organizations',    'Organizations',       'Workspace and org operations'),
  ('creator_success',  'Creator Success',     'Creator growth and enablement'),
  ('ados',             'ADOS',                'Aurelix Distribution & Ops System'),
  ('ads',              'Ads & Business',      'Ads platform and business tools')
ON CONFLICT (key) DO NOTHING;

-- Roles
INSERT INTO public.admin_roles (key, name, description, priority) VALUES
  ('founder',          'Founder',              'Full platform authority', 1),
  ('co_founder',       'Co-Founder',           'Founder-level authority', 5),
  ('department_head',  'Department Head',      'Owns a department',       10),
  ('manager',          'Manager',              'Manages a team',          30),
  ('employee',         'Employee',             'Standard employee',       100),
  ('read_only',        'Read-Only',            'View-only access',        900)
ON CONFLICT (key) DO NOTHING;

-- Permissions (view + manage per module, plus platform actions)
INSERT INTO public.admin_permissions (module, permission_key, name, description) VALUES
  -- Admin OS shell
  ('admin_os',         'admin_os.access',              'Access Admin OS',              'Enter the Admin OS workspace'),
  -- People Ops
  ('people_ops',       'people_ops.employees.view',    'View Employees',               'View employee directory'),
  ('people_ops',       'people_ops.employees.manage',  'Manage Employees',             'Create, edit, offboard employees'),
  -- Trust & Safety
  ('trust_safety',     'trust_safety.reports.view',    'View Reports',                 'View user reports'),
  ('trust_safety',     'trust_safety.reports.act',     'Act on Reports',               'Take moderation actions'),
  -- Verification
  ('verification',     'verification.requests.view',   'View Verification Requests',   'View pending verification requests'),
  ('verification',     'verification.requests.act',    'Decide Verification',          'Approve or reject verifications'),
  -- Finance
  ('finance',          'finance.payouts.view',         'View Payouts',                 'View payout ledger'),
  ('finance',          'finance.payouts.approve',      'Approve Payouts',              'Approve creator payouts'),
  -- Support
  ('support',          'support.tickets.view',         'View Tickets',                 'View support tickets'),
  ('support',          'support.tickets.act',          'Respond to Tickets',           'Reply / resolve tickets'),
  -- Engineering
  ('engineering',      'engineering.tools.view',       'View Engineering Tools',       'Internal tooling access'),
  -- Security
  ('security',         'security.audit.view',          'View Audit Logs',              'Read admin audit trail'),
  ('security',         'security.sessions.revoke',     'Revoke Sessions',              'Revoke employee sessions'),
  -- Organizations (workspace admin)
  ('organizations',    'organizations.view',           'View Organizations',           'View orgs on the platform'),
  ('organizations',    'organizations.manage',         'Manage Organizations',         'Manage orgs at platform level'),
  -- Creator Success
  ('creator_success',  'creator_success.view',         'View Creator Success',         'View creator success dashboards'),
  -- ADOS
  ('ados',             'ados.view',                    'View ADOS',                    'ADOS dashboards'),
  -- Ads
  ('ads',              'ads.view',                     'View Ads',                     'View ads platform metrics'),
  -- Founder Office
  ('founder_office',   'founder_office.access',        'Founder Console',              'Access the Founder Console'),
  ('founder_office',   'founder_office.overrides',     'Critical Overrides',           'Perform emergency overrides')
ON CONFLICT (permission_key) DO NOTHING;

-- Role → Permission mappings
-- Founder & Co-Founder: everything
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.key IN ('founder','co_founder')
ON CONFLICT DO NOTHING;

-- Department Head: admin_os.access + everything in their (any) department view/manage.
-- Kept generic: they get view+manage on ALL modules by default; can be tuned per-department later.
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.key = 'department_head'
  AND p.permission_key <> 'founder_office.overrides'
ON CONFLICT DO NOTHING;

-- Manager: admin_os.access + view on all modules, act on trust_safety/support/verification.
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.key = 'manager'
  AND (
    p.permission_key = 'admin_os.access'
    OR p.permission_key LIKE '%.view'
    OR p.permission_key IN (
      'trust_safety.reports.act','support.tickets.act','verification.requests.act'
    )
  )
ON CONFLICT DO NOTHING;

-- Employee: admin_os.access + generic view permissions on their working modules.
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.key = 'employee'
  AND (
    p.permission_key = 'admin_os.access'
    OR p.permission_key IN (
      'people_ops.employees.view',
      'trust_safety.reports.view',
      'verification.requests.view',
      'support.tickets.view',
      'organizations.view',
      'creator_success.view',
      'ados.view',
      'ads.view'
    )
  )
ON CONFLICT DO NOTHING;

-- Read-Only: admin_os.access + every *.view permission.
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.key = 'read_only'
  AND (p.permission_key = 'admin_os.access' OR p.permission_key LIKE '%.view')
ON CONFLICT DO NOTHING;
