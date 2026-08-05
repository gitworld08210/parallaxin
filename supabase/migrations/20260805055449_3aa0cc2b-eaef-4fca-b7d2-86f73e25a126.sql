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
    OR public.is_admin_department_member(_uid, 'founder-office')
    OR public.is_admin_department_member(_uid, 'trust-safety')
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      LEFT JOIN public.admin_roles r ON r.id = e.role_id
      WHERE e.user_id = _uid
        AND e.employment_status = 'active'
        AND (
          e.user_type IN ('founder', 'co_founder')
          OR r.key IN ('founder', 'co_founder', 'platform_admin')
        )
    )
  );
$$;

REVOKE ALL ON FUNCTION public.vw_is_reviewer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vw_is_reviewer(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.vw_decide_application(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vw_decide_application(uuid, boolean, text) TO authenticated, service_role;