CREATE OR REPLACE FUNCTION public.has_admin_permission(_uid uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.admin_role_permissions rp ON rp.role_id = e.role_id
    JOIN public.admin_permissions p ON p.id = rp.permission_id
    WHERE e.user_id = _uid
      AND e.employment_status IN ('active','on_leave','joining_today')
      AND p.permission_key = _permission_key
  ) OR (
    _permission_key = 'finance.payouts.view'
    AND public.wallet_is_finance(_uid)
  );
$$;

CREATE OR REPLACE FUNCTION public.aap_is_finance()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.wallet_is_finance(auth.uid()), false);
$$;

REVOKE ALL ON FUNCTION public.wallet_is_finance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_is_finance(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_admin_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.aap_is_finance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aap_is_finance() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.finance_review_coin_topup(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finance_review_coin_topup(uuid, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.aap_finance_approve_credit(uuid, numeric, text, text, numeric, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aap_finance_approve_credit(uuid, numeric, text, text, numeric, text, boolean, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.aap_finance_reject_credit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aap_finance_reject_credit(uuid, text) TO authenticated, service_role;