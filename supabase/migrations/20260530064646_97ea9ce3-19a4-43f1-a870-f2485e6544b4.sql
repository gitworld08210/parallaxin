
-- 1. STORY REACTIONS
CREATE TABLE public.story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_story_reactions_story ON public.story_reactions(story_id);

GRANT SELECT, INSERT, DELETE ON public.story_reactions TO authenticated;
GRANT ALL ON public.story_reactions TO service_role;

ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sr_select_all ON public.story_reactions FOR SELECT USING (true);
CREATE POLICY sr_insert_own ON public.story_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sr_delete_own ON public.story_reactions FOR DELETE USING (auth.uid() = user_id);

-- 2. SHARED POST in messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS shared_post_id uuid;
CREATE INDEX IF NOT EXISTS idx_messages_shared_post ON public.messages(shared_post_id);

-- 3. BLOCKS
CREATE TABLE public.blocks (
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY blocks_select_own ON public.blocks FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
CREATE POLICY blocks_insert_own ON public.blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY blocks_delete_own ON public.blocks FOR DELETE USING (auth.uid() = blocker_id);

-- 4. MUTES
CREATE TABLE public.mutes (
  muter_id uuid NOT NULL,
  muted_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (muter_id, muted_id)
);
GRANT SELECT, INSERT, DELETE ON public.mutes TO authenticated;
GRANT ALL ON public.mutes TO service_role;
ALTER TABLE public.mutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY mutes_select_own ON public.mutes FOR SELECT USING (auth.uid() = muter_id);
CREATE POLICY mutes_insert_own ON public.mutes FOR INSERT WITH CHECK (auth.uid() = muter_id);
CREATE POLICY mutes_delete_own ON public.mutes FOR DELETE USING (auth.uid() = muter_id);
