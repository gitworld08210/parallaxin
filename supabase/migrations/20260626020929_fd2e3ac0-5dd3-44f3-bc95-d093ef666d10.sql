DROP POLICY IF EXISTS ss_select_visible ON public.story_stickers;
CREATE POLICY ss_select_visible ON public.story_stickers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_stickers.story_id
        AND s.expires_at > now()
        AND (
          s.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.close_friends cf WHERE cf.owner_id = s.user_id AND cf.friend_id = auth.uid())
          OR (
            s.audience = 'public'::story_audience AND (
              NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = s.user_id AND p.is_private = true)
              OR EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = s.user_id)
            )
          )
        )
    )
  );