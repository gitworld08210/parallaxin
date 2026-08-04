GRANT SELECT ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
GRANT SELECT ON public.admin_roles TO authenticated;
GRANT ALL ON public.admin_roles TO service_role;
GRANT SELECT ON public.admin_departments TO authenticated;
GRANT ALL ON public.admin_departments TO service_role;
GRANT SELECT ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;
GRANT SELECT ON public.admin_role_permissions TO authenticated;
GRANT ALL ON public.admin_role_permissions TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.coin_topup_requests TO authenticated;
GRANT ALL ON public.coin_topup_requests TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.aap_credit_applications TO authenticated;
GRANT ALL ON public.aap_credit_applications TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.aap_advertisers TO authenticated;
GRANT ALL ON public.aap_advertisers TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.aap_invoices TO authenticated;
GRANT ALL ON public.aap_invoices TO service_role;