-- Helper: is the given user an Aurelix Admin OS account?
-- (An "admin OS account" is any user with an employee row whose company
--  email ends in @aurelix.com.)
CREATE OR REPLACE FUNCTION public.is_admin_os_account(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = _user_id
      AND lower(e.company_email) LIKE '%@aurelix.com'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_os_account(uuid) TO anon, authenticated;

-- Replace the "everyone can see all profiles" policy with one that hides
-- Admin OS accounts from non-admin end users.
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;

CREATE POLICY profiles_select_visible
  ON public.profiles
  FOR SELECT
  USING (
    -- Own profile is always visible
    auth.uid() = user_id
    -- Non-admin profiles are visible to everyone
    OR NOT public.is_admin_os_account(user_id)
    -- Admin OS members can see each other
    OR public.is_admin_os_account(auth.uid())
  );