
REVOKE EXECUTE ON FUNCTION public.current_employee_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_passports(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.passport_log_event(uuid, public.passport_event_type, text, text, jsonb) FROM PUBLIC, anon;
