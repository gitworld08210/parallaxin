
-- 1. Rewrite org_update_department with JSONB patch semantics + cycle detection.
DROP FUNCTION IF EXISTS public.org_update_department(uuid, text, text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.org_update_department(
  _department_id uuid,
  _patch jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
  _old jsonb;
  _new jsonb;
  _new_parent uuid;
  _clean_name text;
  _has_cycle boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF _patch IS NULL OR jsonb_typeof(_patch) <> 'object' THEN
    RAISE EXCEPTION 'patch object required' USING ERRCODE='22023';
  END IF;

  SELECT organization_id INTO _org FROM public.organization_departments WHERE id = _department_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'department not found' USING ERRCODE='42704'; END IF;
  IF NOT (public.has_org_permission(_uid, _org, 'departments.update')
          OR public.has_org_permission(_uid, _org, 'departments.edit')) THEN
    RAISE EXCEPTION 'permission denied: departments.update' USING ERRCODE='42501';
  END IF;

  -- Validate name if present
  IF _patch ? 'name' THEN
    _clean_name := nullif(trim(_patch->>'name'), '');
    IF _clean_name IS NULL THEN
      RAISE EXCEPTION 'name cannot be empty' USING ERRCODE='22023';
    END IF;
  END IF;

  -- Validate + cycle-check parent if present
  IF _patch ? 'parent_department_id' THEN
    IF jsonb_typeof(_patch->'parent_department_id') = 'null' THEN
      _new_parent := NULL;
    ELSE
      _new_parent := (_patch->>'parent_department_id')::uuid;
      IF _new_parent = _department_id THEN
        RAISE EXCEPTION 'department cannot be its own parent' USING ERRCODE='22023';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.organization_departments
        WHERE id = _new_parent AND organization_id = _org
      ) THEN
        RAISE EXCEPTION 'parent department not in organization' USING ERRCODE='22023';
      END IF;

      -- Recursive cycle detection: walk parents of _new_parent; if any equals
      -- _department_id, moving would create a cycle.
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_department_id
        FROM public.organization_departments WHERE id = _new_parent
        UNION ALL
        SELECT d.id, d.parent_department_id
        FROM public.organization_departments d
        JOIN ancestors a ON a.parent_department_id = d.id
      )
      SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = _department_id) INTO _has_cycle;
      IF _has_cycle THEN
        RAISE EXCEPTION 'moving department would create a cycle' USING ERRCODE='22023';
      END IF;
    END IF;
  END IF;

  SELECT to_jsonb(d) INTO _old FROM public.organization_departments d WHERE id = _department_id;

  UPDATE public.organization_departments SET
    name        = CASE WHEN _patch ? 'name' THEN _clean_name ELSE name END,
    description = CASE WHEN _patch ? 'description' THEN NULLIF(_patch->>'description','') ELSE description END,
    color       = CASE WHEN _patch ? 'color' THEN NULLIF(_patch->>'color','') ELSE color END,
    icon        = CASE WHEN _patch ? 'icon' THEN NULLIF(_patch->>'icon','') ELSE icon END,
    parent_department_id = CASE WHEN _patch ? 'parent_department_id' THEN _new_parent ELSE parent_department_id END,
    updated_at  = now()
  WHERE id = _department_id;

  SELECT to_jsonb(d) INTO _new FROM public.organization_departments d WHERE id = _department_id;
  PERFORM public.write_org_audit_log(_org, 'department.update', 'department', _department_id, _old, _new);
END $$;

GRANT EXECUTE ON FUNCTION public.org_update_department(uuid, jsonb) TO authenticated;

-- 2. Rewrite org_update_settings: JSONB patch + hardened slug handling.
DROP FUNCTION IF EXISTS public.org_update_settings(uuid, text, text, text, text, text, text, text, text, text, text, text[]);

