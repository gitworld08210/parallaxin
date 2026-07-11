
CREATE OR REPLACE FUNCTION public.org_cancel_invite(_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _inv public.organization_invites%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  SELECT * INTO _inv FROM public.organization_invites WHERE id = _invite_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invite not found' USING ERRCODE='P0002'; END IF;

  -- Allow cancellation by the inviter or anyone with members.invite permission.
  IF _inv.invited_by <> _uid
     AND NOT public.has_org_permission(_uid, _inv.organization_id, 'members.invite') THEN
    RAISE EXCEPTION 'permission denied: members.invite' USING ERRCODE='42501';
  END IF;

  IF _inv.status <> 'pending' THEN RETURN; END IF;

  DELETE FROM public.organization_invites WHERE id = _inv.id;

  PERFORM public.write_org_audit_log(
    _inv.organization_id, 'member.invite_cancelled', 'invite', _inv.id,
    jsonb_build_object('email', _inv.email, 'username', _inv.username), NULL
  );
END $$;

CREATE OR REPLACE FUNCTION public.org_transfer_ownership(_organization_id uuid, _new_owner_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _current_owner uuid;
  _new_member_id uuid;
  _owner_role_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;

  SELECT owner_user_id INTO _current_owner FROM public.organizations WHERE id = _organization_id;
  IF _current_owner IS NULL THEN RAISE EXCEPTION 'organization not found' USING ERRCODE='P0002'; END IF;
  IF _current_owner <> _uid THEN
    RAISE EXCEPTION 'only current owner can transfer ownership' USING ERRCODE='42501';
  END IF;
  IF _new_owner_user_id = _current_owner THEN RETURN; END IF;

  SELECT id INTO _new_member_id FROM public.organization_members
    WHERE organization_id = _organization_id AND user_id = _new_owner_user_id AND status = 'active';
  IF _new_member_id IS NULL THEN
    RAISE EXCEPTION 'new owner must be an active member' USING ERRCODE='P0002';
  END IF;

  UPDATE public.organizations SET owner_user_id = _new_owner_user_id WHERE id = _organization_id;

  SELECT id INTO _owner_role_id FROM public.organization_roles
    WHERE organization_id = _organization_id AND name = 'Owner' LIMIT 1;
  IF _owner_role_id IS NOT NULL THEN
    INSERT INTO public.organization_member_roles (member_id, role_id)
    VALUES (_new_member_id, _owner_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  PERFORM public.write_org_audit_log(
    _organization_id, 'organization.ownership_transferred', 'organization', _organization_id,
    jsonb_build_object('previous_owner', _current_owner),
    jsonb_build_object('new_owner', _new_owner_user_id)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.org_cancel_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_transfer_ownership(uuid, uuid) TO authenticated;
