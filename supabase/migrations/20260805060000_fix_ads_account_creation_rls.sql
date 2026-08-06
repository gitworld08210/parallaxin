-- Fix for ads_accounts visibility during creation and management
-- The previous policy relied solely on ads_members, which caused a race condition 
-- during INSERT ... RETURNING because AFTER triggers run after the RETURNING clause.

DROP POLICY IF EXISTS ads_accounts_select ON public.ads_accounts;
CREATE POLICY ads_accounts_select ON public.ads_accounts FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.ads_is_member(id) OR public.ads_is_finance() OR public.ads_is_reviewer());

DROP POLICY IF EXISTS ads_accounts_update ON public.ads_accounts;
CREATE POLICY ads_accounts_update ON public.ads_accounts FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.ads_can_manage(id) OR public.ads_is_finance())
  WITH CHECK (owner_user_id = auth.uid() OR public.ads_can_manage(id) OR public.ads_is_finance());
