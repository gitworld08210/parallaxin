
-- =========================================================
-- Phase 1: Organizations & Affiliations
-- =========================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('personal','organization');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.org_type AS ENUM ('company','startup','education','ngo','government','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.affiliation_role AS ENUM (
    'founder','co_founder','ceo','cto','employee',
    'brand_ambassador','official_representative','advisor','investor','moderator'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.affiliation_status AS ENUM ('pending','active','declined','revoked','ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.org_member_role AS ENUM ('owner','admin','manager','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profiles: add account_type + org link
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type public.account_type NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- =========================================================
-- organizations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  logo_url text,
  email text,
  website text,
  industry text,
  org_type public.org_type NOT NULL DEFAULT 'company',
  description text,
  country text,
  location text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organizations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- organization_members
-- =========================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  member_role public.org_member_role NOT NULL DEFAULT 'admin',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin/owner of org
CREATE OR REPLACE FUNCTION public.is_org_admin(_org uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = _org AND user_id = _user AND member_role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE org_id=_org AND user_id=_user);
$$;

-- =========================================================
-- affiliations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.affiliation_role NOT NULL,
  status public.affiliation_status NOT NULL DEFAULT 'pending',
  started_on date,
  ended_on date,
  note text,
  issued_by uuid NOT NULL,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS affiliations_active_unique
  ON public.affiliations(org_id, user_id)
  WHERE status IN ('pending','active');

CREATE INDEX IF NOT EXISTS affiliations_user_idx ON public.affiliations(user_id, status);
CREATE INDEX IF NOT EXISTS affiliations_org_idx ON public.affiliations(org_id, status);

GRANT SELECT ON public.affiliations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliations TO authenticated;
GRANT ALL ON public.affiliations TO service_role;

ALTER TABLE public.affiliations ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- affiliation_audit_logs
-- =========================================================
CREATE TABLE IF NOT EXISTS public.affiliation_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliation_id uuid REFERENCES public.affiliations(id) ON DELETE SET NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.affiliation_audit_logs TO authenticated;
GRANT ALL ON public.affiliation_audit_logs TO service_role;

ALTER TABLE public.affiliation_audit_logs ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- updated_at triggers
-- =========================================================
DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
CREATE TRIGGER set_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_affiliations_updated_at ON public.affiliations;
CREATE TRIGGER set_affiliations_updated_at BEFORE UPDATE ON public.affiliations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- RLS Policies
-- =========================================================

-- organizations: anyone can read, only admins update/delete; creation is via RPC but allow owner insert as safety
CREATE POLICY "orgs readable by all" ON public.organizations
  FOR SELECT USING (true);
CREATE POLICY "orgs owner insert" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "orgs admin update" ON public.organizations
  FOR UPDATE TO authenticated USING (public.is_org_admin(id, auth.uid()))
  WITH CHECK (public.is_org_admin(id, auth.uid()));
CREATE POLICY "orgs owner delete" ON public.organizations
  FOR DELETE TO authenticated USING (owner_user_id = auth.uid());

-- organization_members: members can see their org's team; admins manage
CREATE POLICY "org members visible to members" ON public.organization_members
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "org members admin insert" ON public.organization_members
  FOR INSERT TO authenticated WITH CHECK (
    public.is_org_admin(org_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_user_id = auth.uid())
  );
CREATE POLICY "org members admin update" ON public.organization_members
  FOR UPDATE TO authenticated USING (public.is_org_admin(org_id, auth.uid()));
CREATE POLICY "org members admin delete" ON public.organization_members
  FOR DELETE TO authenticated USING (public.is_org_admin(org_id, auth.uid()));

-- affiliations: active publicly visible; pending/revoked visible to invitee + org admins
CREATE POLICY "affiliations active public" ON public.affiliations
  FOR SELECT USING (status = 'active');
CREATE POLICY "affiliations self or admin view" ON public.affiliations
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.is_org_admin(org_id, auth.uid())
  );
-- writes only via RPC; but allow invitee to update own status row through RPC (no direct table writes)
CREATE POLICY "affiliations admin write" ON public.affiliations
  FOR ALL TO authenticated
  USING (public.is_org_admin(org_id, auth.uid()))
  WITH CHECK (public.is_org_admin(org_id, auth.uid()));

-- audit logs visible to org admins only
CREATE POLICY "audit logs admin select" ON public.affiliation_audit_logs
  FOR SELECT TO authenticated USING (public.is_org_admin(org_id, auth.uid()));
CREATE POLICY "audit logs admin insert" ON public.affiliation_audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(org_id, auth.uid()));

