
-- Founder + Council fields on profiles
DO $$ BEGIN
  CREATE TYPE public.council_role AS ENUM ('architect','curator','sentinel','innovator');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_title text,
  ADD COLUMN IF NOT EXISTS founder_level int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aura_rank text,
  ADD COLUMN IF NOT EXISTS contribution_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS council_role public.council_role,
  ADD COLUMN IF NOT EXISTS join_era text;

CREATE INDEX IF NOT EXISTS profiles_founder_idx ON public.profiles(is_founder) WHERE is_founder = true;
CREATE INDEX IF NOT EXISTS profiles_council_idx ON public.profiles(council_role) WHERE council_role IS NOT NULL;

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_kind text NOT NULL CHECK (target_kind IN ('post','profile','comment','message')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_insert_own ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY reports_select_own ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);
