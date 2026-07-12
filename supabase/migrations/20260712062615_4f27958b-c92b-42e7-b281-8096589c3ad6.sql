
CREATE POLICY "decision_attachments_founder_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'decision-attachments'
         AND public.is_admin_department_member(auth.uid(), 'founder_office'));
CREATE POLICY "decision_attachments_founder_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'decision-attachments'
              AND public.is_admin_department_member(auth.uid(), 'founder_office'));
CREATE POLICY "decision_attachments_founder_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'decision-attachments'
         AND public.is_admin_department_member(auth.uid(), 'founder_office'));