-- Reserved slugs (kept short + PL/pgSQL-local for easy edits)
CREATE OR REPLACE FUNCTION public._org_slug_is_reserved(_slug text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT _slug = ANY (ARRAY[
    'admin','administrator','api','app','auth','billing','create','dashboard',
    'help','home','login','logout','new','organization','organizations',
    'root','settings','signin','signup','support','system','www'
  ]);
$$;

CREATE OR REPLACE FUNCTION public.org_update_settings(
  _organization_id uuid,
  _patch jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _old_org jsonb; _new_org jsonb; _old_st jsonb; _new_st jsonb;
  _new_slug text;
  _new_name text;
  _new_type text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF _patch IS NULL OR jsonb_typeof(_patch) <> 'object' THEN
    RAISE EXCEPTION 'patch object required' USING ERRCODE='22023';
  END IF;
  IF NOT public.has_org_permission(_uid, _organization_id, 'settings.update') THEN
    RAISE EXCEPTION 'permission denied: settings.update' USING ERRCODE='42501';
  END IF;

  -- Slug hardening
  IF _patch ? 'slug' THEN
    _new_slug := lower(trim(coalesce(_patch->>'slug', '')));
    IF _new_slug IS NULL OR length(_new_slug) = 0 THEN
      RAISE EXCEPTION 'slug cannot be empty' USING ERRCODE='22023';
    END IF;
    IF length(_new_slug) < 3 OR length(_new_slug) > 32 THEN
      RAISE EXCEPTION 'slug must be 3-32 characters' USING ERRCODE='22023';
    END IF;
    IF _new_slug !~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$' THEN
      RAISE EXCEPTION 'slug may only contain lowercase letters, numbers, and single hyphens' USING ERRCODE='22023';
    END IF;
    IF public._org_slug_is_reserved(_new_slug) THEN
      RAISE EXCEPTION 'that slug is reserved' USING ERRCODE='22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.organizations WHERE slug = _new_slug AND id <> _organization_id
    ) THEN
      RAISE EXCEPTION 'that slug is already in use' USING ERRCODE='23505';
    END IF;
  END IF;

  -- Validate name if present
  IF _patch ? 'name' THEN
    _new_name := nullif(trim(_patch->>'name'), '');
    IF _new_name IS NULL THEN
      RAISE EXCEPTION 'name cannot be empty' USING ERRCODE='22023';
    END IF;
  END IF;

  -- Validate org_type if present (nullable via explicit JSON null)
  IF _patch ? 'org_type' AND jsonb_typeof(_patch->'org_type') <> 'null' THEN
    _new_type := _patch->>'org_type';
  END IF;

  SELECT to_jsonb(o) INTO _old_org FROM public.organizations o WHERE id = _organization_id;
  SELECT to_jsonb(s) INTO _old_st FROM public.organization_settings s WHERE organization_id = _organization_id;

  UPDATE public.organizations SET
    name        = CASE WHEN _patch ? 'name'        THEN _new_name              ELSE name        END,
    slug        = CASE WHEN _patch ? 'slug'        THEN _new_slug              ELSE slug        END,
    description = CASE WHEN _patch ? 'description' THEN NULLIF(_patch->>'description','') ELSE description END,
    logo_url    = CASE WHEN _patch ? 'logo_url'    THEN NULLIF(_patch->>'logo_url','')    ELSE logo_url    END,
    cover_url   = CASE WHEN _patch ? 'cover_url'   THEN NULLIF(_patch->>'cover_url','')   ELSE cover_url   END,
    website     = CASE WHEN _patch ? 'website'     THEN NULLIF(_patch->>'website','')     ELSE website     END,
    email       = CASE WHEN _patch ? 'email'       THEN NULLIF(_patch->>'email','')       ELSE email       END,
    org_type    = CASE WHEN _patch ? 'org_type'    THEN coalesce(_new_type::org_type, org_type) ELSE org_type END,
    updated_at  = now()
  WHERE id = _organization_id;

  -- Ensure a settings row exists before updating
  INSERT INTO public.organization_settings (organization_id) VALUES (_organization_id)
  ON CONFLICT (organization_id) DO NOTHING;

  UPDATE public.organization_settings SET
    timezone        = CASE WHEN _patch ? 'timezone'        THEN NULLIF(_patch->>'timezone','')   ELSE timezone   END,
    visibility      = CASE WHEN _patch ? 'visibility'      THEN _patch->>'visibility'            ELSE visibility END,
    enabled_modules = CASE
      WHEN _patch ? 'enabled_modules' AND jsonb_typeof(_patch->'enabled_modules') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'enabled_modules'))
      ELSE enabled_modules
    END,
    updated_at      = now()
  WHERE organization_id = _organization_id;

  SELECT to_jsonb(o) INTO _new_org FROM public.organizations o WHERE id = _organization_id;
  SELECT to_jsonb(s) INTO _new_st  FROM public.organization_settings s WHERE organization_id = _organization_id;

  PERFORM public.write_org_audit_log(
    _organization_id, 'settings.update', 'organization', _organization_id,
    jsonb_build_object('organization', _old_org, 'settings', _old_st),
    jsonb_build_object('organization', _new_org, 'settings', _new_st)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.org_update_settings(uuid, jsonb) TO authenticated;

-- 3. Aggregate action for department member counts (server-side).
CREATE OR REPLACE FUNCTION public.org_department_member_counts(_organization_id uuid)
RETURNS TABLE(department_id uuid, member_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT om.department_id, count(*)::bigint
  FROM public.organization_members om
  WHERE om.organization_id = _organization_id
    AND om.status = 'active'
    AND om.department_id IS NOT NULL
    AND public.is_organization_member(_organization_id)
  GROUP BY om.department_id;
$$;

GRANT EXECUTE ON FUNCTION public.org_department_member_counts(uuid) TO authenticated;
