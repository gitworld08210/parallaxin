
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE INDEX IF NOT EXISTS posts_user_pinned_idx ON public.posts (user_id, is_pinned, pinned_at DESC);

CREATE OR REPLACE FUNCTION public.toggle_post_pin(_post_id uuid, _pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
  _count int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  SELECT user_id INTO _owner FROM public.posts WHERE id = _post_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'post not found'; END IF;
  IF _owner <> _uid THEN RAISE EXCEPTION 'not your post' USING ERRCODE='42501'; END IF;

  IF _pin THEN
    SELECT count(*) INTO _count FROM public.posts WHERE user_id = _uid AND is_pinned = true AND id <> _post_id;
    IF _count >= 3 THEN RAISE EXCEPTION 'maximum 3 pinned posts'; END IF;
    UPDATE public.posts SET is_pinned = true, pinned_at = now() WHERE id = _post_id;
  ELSE
    UPDATE public.posts SET is_pinned = false, pinned_at = NULL WHERE id = _post_id;
  END IF;
END $$;
