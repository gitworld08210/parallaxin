
DROP POLICY IF EXISTS posts_select_published ON public.posts;
CREATE POLICY posts_select_published ON public.posts
  FOR SELECT USING (
    status = 'published'::post_status AND (
      NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = posts.user_id AND p.is_private = true
      )
      OR posts.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = auth.uid() AND f.following_id = posts.user_id
      )
    )
  );

DROP POLICY IF EXISTS comments_select_all ON public.comments;
CREATE POLICY comments_select_visible ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts po
      LEFT JOIN public.profiles pr ON pr.user_id = po.user_id
      WHERE po.id = comments.post_id
        AND (
          COALESCE(pr.is_private, false) = false
          OR po.user_id = auth.uid()
          OR comments.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.follows f
            WHERE f.follower_id = auth.uid() AND f.following_id = po.user_id
          )
        )
    )
  );
