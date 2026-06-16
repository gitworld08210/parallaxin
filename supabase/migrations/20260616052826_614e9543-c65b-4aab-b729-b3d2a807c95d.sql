
-- 1. conversations: group metadata
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

-- 2. messages: kind + shared story
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS shared_story_id uuid;

-- 3. calls: group flag
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false;

-- 4. call_participants
CREATE TABLE IF NOT EXISTS public.call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz,
  left_at timestamptz,
  status text NOT NULL DEFAULT 'ringing',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(call_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_participants TO authenticated;
GRANT ALL ON public.call_participants TO service_role;

ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants can read"
  ON public.call_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.call_participants cp
      WHERE cp.call_id = call_participants.call_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "users can join themselves"
  ON public.call_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can update own row"
  ON public.call_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.call_participants;

-- 5. RPCs for groups
CREATE OR REPLACE FUNCTION public.create_group(_title text, _member_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  conv uuid;
  mid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF coalesce(array_length(_member_ids,1),0) = 0 THEN RAISE EXCEPTION 'need members'; END IF;
  INSERT INTO public.conversations (is_group, title, created_by)
    VALUES (true, NULLIF(trim(_title), ''), me)
    RETURNING id INTO conv;
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (conv, me, 'admin');
  FOREACH mid IN ARRAY _member_ids LOOP
    IF mid <> me THEN
      INSERT INTO public.conversation_participants (conversation_id, user_id, role)
        VALUES (conv, mid, 'member')
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN conv;
END $$;

CREATE OR REPLACE FUNCTION public.add_group_member(_conv uuid, _user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id=_conv AND user_id=me) THEN
    RAISE EXCEPTION 'not a member';
  END IF;
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (_conv, _user, 'member')
    ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.remove_group_member(_conv uuid, _user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id=_conv AND user_id=me AND role='admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  DELETE FROM public.conversation_participants WHERE conversation_id=_conv AND user_id=_user;
END $$;

CREATE OR REPLACE FUNCTION public.leave_group(_conv uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  DELETE FROM public.conversation_participants WHERE conversation_id=_conv AND user_id=me;
END $$;

-- 6. Story mention sticker trigger → notification + DM
CREATE OR REPLACE FUNCTION public.on_story_mention_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  mentioned uuid;
  story_owner uuid;
  conv uuid;
  owner_name text;
BEGIN
  IF NEW.kind <> 'mention' THEN RETURN NEW; END IF;
  mentioned := (NEW.payload->>'user_id')::uuid;
  IF mentioned IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO story_owner FROM public.stories WHERE id = NEW.story_id;
  IF story_owner IS NULL OR story_owner = mentioned THEN RETURN NEW; END IF;

  -- notification
  INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (mentioned, story_owner, 'story_mention');

  -- find or create 1:1 conversation between owner and mentioned
  SELECT c.id INTO conv
  FROM public.conversations c
  WHERE c.is_group = false
    AND EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id=c.id AND p.user_id=story_owner)
    AND EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id=c.id AND p.user_id=mentioned)
  LIMIT 1;

  IF conv IS NULL THEN
    INSERT INTO public.conversations (is_group) VALUES (false) RETURNING id INTO conv;
    INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES (conv, story_owner), (conv, mentioned);
  END IF;

  SELECT coalesce(display_name, username, 'Someone') INTO owner_name FROM public.profiles WHERE user_id = story_owner;

  INSERT INTO public.messages (conversation_id, sender_id, content, kind, shared_story_id)
    VALUES (conv, story_owner, owner_name || ' mentioned you in their story', 'story_mention', NEW.story_id);

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS story_mention_notify ON public.story_stickers;
CREATE TRIGGER story_mention_notify
  AFTER INSERT ON public.story_stickers
  FOR EACH ROW EXECUTE FUNCTION public.on_story_mention_trg();
