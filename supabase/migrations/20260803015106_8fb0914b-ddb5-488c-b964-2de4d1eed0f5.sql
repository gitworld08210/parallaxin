CREATE POLICY "vw_kyc_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'virtual-world-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "vw_kyc_select_own_or_staff" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'virtual-world-kyc' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.vw_is_reviewer(auth.uid())));

CREATE POLICY "vw_kyc_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'virtual-world-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);