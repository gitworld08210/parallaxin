
-- Fix: invitees couldn't read their own organization_invites row because the
-- existing SELECT policy only allowed existing organization members.
-- 1) Broaden SELECT so the invitee (matched by email or username) can read too.
-- 2) Add a SECURITY DEFINER RPC to fetch an invite by token with joined data,
--    so the /invite/:token page works no matter what RLS says.
-- 3) Add a SECURITY DEFINER RPC to list pending invites addressed to the
--    signed-in user, so the notifications banner works.

-- 1. Broaden SELECT policy
DROP POLICY IF EXISTS organization_invites_select_policy ON public.organization_invites;
CREATE POLICY organization_invites_select_policy
  ON public.organization_invites
  FOR SELECT
  USING (
    public.is_organization_member(organization_id)
    OR invited_by = auth.uid()
    OR (email IS NOT NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
    OR (username IS NOT NULL AND username = (
      SELECT username FROM public.profiles WHERE user_id = auth.uid()
    ))
  );

-- 2. get_organization_invite_by_token — used by /invite/:token
CREATE OR REPLACE FUNCTION public.get_organization_invite_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  invited_by uuid,
  email text,
  username text,
  role_id uuid,
  invite_token uuid,
  status text,
  expires_at timestamptz,
  created_at timestamptz,
  organization_name text,
  organization_slug text,
  organization_logo_url text,
  organization_description text,
  organization_verified boolean,
  organization_member_count int,
  inviter_user_id uuid,
  inviter_username text,
  inviter_display_name text,
  inviter_avatar_url text,
  role_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.organization_id,
    i.invited_by,
    i.email,
    i.username,
    i.role_id,
    i.invite_token,
    i.status::text,
    i.expires_at,
    i.created_at,
    o.name,
    o.slug,
    o.logo_url,
    o.description,
    o.verified,
    o.member_count,
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    r.name
  FROM public.organization_invites i
  LEFT JOIN public.organizations o ON o.id = i.organization_id
  LEFT JOIN public.profiles p ON p.user_id = i.invited_by
  LEFT JOIN public.organization_roles r ON r.id = i.role_id
  WHERE i.invite_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_organization_invite_by_token(uuid) TO authenticated;

-- 3. list_incoming_organization_invites — used by Notifications banner
CREATE OR REPLACE FUNCTION public.list_incoming_organization_invites()
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  invited_by uuid,
  email text,
  username text,
  role_id uuid,
  invite_token uuid,
  status text,
  expires_at timestamptz,
  created_at timestamptz,
  organization_name text,
  organization_slug text,
  organization_logo_url text,
  inviter_username text,
  inviter_display_name text,
  inviter_avatar_url text,
  role_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  _username text;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT p.username INTO _username FROM public.profiles p WHERE p.user_id = _uid;

  RETURN QUERY
  SELECT
    i.id,
    i.organization_id,
    i.invited_by,
    i.email,
    i.username,
    i.role_id,
    i.invite_token,
    i.status::text,
    i.expires_at,
    i.created_at,
    o.name,
    o.slug,
    o.logo_url,
    p.username,
    p.display_name,
    p.avatar_url,
    r.name
  FROM public.organization_invites i
  LEFT JOIN public.organizations o ON o.id = i.organization_id
  LEFT JOIN public.profiles p ON p.user_id = i.invited_by
  LEFT JOIN public.organization_roles r ON r.id = i.role_id
  WHERE i.status = 'pending'
    AND i.expires_at > now()
    AND (
      (i.email IS NOT NULL AND _email <> '' AND lower(i.email) = _email)
      OR (i.username IS NOT NULL AND _username IS NOT NULL AND i.username = _username)
    )
  ORDER BY i.created_at DESC;
END $$;

GRANT EXECUTE ON FUNCTION public.list_incoming_organization_invites() TO authenticated;
