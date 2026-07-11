
-- 1. enabled_modules on organization_settings
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS enabled_modules text[] NOT NULL
  DEFAULT ARRAY['dashboard','members','departments','roles','permissions','projects','tasks','ai','stories','reels','settings']::text[];

-- 2. Seed additional permissions
INSERT INTO public.organization_permissions (module, permission_key, name, description)
VALUES
  ('departments','departments.view','View departments','Read the department tree'),
  ('departments','departments.update','Update department','Edit department metadata'),
  ('departments','departments.delete','Delete department','Remove a department'),
  ('settings','settings.update','Update organization settings','Modify organization profile and workspace settings')
ON CONFLICT (permission_key) DO NOTHING;

-- Ensure existing departments.create + edit + settings.update wired to Owner/Administrator system roles for every org
INSERT INTO public.organization_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.organization_roles r
JOIN public.organization_permissions p ON p.permission_key IN
  ('departments.view','departments.create','departments.edit','departments.update','departments.delete','settings.update')
WHERE r.name IN ('Owner','Administrator')
ON CONFLICT DO NOTHING;

-- Members + Guests can view departments
INSERT INTO public.organization_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.organization_roles r
JOIN public.organization_permissions p ON p.permission_key = 'departments.view'
WHERE r.name IN ('Member','Guest')
ON CONFLICT DO NOTHING;

-- 3. Department CRUD RPCs

CREATE OR REPLACE FUNCTION public.org_create_department(
  _organization_id uuid,
  _name text,
  _description text DEFAULT NULL,
  _color text DEFAULT NULL,
  _icon text DEFAULT NULL,
  _parent_department_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _clean text := nullif(trim(_name), '');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF NOT public.has_org_permission(_uid, _organization_id, 'departments.create') THEN
    RAISE EXCEPTION 'permission denied: departments.create' USING ERRCODE='42501';
  END IF;
  IF _clean IS NULL THEN RAISE EXCEPTION 'name required' USING ERRCODE='22023'; END IF;
  IF _parent_department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_departments
    WHERE id = _parent_department_id AND organization_id = _organization_id
  ) THEN
    RAISE EXCEPTION 'parent department not in organization' USING ERRCODE='22023';
  END IF;

  INSERT INTO public.organization_departments
    (organization_id, name, description, color, icon, parent_department_id, created_by)
  VALUES (_organization_id, _clean, _description, _color, _icon, _parent_department_id, _uid)
  RETURNING id INTO _id;

  PERFORM public.write_org_audit_log(
    _organization_id, 'department.create', 'department', _id,
    NULL,
    jsonb_build_object('name', _clean, 'parent_department_id', _parent_department_id)
  );
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.org_update_department(
  _department_id uuid,
  _name text DEFAULT NULL,
  _description text DEFAULT NULL,
  _color text DEFAULT NULL,
  _icon text DEFAULT NULL,
  _parent_department_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
  _old jsonb;
  _new jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  SELECT organization_id INTO _org FROM public.organization_departments WHERE id = _department_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'department not found' USING ERRCODE='42704'; END IF;
  IF NOT (public.has_org_permission(_uid, _org, 'departments.update')
          OR public.has_org_permission(_uid, _org, 'departments.edit')) THEN
    RAISE EXCEPTION 'permission denied: departments.update' USING ERRCODE='42501';
  END IF;

  IF _parent_department_id IS NOT NULL THEN
    IF _parent_department_id = _department_id THEN
      RAISE EXCEPTION 'department cannot be its own parent' USING ERRCODE='22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_departments
      WHERE id = _parent_department_id AND organization_id = _org
    ) THEN
      RAISE EXCEPTION 'parent department not in organization' USING ERRCODE='22023';
    END IF;
  END IF;

  SELECT to_jsonb(d) INTO _old FROM public.organization_departments d WHERE id = _department_id;

  UPDATE public.organization_departments
  SET name = coalesce(nullif(trim(_name), ''), name),
      description = coalesce(_description, description),
      color = coalesce(_color, color),
      icon = coalesce(_icon, icon),
      parent_department_id = _parent_department_id,
      updated_at = now()
  WHERE id = _department_id;

  SELECT to_jsonb(d) INTO _new FROM public.organization_departments d WHERE id = _department_id;
  PERFORM public.write_org_audit_log(_org, 'department.update', 'department', _department_id, _old, _new);
END $$;

