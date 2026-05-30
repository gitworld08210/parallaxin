ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chronicle text,
  ADD COLUMN IF NOT EXISTS signature_aura text,
  ADD COLUMN IF NOT EXISTS council_vote_weight integer NOT NULL DEFAULT 1;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text;