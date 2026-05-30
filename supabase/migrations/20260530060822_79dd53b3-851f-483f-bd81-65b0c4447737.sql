
-- 1. Reels flag
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_reel boolean NOT NULL DEFAULT false;
UPDATE public.posts SET is_reel = true WHERE media_type = 'video';

-- 2. Stories
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
GRANT SELECT ON public.stories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY stories_select_all ON public.stories FOR SELECT USING (expires_at > now());
CREATE POLICY stories_insert_own ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY stories_delete_own ON public.stories FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS stories_user_idx ON public.stories(user_id, created_at DESC);

ALTER TABLE public.stories ADD CONSTRAINT stories_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 3. Saves
CREATE TABLE IF NOT EXISTS public.saves (
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
GRANT SELECT, INSERT, DELETE ON public.saves TO authenticated;
GRANT ALL ON public.saves TO service_role;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY saves_select_own ON public.saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY saves_insert_own ON public.saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY saves_delete_own ON public.saves FOR DELETE USING (auth.uid() = user_id);

-- 4. Verification requests
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  category text NOT NULL,
  id_doc_url text,
  links text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY vr_select_own ON public.verification_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY vr_insert_own ON public.verification_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY vr_update_own ON public.verification_requests FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- 5. Storage bucket for verification docs (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "vdocs_owner_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "vdocs_owner_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