-- =========================================================
-- RPCs
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_organization(
  _name text,
  _username text,
  _logo_url text,
  _email text,
  _website text,
  _industry text,
  _org_type public.org_type,
  _description text,
  _country text,
  _location text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
  _clean_username text := lower(regexp_replace(coalesce(_username,''), '[^a-z0-9_]', '', 'g'));
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF length(_clean_username) < 3 THEN RAISE EXCEPTION 'username too short' USING ERRCODE='22023'; END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 THEN RAISE EXCEPTION 'name required'; END IF;

  IF EXISTS (SELECT 1 FROM public.organizations WHERE username = _clean_username)
     OR EXISTS (SELECT 1 FROM public.profiles WHERE username = _clean_username) THEN
    RAISE EXCEPTION 'username taken' USING ERRCODE='23505';
  END IF;

  INSERT INTO public.organizations (
    owner_user_id, name, username, logo_url, email, website, industry, org_type, description, country, location
  ) VALUES (
    _uid, _name, _clean_username, _logo_url, _email, _website, _industry, _org_type, _description, _country, _location
  ) RETURNING id INTO _org_id;

  INSERT INTO public.organization_members (org_id, user_id, member_role)
    VALUES (_org_id, _uid, 'owner');

  -- Mark the creator's profile as organization-typed and linked
  UPDATE public.profiles
    SET account_type = 'organization',
        organization_id = _org_id,
        display_name = COALESCE(NULLIF(display_name,''), _name),
        avatar_url = COALESCE(_logo_url, avatar_url),
        bio = COALESCE(_description, bio),
        updated_at = now()
    WHERE user_id = _uid;

  RETURN _org_id;
END $$;

CREATE OR REPLACE FUNCTION public.issue_affiliation(
  _org_id uuid,
  _target_username text,
  _role public.affiliation_role,
  _started_on date,
  _ended_on date,
  _note text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _target uuid;
  _aff_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT public.is_org_admin(_org_id, _uid) THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501'; END IF;

  SELECT user_id INTO _target FROM public.profiles WHERE username = lower(_target_username);
  IF _target IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  INSERT INTO public.affiliations (org_id, user_id, role, status, started_on, ended_on, note, issued_by)
    VALUES (_org_id, _target, _role, 'pending', COALESCE(_started_on, CURRENT_DATE), _ended_on, _note, _uid)
    RETURNING id INTO _aff_id;

  INSERT INTO public.affiliation_audit_logs (affiliation_id, org_id, actor_user_id, action, metadata)
    VALUES (_aff_id, _org_id, _uid, 'issued', jsonb_build_object('role', _role, 'user_id', _target));

  INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (_target, _uid, 'affiliation_invite');

  RETURN _aff_id;
END $$;

CREATE OR REPLACE FUNCTION public.respond_affiliation(_aff_id uuid, _accept boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.affiliations%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO _row FROM public.affiliations WHERE id = _aff_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF _row.user_id <> _uid THEN RAISE EXCEPTION 'not your invite' USING ERRCODE='42501'; END IF;
  IF _row.status <> 'pending' THEN RAISE EXCEPTION 'already responded'; END IF;

  UPDATE public.affiliations
     SET status = CASE WHEN _accept THEN 'active'::affiliation_status ELSE 'declined'::affiliation_status END,
         responded_at = now()
   WHERE id = _aff_id;

  INSERT INTO public.affiliation_audit_logs (affiliation_id, org_id, actor_user_id, action, metadata)
    VALUES (_aff_id, _row.org_id, _uid, CASE WHEN _accept THEN 'accepted' ELSE 'declined' END, '{}'::jsonb);

  INSERT INTO public.notifications (user_id, actor_id, type)
    SELECT _row.issued_by, _uid, CASE WHEN _accept THEN 'affiliation_accepted' ELSE 'affiliation_declined' END;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_affiliation(_aff_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.affiliations%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO _row FROM public.affiliations WHERE id = _aff_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT public.is_org_admin(_row.org_id, _uid) THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501'; END IF;

  UPDATE public.affiliations SET status='revoked', ended_on = COALESCE(ended_on, CURRENT_DATE) WHERE id=_aff_id;

  INSERT INTO public.affiliation_audit_logs (affiliation_id, org_id, actor_user_id, action, metadata)
    VALUES (_aff_id, _row.org_id, _uid, 'revoked', jsonb_build_object('reason', _reason));

  INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (_row.user_id, _uid, 'affiliation_revoked');
END $$;

CREATE OR REPLACE FUNCTION public.update_affiliation_role(_aff_id uuid, _role public.affiliation_role)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.affiliations%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.affiliations WHERE id=_aff_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT public.is_org_admin(_row.org_id, _uid) THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501'; END IF;
  UPDATE public.affiliations SET role=_role WHERE id=_aff_id;
  INSERT INTO public.affiliation_audit_logs (affiliation_id, org_id, actor_user_id, action, metadata)
    VALUES (_aff_id, _row.org_id, _uid, 'role_changed', jsonb_build_object('from', _row.role, 'to', _role));
END $$;