CREATE OR REPLACE FUNCTION public.org_delete_department(_department_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
  _old jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  SELECT organization_id INTO _org FROM public.organization_departments WHERE id = _department_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'department not found' USING ERRCODE='42704'; END IF;
  IF NOT public.has_org_permission(_uid, _org, 'departments.delete') THEN
    RAISE EXCEPTION 'permission denied: departments.delete' USING ERRCODE='42501';
  END IF;

  SELECT to_jsonb(d) INTO _old FROM public.organization_departments d WHERE id = _department_id;

  -- Detach children and members
  UPDATE public.organization_departments SET parent_department_id = NULL WHERE parent_department_id = _department_id;
  UPDATE public.organization_members SET department_id = NULL WHERE department_id = _department_id;
  DELETE FROM public.organization_departments WHERE id = _department_id;

  PERFORM public.write_org_audit_log(_org, 'department.delete', 'department', _department_id, _old, NULL);
END $$;

CREATE OR REPLACE FUNCTION public.org_assign_member_department(
  _member_id uuid,
  _department_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
  _old_dept uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  SELECT organization_id, department_id INTO _org, _old_dept
    FROM public.organization_members WHERE id = _member_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'member not found' USING ERRCODE='42704'; END IF;
  IF NOT (public.has_org_permission(_uid, _org, 'departments.update')
          OR public.has_org_permission(_uid, _org, 'departments.edit')) THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE='42501';
  END IF;
  IF _department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_departments
    WHERE id = _department_id AND organization_id = _org
  ) THEN
    RAISE EXCEPTION 'department not in organization' USING ERRCODE='22023';
  END IF;

  UPDATE public.organization_members SET department_id = _department_id, updated_at = now()
  WHERE id = _member_id;

  PERFORM public.write_org_audit_log(
    _org, 'department.assign_member', 'department', _department_id,
    jsonb_build_object('member_id', _member_id, 'department_id', _old_dept),
    jsonb_build_object('member_id', _member_id, 'department_id', _department_id)
  );
END $$;

CREATE OR REPLACE FUNCTION public.org_remove_member_department(_member_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.org_assign_member_department(_member_id, NULL);
END $$;

-- 4. Settings + org profile update RPC (single transaction)

CREATE OR REPLACE FUNCTION public.org_update_settings(
  _organization_id uuid,
  _name text DEFAULT NULL,
  _slug text DEFAULT NULL,
  _description text DEFAULT NULL,
  _logo_url text DEFAULT NULL,
  _cover_url text DEFAULT NULL,
  _website text DEFAULT NULL,
  _email text DEFAULT NULL,
  _org_type text DEFAULT NULL,
  _timezone text DEFAULT NULL,
  _visibility text DEFAULT NULL,
  _enabled_modules text[] DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _old_org jsonb; _new_org jsonb; _old_st jsonb; _new_st jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF NOT public.has_org_permission(_uid, _organization_id, 'settings.update') THEN
    RAISE EXCEPTION 'permission denied: settings.update' USING ERRCODE='42501';
  END IF;

  SELECT to_jsonb(o) INTO _old_org FROM public.organizations o WHERE id = _organization_id;
  SELECT to_jsonb(s) INTO _old_st FROM public.organization_settings s WHERE organization_id = _organization_id;

  UPDATE public.organizations
  SET name        = coalesce(nullif(trim(_name), ''), name),
      slug        = coalesce(nullif(trim(_slug), ''), slug),
      description = coalesce(_description, description),
      logo_url    = coalesce(_logo_url, logo_url),
      cover_url   = coalesce(_cover_url, cover_url),
      website     = coalesce(_website, website),
      email       = coalesce(_email, email),
      org_type    = coalesce(_org_type::org_type, org_type),
      updated_at  = now()
  WHERE id = _organization_id;

  -- Ensure a settings row exists
  INSERT INTO public.organization_settings (organization_id)
  VALUES (_organization_id)
  ON CONFLICT (organization_id) DO NOTHING;

  UPDATE public.organization_settings
  SET timezone        = coalesce(_timezone, timezone),
      visibility      = coalesce(_visibility, visibility),
      enabled_modules = coalesce(_enabled_modules, enabled_modules),
      updated_at      = now()
  WHERE organization_id = _organization_id;

  SELECT to_jsonb(o) INTO _new_org FROM public.organizations o WHERE id = _organization_id;
  SELECT to_jsonb(s) INTO _new_st FROM public.organization_settings s WHERE organization_id = _organization_id;

  PERFORM public.write_org_audit_log(
    _organization_id, 'settings.update', 'organization', _organization_id,
    jsonb_build_object('organization', _old_org, 'settings', _old_st),
    jsonb_build_object('organization', _new_org, 'settings', _new_st)
  );
END $$;

-- Grants
GRANT EXECUTE ON FUNCTION public.org_create_department(uuid,text,text,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_update_department(uuid,text,text,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_delete_department(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_assign_member_department(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_remove_member_department(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_update_settings(uuid,text,text,text,text,text,text,text,text,text,text,text[]) TO authenticated;
