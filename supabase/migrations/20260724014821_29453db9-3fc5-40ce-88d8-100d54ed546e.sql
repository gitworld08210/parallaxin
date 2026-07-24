
DROP POLICY IF EXISTS "am self insert viewer only" ON public.aap_advertiser_members;

CREATE POLICY "am self insert bounded"
ON public.aap_advertiser_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.aap_advertisers a
    WHERE a.id = advertiser_id
      AND a.owner_user_id = auth.uid()
  )
);
