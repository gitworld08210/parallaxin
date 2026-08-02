-- 1. aap_payments: advertisers may only create pending payments
DROP POLICY IF EXISTS "pay insert adv" ON public.aap_payments;
CREATE POLICY "pay insert adv" ON public.aap_payments
FOR INSERT TO authenticated
WITH CHECK (
  aap_is_finance()
  OR aap_is_founder()
  OR (
    aap_can_edit_advertiser(advertiser_id)
    AND status = 'pending'::aap_payment_status
    AND verified_by IS NULL
    AND verified_at IS NULL
  )
);

-- 2. KIP: company-wide collections are employees-only
CREATE OR REPLACE FUNCTION public.kip_can_access_collection(_collection_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.kip_collections c
    WHERE c.id = _collection_id AND (
      c.owner_id = _user_id
      OR (c.visibility = 'company' AND public.is_active_employee(_user_id))
      OR EXISTS (SELECT 1 FROM public.kip_collection_members m WHERE m.collection_id = c.id AND m.user_id = _user_id)
      OR public.is_admin_department_member(_user_id, 'founder_office')
    )
  );
$function$;

-- 3. ads-payments bucket: only finance or the uploader may read proofs
DROP POLICY IF EXISTS "ads_payments_read" ON storage.objects;
CREATE POLICY "ads_payments_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'ads-payments'
  AND (ads_is_finance() OR owner = auth.uid())
);