
-- helper: is this role name a protected system role?
CREATE OR REPLACE FUNCTION public._org_is_system_role_name(_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(_name) IN ('owner','administrator','member','guest')
$$;

CREATE OR REPLACE FUNCTION public.org_create_role(
  _organization_id uuid,
  _name text,
  _description text DEFAULT NULL,
  _color text DEFAULT NULL,
  _priority integer DEFAULT 100
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role_id uuid;
  _clean_name text := nullif(trim(_name), '');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF NOT public.has_org_permission(_uid, _organization_id, 'roles.manage') THEN
    RAISE EXCEPTION 'permission denied: roles.manage' USING ERRCODE='42501';
  END IF;
  IF _clean_name IS NULL THEN RAISE EXCEPTION 'name required' USING ERRCODE='22023'; END IF;
  IF public._org_is_system_role_name(_clean_name) THEN
    RAISE EXCEPTION 'cannot use reserved system role name' USING ERRCODE='42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.organization_roles
    WHERE organization_id = _organization_id AND lower(name) = lower(_clean_name)
  ) THEN
    RAISE EXCEPTION 'role name already exists' USING ERRCODE='23505';
  END IF;

  INSERT INTO public.organization_roles
    (organization_id, name, description, color, priority, is_system, is_default, created_by)
  VALUES
    (_organization_id, _clean_name, _description, _color, coalesce(_priority, 100), false, false, _uid)
  RETURNING id INTO _role_id;

  PERFORM public.write_org_audit_log(
    _organization_id, 'role.created', 'role', _role_id,
    NULL, jsonb_build_object('name', _clean_name, 'priority', _priority)
  );
  RETURN _role_id;
END $$;

CREATE OR REPLACE FUNCTION public.org_update_role(
  _role_id uuid,
  _name text DEFAULT NULL,
  _description text DEFAULT NULL,
  _color text DEFAULT NULL,
  _priority integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role public.organization_roles%ROWTYPE;
  _new_name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  SELECT * INTO _role FROM public.organization_roles WHERE id = _role_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'role not found' USING ERRCODE='P0002'; END IF;
  IF NOT public.has_org_permission(_uid, _role.organization_id, 'roles.manage') THEN
    RAISE EXCEPTION 'permission denied: roles.manage' USING ERRCODE='42501';
  END IF;

  _new_name := nullif(trim(coalesce(_name, _role.name)), '');
  IF _new_name IS NULL THEN RAISE EXCEPTION 'name required' USING ERRCODE='22023'; END IF;

  IF _role.is_system AND lower(_new_name) <> lower(_role.name) THEN
    RAISE EXCEPTION 'cannot rename system role' USING ERRCODE='42501';
  END IF;
  IF (NOT _role.is_system) AND public._org_is_system_role_name(_new_name) THEN
    RAISE EXCEPTION 'cannot use reserved system role name' USING ERRCODE='42501';
  END IF;

  UPDATE public.organization_roles
     SET name        = _new_name,
         description = coalesce(_description, description),
         color       = coalesce(_color, color),
         priority    = CASE
                         WHEN lower(_role.name) = 'owner' THEN priority  -- owner priority frozen
                         ELSE coalesce(_priority, priority)
                       END,
         updated_at  = now()
   WHERE id = _role_id;

  PERFORM public.write_org_audit_log(
    _role.organization_id, 'role.updated', 'role', _role_id,
    jsonb_build_object('name', _role.name, 'priority', _role.priority),
    jsonb_build_object('name', _new_name, 'priority', _priority)
  );
END $$;

CREATE OR REPLACE FUNCTION public.org_delete_role(_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role public.organization_roles%ROWTYPE;
  _default_role_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  SELECT * INTO _role FROM public.organization_roles WHERE id = _role_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'role not found' USING ERRCODE='P0002'; END IF;
  IF NOT public.has_org_permission(_uid, _role.organization_id, 'roles.manage') THEN
    RAISE EXCEPTION 'permission denied: roles.manage' USING ERRCODE='42501';
  END IF;
  IF _role.is_system THEN
    RAISE EXCEPTION 'cannot delete system role' USING ERRCODE='42501';
  END IF;

  SELECT id INTO _default_role_id FROM public.organization_roles
   WHERE organization_id = _role.organization_id AND is_default = true LIMIT 1;
  IF _default_role_id IS NULL THEN
    SELECT id INTO _default_role_id FROM public.organization_roles
     WHERE organization_id = _role.organization_id AND lower(name) = 'member' LIMIT 1;
  END IF;

  -- Reassign affected members to the default role, then delete.
  IF _default_role_id IS NOT NULL THEN
    UPDATE public.organization_member_roles
       SET role_id = _default_role_id
     WHERE role_id = _role_id
       AND NOT EXISTS (
         SELECT 1 FROM public.organization_member_roles x
         WHERE x.member_id = organization_member_roles.member_id
           AND x.role_id = _default_role_id
       );
  END IF;

  DELETE FROM public.organization_role_permissions WHERE role_id = _role_id;
  DELETE FROM public.organization_member_roles WHERE role_id = _role_id;
  DELETE FROM public.organization_roles WHERE id = _role_id;

  PERFORM public.write_org_audit_log(
    _role.organization_id, 'role.deleted', 'role', _role_id,
    jsonb_build_object('name', _role.name), NULL
  );
END $$;

CREATE OR REPLACE FUNCTION public.org_set_role_permissions(
  _role_id uuid,
  _permission_keys text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role public.organization_roles%ROWTYPE;
  _old_keys jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  SELECT * INTO _role FROM public.organization_roles WHERE id = _role_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'role not found' USING ERRCODE='P0002'; END IF;
  IF NOT public.has_org_permission(_uid, _role.organization_id, 'roles.manage') THEN
    RAISE EXCEPTION 'permission denied: roles.manage' USING ERRCODE='42501';
  END IF;
  IF lower(_role.name) = 'owner' THEN
    RAISE EXCEPTION 'owner role permissions cannot be edited' USING ERRCODE='42501';
  END IF;

  SELECT coalesce(jsonb_agg(op.permission_key), '[]'::jsonb) INTO _old_keys
    FROM public.organization_role_permissions rp
    JOIN public.organization_permissions op ON op.id = rp.permission_id
   WHERE rp.role_id = _role_id;

  DELETE FROM public.organization_role_permissions WHERE role_id = _role_id;

  IF _permission_keys IS NOT NULL AND array_length(_permission_keys, 1) > 0 THEN
    INSERT INTO public.organization_role_permissions (role_id, permission_id)
    SELECT _role_id, op.id
      FROM public.organization_permissions op
     WHERE op.permission_key = ANY(_permission_keys)
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.organization_roles SET updated_at = now() WHERE id = _role_id;

  PERFORM public.write_org_audit_log(
    _role.organization_id, 'role.permissions_updated', 'role', _role_id,
    jsonb_build_object('permissions', _old_keys),
    jsonb_build_object('permissions', to_jsonb(_permission_keys))
  );
END $$;

GRANT EXECUTE ON FUNCTION public.org_create_role(uuid, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_update_role(uuid, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_delete_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_set_role_permissions(uuid, text[]) TO authenticated;
