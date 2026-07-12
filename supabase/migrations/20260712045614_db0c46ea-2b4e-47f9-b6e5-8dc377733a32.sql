
-- ============================================================
-- Phase 2.2 — Employee Onboarding & Account Provisioning
-- ============================================================

-- Onboarding stage enum
DO $$ BEGIN
  CREATE TYPE public.onboarding_stage AS ENUM (
    'draft',
    'hr_review',
    'background_check',
    'account_provisioning',
    'credentials_generated',
    'welcome_sent',
    'awaiting_first_login',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.checklist_owner AS ENUM ('hr', 'employee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- onboarding_sessions ----------
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  stage public.onboarding_stage NOT NULL DEFAULT 'draft',
  hr_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joining_date date,
  background_check_required boolean NOT NULL DEFAULT false,
  background_check_cleared_at timestamptz,
  hr_notes text,
  activated_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_sessions TO authenticated;
GRANT ALL ON public.onboarding_sessions TO service_role;
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr can read onboarding sessions"
  ON public.onboarding_sessions FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'people_ops.employees.view'));

CREATE POLICY "hr can write onboarding sessions"
  ON public.onboarding_sessions FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'people_ops.employees.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'people_ops.employees.manage'));

CREATE TRIGGER trg_onb_sessions_updated_at
  BEFORE UPDATE ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- employee_onboarding_checklist ----------
CREATE TABLE IF NOT EXISTS public.employee_onboarding_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  owner public.checklist_owner NOT NULL,
  item_key text NOT NULL,
  label text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, owner, item_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_onboarding_checklist TO authenticated;
GRANT ALL ON public.employee_onboarding_checklist TO service_role;
ALTER TABLE public.employee_onboarding_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr can read all checklists"
  ON public.employee_onboarding_checklist FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'people_ops.employees.view'));

CREATE POLICY "employee can read own checklist"
  ON public.employee_onboarding_checklist FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "hr can write checklists"
  ON public.employee_onboarding_checklist FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'people_ops.employees.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'people_ops.employees.manage'));

CREATE TRIGGER trg_onb_checklist_updated_at
  BEFORE UPDATE ON public.employee_onboarding_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- employee_manager_history ----------
CREATE TABLE IF NOT EXISTS public.employee_manager_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  previous_manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  new_manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  reason text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.employee_manager_history TO authenticated;
GRANT ALL ON public.employee_manager_history TO service_role;
ALTER TABLE public.employee_manager_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr reads manager history"
  ON public.employee_manager_history FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'people_ops.employees.view'));

CREATE POLICY "hr writes manager history"
  ON public.employee_manager_history FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission(auth.uid(), 'people_ops.employees.manage'));

CREATE INDEX ON public.employee_manager_history (employee_id, changed_at DESC);

-- ---------- employee_credential_issuances ----------
CREATE TABLE IF NOT EXISTS public.employee_credential_issuances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.employee_credential_issuances TO authenticated;
GRANT ALL ON public.employee_credential_issuances TO service_role;
ALTER TABLE public.employee_credential_issuances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr reads credential issuances"
  ON public.employee_credential_issuances FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'people_ops.employees.manage'));

CREATE POLICY "hr writes credential issuances"
  ON public.employee_credential_issuances FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission(auth.uid(), 'people_ops.employees.manage'));

CREATE POLICY "hr updates credential issuances"
  ON public.employee_credential_issuances FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'people_ops.employees.manage'));

CREATE INDEX ON public.employee_credential_issuances (employee_id, issued_at DESC);

-- ---------- welcome_email_history ----------
CREATE TABLE IF NOT EXISTS public.welcome_email_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.onboarding_sessions(id) ON DELETE SET NULL,
  sent_to text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.welcome_email_history TO authenticated;
GRANT ALL ON public.welcome_email_history TO service_role;
ALTER TABLE public.welcome_email_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr reads welcome email history"
  ON public.welcome_email_history FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'people_ops.employees.view'));

CREATE POLICY "hr writes welcome email history"
  ON public.welcome_email_history FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission(auth.uid(), 'people_ops.employees.manage'));

CREATE INDEX ON public.welcome_email_history (employee_id, sent_at DESC);

-- ---------- Helper: generate next employee number ----------
CREATE OR REPLACE FUNCTION public.generate_employee_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_seq int;
  candidate text;
BEGIN
  IF NOT public.has_admin_permission(auth.uid(), 'people_ops.employees.manage') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  LOOP
    SELECT COALESCE(
      MAX(NULLIF(regexp_replace(employee_number, '^AUR-', ''), '')::int),
      0
    ) + 1
    INTO next_seq
    FROM public.employees
    WHERE employee_number ~ '^AUR-\d+$';

    candidate := 'AUR-' || lpad(next_seq::text, 6, '0');

    IF NOT EXISTS (SELECT 1 FROM public.employees WHERE employee_number = candidate) THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_employee_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_employee_number() TO authenticated;

-- ---------- Helper: hash a temporary credential ----------
CREATE OR REPLACE FUNCTION public.hash_credential(_plain text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(_plain, 'sha256'), 'hex');
$$;
