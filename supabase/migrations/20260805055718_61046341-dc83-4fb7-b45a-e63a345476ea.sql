CREATE OR REPLACE FUNCTION public.vw_is_reviewer(_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _uid IS NOT NULL AND (
    public.is_admin_department_member(_uid, 'verification')
    OR public.is_admin_department_member(_uid, 'founder_office')
    OR public.is_admin_department_member(_uid, 'trust_safety')
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      LEFT JOIN public.admin_roles r ON r.id = e.role_id
      WHERE e.user_id = _uid
        AND e.employment_status IN ('active', 'on_leave', 'joining_today')
        AND (
          e.user_type IN ('founder', 'co_founder')
          OR r.key IN ('founder', 'co_founder', 'platform_admin')
        )
    )
  );
$$;

REVOKE ALL ON FUNCTION public.vw_is_reviewer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vw_is_reviewer(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_finance_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.admin_departments d ON d.id = e.department_id
    WHERE e.user_id = _user_id
      AND e.employment_status IN ('active', 'on_leave', 'joining_today')
      AND d.key IN ('finance', 'finance_legal', 'legal', 'compliance', 'procurement')
    )
    OR public.has_role(_user_id, 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_finance_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_finance_staff(uuid) TO authenticated, service_role;