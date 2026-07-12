
REVOKE EXECUTE ON FUNCTION public.get_current_employee_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_current_employment_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_active_employee(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_department_member(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_employment_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_employee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_department_member(uuid, text) TO authenticated;
