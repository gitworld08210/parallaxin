-- Creator opt-in
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_creator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_since timestamptz,
  ADD COLUMN IF NOT EXISTS creator_terms_version text,
  ADD COLUMN IF NOT EXISTS creator_terms_accepted_at timestamptz;

-- App config seeds (idempotent)
INSERT INTO public.app_config (key, value)
VALUES
  ('creator_revenue_split', '{"creator": 85, "platform": 15}'::jsonb),
  ('creator_terms_version', '"2026-06-13"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Helper to check creator flag without RLS recursion
CREATE OR REPLACE FUNCTION public.is_creator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_creator FROM public.profiles WHERE user_id = _user_id), false)
$$;

-- RPC to opt in
CREATE OR REPLACE FUNCTION public.become_creator(_terms_version text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF _terms_version IS NULL OR length(_terms_version) = 0 THEN
    RAISE EXCEPTION 'terms version required' USING ERRCODE='22023';
  END IF;
  UPDATE public.profiles
    SET is_creator = true,
        creator_since = COALESCE(creator_since, now()),
        creator_terms_version = _terms_version,
        creator_terms_accepted_at = now(),
        updated_at = now()
    WHERE user_id = _uid;
END $$;

GRANT EXECUTE ON FUNCTION public.become_creator(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_creator(uuid) TO authenticated, anon;

-- Replace posts INSERT policy to require creator
DROP POLICY IF EXISTS posts_insert_own ON public.posts;
CREATE POLICY posts_insert_own ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_creator(auth.uid()));

-- Replace tips INSERT policy to require recipient is creator
DROP POLICY IF EXISTS tips_insert_sender ON public.tips;
CREATE POLICY tips_insert_sender ON public.tips
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_id <> recipient_id
    AND public.is_creator(recipient_id)
  );