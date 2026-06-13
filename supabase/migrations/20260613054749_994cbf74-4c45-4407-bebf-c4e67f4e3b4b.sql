
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS authenticity_score smallint,
  ADD COLUMN IF NOT EXISTS authenticity_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS authenticity_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS posts_authenticity_score_idx ON public.posts(authenticity_score);
