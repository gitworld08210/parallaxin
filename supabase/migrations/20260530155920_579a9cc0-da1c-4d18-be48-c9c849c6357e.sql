DROP POLICY IF EXISTS stories_select_visible ON public.stories;
CREATE POLICY stories_select_visible ON public.stories
  FOR SELECT USING (
    expires_at > now() AND (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.close_friends cf WHERE cf.owner_id = stories.user_id AND cf.friend_id = auth.uid())
      OR (
        audience = 'public'::story_audience AND (
          NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = stories.user_id AND p.is_private = true)
          OR EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = stories.user_id)
        )
      )
    )
  );