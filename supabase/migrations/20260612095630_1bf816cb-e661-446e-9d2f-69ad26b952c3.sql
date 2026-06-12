
-- Posts flag
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS has_certificate boolean NOT NULL DEFAULT false;

-- Table
CREATE TABLE public.ownership_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE UNIQUE,
  creator_id uuid NOT NULL,
  content_hash text NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  ots_proof bytea,
  ots_status text NOT NULL DEFAULT 'pending' CHECK (ots_status IN ('pending','confirmed','failed')),
  ots_confirmed_at timestamptz,
  bitcoin_block_height int,
  ots_last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ownership_certificates_hash_idx ON public.ownership_certificates(content_hash);
CREATE INDEX ownership_certificates_creator_idx ON public.ownership_certificates(creator_id);
CREATE INDEX ownership_certificates_pending_idx ON public.ownership_certificates(ots_status) WHERE ots_status = 'pending';

GRANT SELECT ON public.ownership_certificates TO anon;
GRANT SELECT, INSERT ON public.ownership_certificates TO authenticated;
GRANT ALL ON public.ownership_certificates TO service_role;

ALTER TABLE public.ownership_certificates ENABLE ROW LEVEL SECURITY;

-- Public read for verification page
CREATE POLICY "ownership_certificates_public_read"
  ON public.ownership_certificates FOR SELECT
  USING (true);

-- Creator can insert only their own cert for their own post
CREATE POLICY "ownership_certificates_owner_insert"
  ON public.ownership_certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid())
  );

CREATE TRIGGER ownership_certificates_set_updated_at
  BEFORE UPDATE ON public.ownership_certificates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public RPC for verify-by-hash
CREATE OR REPLACE FUNCTION public.get_certificate_by_hash(_hash text)
RETURNS TABLE(
  id uuid, post_id uuid, creator_id uuid, content_hash text,
  media_url text, media_type text, ots_status text,
  ots_confirmed_at timestamptz, bitcoin_block_height int,
  created_at timestamptz,
  creator_username text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.post_id, c.creator_id, c.content_hash,
         c.media_url, c.media_type, c.ots_status,
         c.ots_confirmed_at, c.bitcoin_block_height,
         c.created_at,
         p.username AS creator_username
  FROM public.ownership_certificates c
  LEFT JOIN public.profiles p ON p.user_id = c.creator_id
  WHERE c.content_hash = lower(_hash)
  ORDER BY c.created_at ASC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_certificate_by_hash(text) TO anon, authenticated;
