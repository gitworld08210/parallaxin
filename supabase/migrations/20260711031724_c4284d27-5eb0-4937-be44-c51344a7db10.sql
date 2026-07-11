
-- =========================================================================
-- PHASE 1 · MIGRATION 1 — Core organization foundation
-- Additive & reversible. No legacy code touched. No table dropped.
-- =========================================================================

-- 1. SLUG SUPPORT ---------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS slug text;

-- Slugify helper (lowercase, hyphen-separated, ascii-safe)
CREATE OR REPLACE FUNCTION public.slugify_org_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    trim(both '-' from
      regexp_replace(
        regexp_replace(lower(coalesce(_name,'')), '[^a-z0-9]+', '-', 'g'),
        '-+', '-', 'g'
      )
    ),
    ''
  );
$$;

-- Unique slug generator: appends -2, -3... on collision
CREATE OR REPLACE FUNCTION public.generate_unique_org_slug(_name text, _self uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  base text := coalesce(public.slugify_org_name(_name), 'org');
  candidate text := base;
  n int := 1;
BEGIN
  IF length(base) < 2 THEN base := 'org'; candidate := base; END IF;
  WHILE EXISTS (
    SELECT 1 FROM public.organizations
    WHERE slug = candidate AND (_self IS NULL OR id <> _self)
  ) LOOP
    n := n + 1;
    candidate := base || '-' || n::text;
  END LOOP;
  RETURN candidate;
END $$;

-- Trigger: auto-fill slug on insert/update when null or blank
CREATE OR REPLACE FUNCTION public.organizations_set_slug_trg()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    NEW.slug := public.generate_unique_org_slug(NEW.name, NEW.id);
  ELSE
    NEW.slug := public.slugify_org_name(NEW.slug);
    IF NEW.slug IS NULL THEN
      NEW.slug := public.generate_unique_org_slug(NEW.name, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS organizations_set_slug ON public.organizations;
CREATE TRIGGER organizations_set_slug
  BEFORE INSERT OR UPDATE OF slug, name ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.organizations_set_slug_trg();

-- Backfill existing rows
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, name FROM public.organizations WHERE slug IS NULL LOOP
    UPDATE public.organizations
      SET slug = public.generate_unique_org_slug(r.name, r.id)
      WHERE id = r.id;
  END LOOP;
END $$;

-- Enforce non-null + uniqueness now that everything is backfilled
ALTER TABLE public.organizations
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_key
  ON public.organizations (slug);

-- 2. PERMISSION CHECK RPC -------------------------------------------------
-- Single source of truth for all future mutation RPCs.
CREATE OR REPLACE FUNCTION public.has_org_permission(
  _user_id uuid,
  _organization_id uuid,
  _permission_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Org owner always passes
    SELECT 1 FROM public.organizations o
    WHERE o.id = _organization_id AND o.owner_user_id = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.organization_member_roles mr ON mr.member_id = om.id
    JOIN public.organization_role_permissions rp ON rp.role_id = mr.role_id
    JOIN public.organization_permissions p ON p.id = rp.permission_id
    WHERE om.organization_id = _organization_id
      AND om.user_id = _user_id
      AND om.status = 'active'
      AND p.permission_key = _permission_key
  );
$$;

-- 3. AUDIT LOG HELPER -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.write_org_audit_log(
  _organization_id uuid,
  _action text,
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _old_data jsonb DEFAULT NULL,
  _new_data jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.organization_audit_logs
    (organization_id, actor_id, action, entity_type, entity_id, old_data, new_data)
  VALUES
    (_organization_id, auth.uid(), _action, _entity_type, _entity_id, _old_data, _new_data)
  RETURNING id INTO _id;
  RETURN _id;
END $$;

-- 4. SLUG RESOLVER (used by OrganizationProvider) -------------------------
-- Returns org id + basic public fields for a slug the caller can see.
CREATE OR REPLACE FUNCTION public.resolve_organization_by_slug(_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  username text,
  logo_url text,
  cover_url text,
  org_type org_type,
  is_member boolean,
  is_owner boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id, o.slug, o.name, o.username, o.logo_url, o.cover_url, o.org_type,
    public.is_organization_member(o.id) AS is_member,
    (o.owner_user_id = auth.uid()) AS is_owner
  FROM public.organizations o
  WHERE o.slug = lower(_slug)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.has_org_permission(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_org_audit_log(uuid, text, text, uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_organization_by_slug(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.slugify_org_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_org_slug(text, uuid) TO authenticated;

-- 5. DEPRECATION MARKERS (comments only — no behavior change) -------------
COMMENT ON FUNCTION public.is_org_admin(uuid, uuid) IS 'DEPRECATED (Phase 1 org migration): use has_org_permission(). Kept for backward compatibility until Phase 7 cleanup.';
COMMENT ON FUNCTION public.is_org_member(uuid, uuid) IS 'DEPRECATED (Phase 1 org migration): use is_organization_member(). Kept for backward compatibility until Phase 7 cleanup.';
COMMENT ON FUNCTION public.issue_affiliation(uuid, text, affiliation_role, date, date, text) IS 'DEPRECATED (Phase 1 org migration): affiliations superseded by organization_invites. Kept for backward compatibility until Phase 7 cleanup.';
COMMENT ON FUNCTION public.respond_affiliation(uuid, boolean) IS 'DEPRECATED (Phase 1 org migration): superseded by organization_invites flow.';
COMMENT ON FUNCTION public.revoke_affiliation(uuid, text) IS 'DEPRECATED (Phase 1 org migration): superseded by organization member removal RPC.';
