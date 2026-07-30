REVOKE EXECUTE ON FUNCTION public.aap_report_rows(uuid, text, date, date, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.aap_report_timeseries(uuid, date, date, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.aap_report_breakdown(uuid, date, date, text, uuid) FROM PUBLIC, anon;