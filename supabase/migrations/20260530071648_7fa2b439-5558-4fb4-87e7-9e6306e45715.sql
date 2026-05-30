
DROP POLICY IF EXISTS pv_insert_any ON public.post_views;
CREATE POLICY pv_insert_authed ON public.post_views FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (viewer_id IS NULL OR viewer_id = auth.uid()));
