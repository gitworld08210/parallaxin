
DROP POLICY IF EXISTS "cfg read" ON public.aap_config;
DROP POLICY IF EXISTS "cfg read staff" ON public.aap_config;
CREATE POLICY "cfg read staff" ON public.aap_config FOR SELECT TO authenticated
  USING (public.aap_is_finance() OR public.aap_is_engineering() OR public.aap_is_founder() OR public.aap_is_platform_admin());

DROP POLICY IF EXISTS "kbv read" ON public.aap_kb_versions;
DROP POLICY IF EXISTS "kbv read scoped" ON public.aap_kb_versions;
CREATE POLICY "kbv read scoped" ON public.aap_kb_versions FOR SELECT TO authenticated
  USING (
    public.aap_is_platform_admin()
    OR EXISTS (SELECT 1 FROM public.aap_kb_docs d WHERE d.id = aap_kb_versions.doc_id AND d.is_public = true)
  );

DROP POLICY IF EXISTS "pc read" ON public.aap_placement_configs;
DROP POLICY IF EXISTS "pc read staff" ON public.aap_placement_configs;
CREATE POLICY "pc read staff" ON public.aap_placement_configs FOR SELECT TO authenticated
  USING (public.aap_is_platform_admin() OR public.aap_is_engineering() OR public.aap_is_founder());

DROP POLICY IF EXISTS "ff read" ON public.aap_feature_flags;
DROP POLICY IF EXISTS "ff read staff" ON public.aap_feature_flags;
CREATE POLICY "ff read staff" ON public.aap_feature_flags FOR SELECT TO authenticated
  USING (public.aap_is_platform_admin() OR public.aap_is_engineering() OR public.aap_is_founder());

DROP POLICY IF EXISTS "loc read" ON public.aap_localization;
DROP POLICY IF EXISTS "loc read staff" ON public.aap_localization;
CREATE POLICY "loc read staff" ON public.aap_localization FOR SELECT TO authenticated
  USING (public.aap_is_platform_admin() OR public.aap_is_engineering() OR public.aap_is_founder());

DROP POLICY IF EXISTS "placements read" ON public.aap_placements;
DROP POLICY IF EXISTS "placements read staff" ON public.aap_placements;
CREATE POLICY "placements read staff" ON public.aap_placements FOR SELECT TO authenticated
  USING (public.aap_is_platform_admin() OR public.aap_is_engineering() OR public.aap_is_founder());

DROP POLICY IF EXISTS "policy read" ON public.aap_policy_refs;
DROP POLICY IF EXISTS "policy read staff" ON public.aap_policy_refs;
CREATE POLICY "policy read staff" ON public.aap_policy_refs FOR SELECT TO authenticated
  USING (public.aap_is_platform_admin() OR public.aap_is_reviewer() OR public.aap_is_founder());
