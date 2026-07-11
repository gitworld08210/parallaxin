
-- 1) Paywalled posts: replace posts_select_published with a paid-gate
DROP POLICY IF EXISTS posts_select_published ON public.posts;

CREATE POLICY posts_select_published ON public.posts
FOR SELECT
USING (
  status = 'published'::post_status
  AND (
    -- Privacy / follow gate (unchanged)
    (NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = posts.user_id AND p.is_private = true
    ))
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = auth.uid() AND f.following_id = posts.user_id
    )
  )
  AND (
    -- Paid gate: free posts, owner, or unlocked
    COALESCE(is_paid, false) = false
    OR COALESCE(price_cents, 0) = 0
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.post_unlocks pu
      WHERE pu.post_id = posts.id
        AND pu.user_id = auth.uid()
        AND pu.paid_at IS NOT NULL
    )
  )
);

-- 2) Realtime: tighten story-stk and live topic authorization
DROP POLICY IF EXISTS "authenticated can read scoped topics" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can write scoped topics" ON realtime.messages;

CREATE POLICY "authenticated can read scoped topics" ON realtime.messages
FOR SELECT TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'conv-typing:%' THEN EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id::text = split_part(realtime.topic(), ':', 2)
        AND cp.user_id = (SELECT auth.uid())
    )
    WHEN realtime.topic() LIKE 'call-signals:%' OR realtime.topic() LIKE 'call-row:%' THEN EXISTS (
      SELECT 1 FROM public.calls c
      WHERE c.id::text = split_part(realtime.topic(), ':', 2)
        AND ((SELECT auth.uid()) = c.caller_id OR (SELECT auth.uid()) = c.callee_id)
    )
    WHEN realtime.topic() LIKE 'notif:%'
      OR realtime.topic() LIKE 'notif-badge:%'
      OR realtime.topic() LIKE 'dm-badge:%'
      OR realtime.topic() LIKE 'toast-notif:%'
      OR realtime.topic() LIKE 'toast-dm:%'
      OR realtime.topic() LIKE 'incoming-calls:%'
    THEN split_part(realtime.topic(), ':', 2) = ((SELECT auth.uid()))::text
    WHEN realtime.topic() LIKE 'conv-db:%' THEN EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id::text = split_part(realtime.topic(), ':', 2)
        AND cp.user_id = (SELECT auth.uid())
    )
    WHEN realtime.topic() LIKE 'live:%' THEN EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id::text = split_part(realtime.topic(), ':', 2)
    )
    WHEN realtime.topic() LIKE 'story-stk:%' THEN EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id::text = split_part(realtime.topic(), ':', 2)
        AND s.expires_at > now()
        AND (
          s.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.close_friends cf
            WHERE cf.owner_id = s.user_id AND cf.friend_id = (SELECT auth.uid())
          )
          OR (
            s.audience = 'public'::story_audience
            AND (
              NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = s.user_id AND p.is_private = true)
              OR EXISTS (
                SELECT 1 FROM public.follows f
                WHERE f.follower_id = (SELECT auth.uid()) AND f.following_id = s.user_id
              )
            )
          )
        )
    )
    ELSE false
  END
);

CREATE POLICY "authenticated can write scoped topics" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'conv-typing:%' THEN EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id::text = split_part(realtime.topic(), ':', 2)
        AND cp.user_id = (SELECT auth.uid())
    )
    WHEN realtime.topic() LIKE 'call-signals:%' OR realtime.topic() LIKE 'call-row:%' THEN EXISTS (
      SELECT 1 FROM public.calls c
      WHERE c.id::text = split_part(realtime.topic(), ':', 2)
        AND ((SELECT auth.uid()) = c.caller_id OR (SELECT auth.uid()) = c.callee_id)
    )
    WHEN realtime.topic() LIKE 'notif:%'
      OR realtime.topic() LIKE 'notif-badge:%'
      OR realtime.topic() LIKE 'dm-badge:%'
      OR realtime.topic() LIKE 'toast-notif:%'
      OR realtime.topic() LIKE 'toast-dm:%'
      OR realtime.topic() LIKE 'incoming-calls:%'
    THEN split_part(realtime.topic(), ':', 2) = ((SELECT auth.uid()))::text
    WHEN realtime.topic() LIKE 'conv-db:%' THEN EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id::text = split_part(realtime.topic(), ':', 2)
        AND cp.user_id = (SELECT auth.uid())
    )
    WHEN realtime.topic() LIKE 'live:%' THEN EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id::text = split_part(realtime.topic(), ':', 2)
    )
    WHEN realtime.topic() LIKE 'story-stk:%' THEN EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id::text = split_part(realtime.topic(), ':', 2)
        AND s.expires_at > now()
        AND (
          s.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.close_friends cf
            WHERE cf.owner_id = s.user_id AND cf.friend_id = (SELECT auth.uid())
          )
          OR (
            s.audience = 'public'::story_audience
            AND (
              NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = s.user_id AND p.is_private = true)
              OR EXISTS (
                SELECT 1 FROM public.follows f
                WHERE f.follower_id = (SELECT auth.uid()) AND f.following_id = s.user_id
              )
            )
          )
        )
    )
    ELSE false
  END
);

-- 3) Set search_path on org helper functions
ALTER FUNCTION public.assign_owner_role(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.create_organization(uuid, text, text, org_type, text, text, text) SET search_path = public;
ALTER FUNCTION public.initialize_default_departments(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.initialize_default_role_permissions(uuid) SET search_path = public;
ALTER FUNCTION public.initialize_default_roles(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.initialize_owner_member(uuid, uuid) SET search_path = public;
