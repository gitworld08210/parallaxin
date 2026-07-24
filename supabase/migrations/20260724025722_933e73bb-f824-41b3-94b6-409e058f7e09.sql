
-- 1. Add media columns
ALTER TABLE public.aap_creatives
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_path text,
  ADD COLUMN IF NOT EXISTS media_mime text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- 2. Storage policies for ad-creatives bucket. Path convention: <advertiser_id>/<uuid>.<ext>
DROP POLICY IF EXISTS "ad_creatives_adv_read" ON storage.objects;
DROP POLICY IF EXISTS "ad_creatives_adv_write" ON storage.objects;
DROP POLICY IF EXISTS "ad_creatives_adv_update" ON storage.objects;
DROP POLICY IF EXISTS "ad_creatives_adv_delete" ON storage.objects;
DROP POLICY IF EXISTS "ad_creatives_staff_read" ON storage.objects;

CREATE POLICY "ad_creatives_adv_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ad-creatives'
  AND public.aap_is_advertiser_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "ad_creatives_adv_write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ad-creatives'
  AND public.aap_can_edit_advertiser(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "ad_creatives_adv_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'ad-creatives'
  AND public.aap_can_edit_advertiser(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'ad-creatives'
  AND public.aap_can_edit_advertiser(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "ad_creatives_adv_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ad-creatives'
  AND public.aap_can_edit_advertiser(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "ad_creatives_staff_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ad-creatives'
  AND (public.aap_is_platform_admin() OR public.aap_is_reviewer() OR public.aap_is_founder())
);
