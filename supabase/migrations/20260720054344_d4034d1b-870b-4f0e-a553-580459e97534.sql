-- 1. Revoke ghost admin roles (gmail-based accounts should never hold admin)
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id IN (
    SELECT id FROM auth.users
    WHERE email ILIKE '%@gmail.com'
  );

-- 2. Auto-cleanup trigger: when an auth user is deleted, drop their roles
CREATE OR REPLACE FUNCTION public.cleanup_user_roles_on_auth_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted_cleanup_roles ON auth.users;
CREATE TRIGGER on_auth_user_deleted_cleanup_roles
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_user_roles_on_auth_delete();