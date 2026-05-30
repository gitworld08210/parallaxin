
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.story_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('poll','qa')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  position jsonb NOT NULL DEFAULT '{"x":0.5,"y":0.75}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_story_stickers_story ON public.story_stickers(story_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_stickers TO authenticated;
GRANT ALL ON public.story_stickers TO service_role;
ALTER TABLE public.story_stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY ss_select_visible ON public.story_stickers FOR SELECT
USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id));
CREATE POLICY ss_owner_write ON public.story_stickers FOR ALL
USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()));

CREATE TABLE public.story_sticker_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_id uuid NOT NULL REFERENCES public.story_stickers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sticker_id, user_id)
);
CREATE INDEX idx_ssr_sticker ON public.story_sticker_responses(sticker_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_sticker_responses TO authenticated;
GRANT ALL ON public.story_sticker_responses TO service_role;
ALTER TABLE public.story_sticker_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY ssr_insert_self ON public.story_sticker_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ssr_update_self ON public.story_sticker_responses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY ssr_delete_self ON public.story_sticker_responses FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY ssr_select_self_or_owner ON public.story_sticker_responses FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.story_stickers st JOIN public.stories s ON s.id = st.story_id WHERE st.id = sticker_id AND s.user_id = auth.uid())
);
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_sticker_responses;

CREATE TABLE public.post_collaborators (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX idx_pc_user ON public.post_collaborators(user_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_collaborators TO authenticated;
GRANT ALL ON public.post_collaborators TO service_role;
ALTER TABLE public.post_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY pc_select_all ON public.post_collaborators FOR SELECT USING (true);
CREATE POLICY pc_insert_author ON public.post_collaborators FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));
CREATE POLICY pc_update_self ON public.post_collaborators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY pc_delete_author_or_self ON public.post_collaborators FOR DELETE
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.notify_collab_invite_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  SELECT user_id INTO author FROM public.posts WHERE id = NEW.post_id;
  IF author IS NOT NULL AND author <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    VALUES (NEW.user_id, author, 'collab_invite', NEW.post_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_collab_invite AFTER INSERT ON public.post_collaborators
FOR EACH ROW EXECUTE FUNCTION public.notify_collab_invite_trg();

CREATE OR REPLACE FUNCTION public.notify_collab_accept_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    SELECT user_id INTO author FROM public.posts WHERE id = NEW.post_id;
    IF author IS NOT NULL AND author <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, post_id)
      VALUES (author, NEW.user_id, 'collab_accepted', NEW.post_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_collab_accept AFTER UPDATE ON public.post_collaborators
FOR EACH ROW EXECUTE FUNCTION public.notify_collab_accept_trg();

CREATE TABLE public.post_embeddings (
  post_id uuid PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  embedding vector(768) NOT NULL,
  content_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_post_embeddings_hnsw ON public.post_embeddings USING hnsw (embedding vector_cosine_ops);
GRANT SELECT ON public.post_embeddings TO authenticated;
GRANT ALL ON public.post_embeddings TO service_role;
ALTER TABLE public.post_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY pe_select_all ON public.post_embeddings FOR SELECT USING (true);

CREATE TABLE public.user_interest_vectors (
  user_id uuid PRIMARY KEY,
  embedding vector(768) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_interest_vectors TO authenticated;
GRANT ALL ON public.user_interest_vectors TO service_role;
ALTER TABLE public.user_interest_vectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY uiv_select_own ON public.user_interest_vectors FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.match_posts_for_user(
  _user_id uuid,
  _match_count int DEFAULT 30
) RETURNS TABLE (post_id uuid, similarity float)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE u_vec vector(768);
BEGIN
  SELECT embedding INTO u_vec FROM public.user_interest_vectors WHERE user_id = _user_id;
  IF u_vec IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT pe.post_id, (1 - (pe.embedding <=> u_vec))::float AS similarity
  FROM public.post_embeddings pe
  JOIN public.posts p ON p.id = pe.post_id
  WHERE p.status = 'published'
    AND p.is_reel = false
    AND p.user_id <> _user_id
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE (b.blocker_id = _user_id AND b.blocked_id = p.user_id) OR (b.blocked_id = _user_id AND b.blocker_id = p.user_id))
    AND NOT EXISTS (SELECT 1 FROM public.mutes m WHERE m.muter_id = _user_id AND m.muted_id = p.user_id)
  ORDER BY pe.embedding <=> u_vec
  LIMIT _match_count;
END $$;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ai_dm_suggestions_enabled boolean NOT NULL DEFAULT true;
