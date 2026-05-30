REVOKE EXECUTE ON FUNCTION public.match_posts_for_user(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_posts_for_user(uuid, int) TO authenticated, service_role;