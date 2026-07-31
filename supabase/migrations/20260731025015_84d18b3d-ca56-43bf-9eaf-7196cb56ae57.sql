ALTER TABLE public.aap_ad_groups
  ADD COLUMN IF NOT EXISTS targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_reach bigint;