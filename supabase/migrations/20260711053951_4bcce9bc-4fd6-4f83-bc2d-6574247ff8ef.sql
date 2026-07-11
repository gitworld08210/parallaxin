-- Phase 7: drop the deprecated affiliation system. Fully superseded by
-- organization_members / organization_invites since Phase 1.
DROP FUNCTION IF EXISTS public.issue_affiliation(uuid, text, public.affiliation_role, date, date, text) CASCADE;
DROP FUNCTION IF EXISTS public.respond_affiliation(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.revoke_affiliation(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_affiliation_role(uuid, public.affiliation_role) CASCADE;
DROP TABLE IF EXISTS public.affiliation_audit_logs CASCADE;
DROP TABLE IF EXISTS public.affiliations CASCADE;
DROP TYPE IF EXISTS public.affiliation_role CASCADE;
DROP TYPE IF EXISTS public.affiliation_status CASCADE;
