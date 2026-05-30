
-- 1) Restrict sensitive profile columns from anonymous users (column-level GRANT)
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, user_id, username, display_name, avatar_url, cover_url, bio,
  verified, verification_kind,
  followers_count, following_count, posts_count,
  is_founder, founder_level, founder_title, council_role, join_era,
  signature_aura, aura_rank, chronicle, contribution_score,
  is_private, show_activity, interests, council_vote_weight,
  created_at, updated_at, onboarded_at
) ON public.profiles TO anon;

-- 2) conversation_participants: only allow adding yourself (no force-adding others)
DROP POLICY IF EXISTS participants_insert_self_or_member ON public.conversation_participants;
CREATE POLICY participants_insert_self
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 3) messages: only allow updating your own messages
DROP POLICY IF EXISTS messages_update_member ON public.messages;
CREATE POLICY messages_update_own
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()))
  WITH CHECK (sender_id = auth.uid());

-- Note: read receipts continue to work via public.mark_conversation_read() (SECURITY DEFINER)
