
CREATE POLICY "platform-docs owner read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'platform-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
  )
);
CREATE POLICY "platform-docs owner write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'platform-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "platform-docs owner update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'platform-documents'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin_department_member(auth.uid(), 'founder_office'))
);
CREATE POLICY "platform-docs owner delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'platform-documents'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin_department_member(auth.uid(), 'founder_office'))
);
