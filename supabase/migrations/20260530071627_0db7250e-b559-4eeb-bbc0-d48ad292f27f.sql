
-- ============ Tier 2 + 3 schema ============

-- 1) posts: status + scheduled_for
DO $$ BEGIN
  CREATE TYPE public.post_status AS ENUM ('draft','scheduled','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS status public.post_status NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

CREATE INDEX IF NOT EXISTS posts_status_idx ON public.posts(status);
CREATE INDEX IF NOT EXISTS posts_scheduled_for_idx ON public.posts(scheduled_for) WHERE status = 'scheduled';

-- Replace overly-permissive SELECT so drafts/scheduled stay private to owner
DROP POLICY IF EXISTS posts_select_all ON public.posts;
CREATE POLICY posts_select_published ON public.posts
  FOR SELECT USING (status = 'published');
CREATE POLICY posts_select_own_unpublished ON public.posts
  FOR SELECT USING (auth.uid() = user_id);

-- Fix posts_count trigger to count only published posts
CREATE OR REPLACE FUNCTION public.posts_count_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' then
      update public.profiles set posts_count = posts_count + 1 where user_id = new.user_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.status <> 'published' and new.status = 'published' then
      update public.profiles set posts_count = posts_count + 1 where user_id = new.user_id;
    elsif old.status = 'published' and new.status <> 'published' then
      update public.profiles set posts_count = greatest(posts_count - 1, 0) where user_id = new.user_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'published' then
      update public.profiles set posts_count = greatest(posts_count - 1, 0) where user_id = old.user_id;
    end if;
  end if;
  return null;
end; $$;

-- Ensure trigger covers UPDATE too
DROP TRIGGER IF EXISTS posts_count_trg ON public.posts;
CREATE TRIGGER posts_count_trg
AFTER INSERT OR UPDATE OF status OR DELETE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.posts_count_trg();

-- 2) post_views
CREATE TABLE IF NOT EXISTS public.post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  viewer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_views_post_idx ON public.post_views(post_id);
CREATE INDEX IF NOT EXISTS post_views_post_viewer_idx ON public.post_views(post_id, viewer_id);
GRANT SELECT, INSERT ON public.post_views TO anon, authenticated;
GRANT ALL ON public.post_views TO service_role;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY pv_insert_any ON public.post_views FOR INSERT WITH CHECK (true);
CREATE POLICY pv_select_own_post ON public.post_views FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_views.post_id AND p.user_id = auth.uid()));

-- 3) collections
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY collections_owner_all ON public.collections FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.collection_items (
  collection_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, post_id)
);
GRANT SELECT, INSERT, DELETE ON public.collection_items TO authenticated;
GRANT ALL ON public.collection_items TO service_role;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_owner_select ON public.collection_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.user_id = auth.uid()));
CREATE POLICY ci_owner_insert ON public.collection_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.user_id = auth.uid()));
CREATE POLICY ci_owner_delete ON public.collection_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.user_id = auth.uid()));

-- 4) close_friends
CREATE TABLE IF NOT EXISTS public.close_friends (
  owner_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, friend_id)
);
GRANT SELECT, INSERT, DELETE ON public.close_friends TO authenticated;
GRANT ALL ON public.close_friends TO service_role;
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY cf_owner_select ON public.close_friends FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = friend_id);
CREATE POLICY cf_owner_insert ON public.close_friends FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY cf_owner_delete ON public.close_friends FOR DELETE
  USING (auth.uid() = owner_id);

-- 5) stories.audience
DO $$ BEGIN
  CREATE TYPE public.story_audience AS ENUM ('public','close_friends');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS audience public.story_audience NOT NULL DEFAULT 'public';

DROP POLICY IF EXISTS stories_select_all ON public.stories;
CREATE POLICY stories_select_visible ON public.stories FOR SELECT
  USING (
    expires_at > now()
    AND (
      audience = 'public'
      OR user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.close_friends cf WHERE cf.owner_id = stories.user_id AND cf.friend_id = auth.uid())
    )
  );

-- 6) profiles activity status
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS show_activity boolean NOT NULL DEFAULT true;
