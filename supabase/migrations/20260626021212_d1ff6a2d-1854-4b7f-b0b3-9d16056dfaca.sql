
-- Enable RLS on realtime.messages and scope subscriptions by topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read scoped topics" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can write scoped topics" ON realtime.messages;

CREATE POLICY "authenticated can read scoped topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    -- DM typing indicator: conv-typing:<conversation_id>
    WHEN realtime.topic() LIKE 'conv-typing:%' THEN EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id::text = split_part(realtime.topic(), ':', 2)
        AND cp.user_id = (SELECT auth.uid())
    )
    -- Call signaling: call-signals:<call_id> and call-row:<call_id>
    WHEN realtime.topic() LIKE 'call-signals:%' OR realtime.topic() LIKE 'call-row:%' THEN EXISTS (
      SELECT 1 FROM public.calls c
      WHERE c.id::text = split_part(realtime.topic(), ':', 2)
        AND (SELECT auth.uid()) IN (c.caller_id, c.callee_id)
    )
    -- Per-user notification / badge / toast channels: <prefix>:<user_id>
    WHEN realtime.topic() LIKE 'notif:%'
      OR realtime.topic() LIKE 'notif-badge:%'
      OR realtime.topic() LIKE 'dm-badge:%'
      OR realtime.topic() LIKE 'toast-notif:%'
      OR realtime.topic() LIKE 'toast-dm:%'
      OR realtime.topic() LIKE 'incoming-calls:%'
      THEN split_part(realtime.topic(), ':', 2) = (SELECT auth.uid())::text
    -- DM db change channel: conv-db:<conversation_id>
    WHEN realtime.topic() LIKE 'conv-db:%' THEN EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id::text = split_part(realtime.topic(), ':', 2)
        AND cp.user_id = (SELECT auth.uid())
    )
    -- Live streams chat/reactions: live:<stream_id> — open to any authenticated viewer
    WHEN realtime.topic() LIKE 'live:%' THEN true
    -- Story stickers: story-stk:<story_id> — open to any authenticated user (visibility enforced on stickers table)
    WHEN realtime.topic() LIKE 'story-stk:%' THEN true
    ELSE false
  END
);

-- Same scoping for sending broadcast/presence messages
CREATE POLICY "authenticated can write scoped topics"
ON realtime.messages
FOR INSERT
TO authenticated
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
        AND (SELECT auth.uid()) IN (c.caller_id, c.callee_id)
    )
    WHEN realtime.topic() LIKE 'notif:%'
      OR realtime.topic() LIKE 'notif-badge:%'
      OR realtime.topic() LIKE 'dm-badge:%'
      OR realtime.topic() LIKE 'toast-notif:%'
      OR realtime.topic() LIKE 'toast-dm:%'
      OR realtime.topic() LIKE 'incoming-calls:%'
      THEN split_part(realtime.topic(), ':', 2) = (SELECT auth.uid())::text
    WHEN realtime.topic() LIKE 'conv-db:%' THEN EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id::text = split_part(realtime.topic(), ':', 2)
        AND cp.user_id = (SELECT auth.uid())
    )
    WHEN realtime.topic() LIKE 'live:%' THEN true
    WHEN realtime.topic() LIKE 'story-stk:%' THEN true
    ELSE false
  END
);
