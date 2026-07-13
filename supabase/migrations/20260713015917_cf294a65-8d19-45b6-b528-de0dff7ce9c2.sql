
-- Extend live_streams with paid/access controls
ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS ticket_price_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tips_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_gifts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'live_streams_access_type_chk'
  ) THEN
    ALTER TABLE public.live_streams
      ADD CONSTRAINT live_streams_access_type_chk
      CHECK (access_type IN ('free','ticket','subscribers_only'));
  END IF;
END $$;

-- Tickets
CREATE TABLE IF NOT EXISTS public.live_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  price_coins integer NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stream_id, user_id)
);
GRANT SELECT, INSERT ON public.live_tickets TO authenticated;
GRANT ALL ON public.live_tickets TO service_role;
ALTER TABLE public.live_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tickets read" ON public.live_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_id AND s.host_id = auth.uid()));

-- Gift catalog
CREATE TABLE IF NOT EXISTS public.live_gifts_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL,
  cost_coins integer NOT NULL,
  animation text NOT NULL DEFAULT 'float',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.live_gifts_catalog TO anon, authenticated;
GRANT ALL ON public.live_gifts_catalog TO service_role;
ALTER TABLE public.live_gifts_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gifts catalog readable" ON public.live_gifts_catalog FOR SELECT USING (true);

INSERT INTO public.live_gifts_catalog(id, name, icon, cost_coins, animation, sort_order) VALUES
  ('rose','Rose','🌹',5,'float',10),
  ('heart','Heart','💖',10,'float',20),
  ('star','Star','⭐',25,'burst',30),
  ('fire','Fire','🔥',50,'burst',40),
  ('rocket','Rocket','🚀',100,'rocket',50),
  ('crown','Crown','👑',250,'burst',60),
  ('diamond','Diamond','💎',500,'burst',70),
  ('fireworks','Fireworks','🎆',1000,'rocket',80)
ON CONFLICT (id) DO NOTHING;

-- Gift log
CREATE TABLE IF NOT EXISTS public.live_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  host_id uuid NOT NULL,
  gift_id text NOT NULL REFERENCES public.live_gifts_catalog(id),
  qty integer NOT NULL DEFAULT 1,
  coins_total integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_gifts_stream_idx ON public.live_gifts(stream_id, created_at DESC);
GRANT SELECT, INSERT ON public.live_gifts TO authenticated;
GRANT ALL ON public.live_gifts TO service_role;
ALTER TABLE public.live_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gifts readable by stream viewers" ON public.live_gifts
  FOR SELECT TO authenticated USING (true);

-- Realtime for gifts (chat/reactions already broadcasting via existing channel)
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_gifts;
