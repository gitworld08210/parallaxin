
-- 1. Verification kind on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_kind text
  CHECK (verification_kind IN ('verified','creator','gov','brand','founder'));

-- Backfill: anyone already verified becomes 'verified' kind
UPDATE public.profiles SET verification_kind = 'verified' WHERE verified = true AND verification_kind IS NULL;

-- 2. start_dm RPC: atomically find-or-create a 1:1 conversation
CREATE OR REPLACE FUNCTION public.start_dm(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  conv uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF other_user_id IS NULL OR other_user_id = me THEN
    RAISE EXCEPTION 'invalid target user';
  END IF;

  -- existing 1:1 conversation between the two users
  SELECT c.id INTO conv
  FROM public.conversations c
  WHERE c.is_group = false
    AND EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = me)
    AND EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = other_user_id)
  LIMIT 1;

  IF conv IS NOT NULL THEN
    RETURN conv;
  END IF;

  INSERT INTO public.conversations (is_group) VALUES (false) RETURNING id INTO conv;
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (conv, me), (conv, other_user_id);

  RETURN conv;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_dm(uuid) TO authenticated;
