
-- ============ app_config ============
CREATE TABLE public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_config TO authenticated, anon;
GRANT ALL ON public.app_config TO service_role;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_config_read_all" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "app_config_admin_write" ON public.app_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.app_config (key, value) VALUES
  ('platform_fee_bps', '1500'::jsonb),
  ('min_payout_cents', '50000'::jsonb),
  ('min_tip_cents', '4900'::jsonb);

-- ============ tips ============
CREATE TABLE public.tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  platform_fee_cents integer NOT NULL DEFAULT 0,
  net_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'inr',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  stripe_session_id text UNIQUE,
  environment text NOT NULL DEFAULT 'sandbox',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX idx_tips_recipient ON public.tips(recipient_id, created_at DESC);
CREATE INDEX idx_tips_sender ON public.tips(sender_id, created_at DESC);
GRANT SELECT ON public.tips TO authenticated;
GRANT ALL ON public.tips TO service_role;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tips_read_involved" ON public.tips FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR public.has_role(auth.uid(), 'admin'));

-- ============ dm_unlocks ============
CREATE TABLE public.dm_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  net_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'inr',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  stripe_session_id text UNIQUE,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  UNIQUE (sender_id, recipient_id)
);
CREATE INDEX idx_dmu_recipient ON public.dm_unlocks(recipient_id);
GRANT SELECT ON public.dm_unlocks TO authenticated;
GRANT ALL ON public.dm_unlocks TO service_role;
ALTER TABLE public.dm_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dmu_read_involved" ON public.dm_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR public.has_role(auth.uid(), 'admin'));

-- ============ post_unlocks ============
CREATE TABLE public.post_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  net_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'inr',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  stripe_session_id text UNIQUE,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  UNIQUE (user_id, post_id)
);
CREATE INDEX idx_pu_creator ON public.post_unlocks(creator_id);
CREATE INDEX idx_pu_user ON public.post_unlocks(user_id);
GRANT SELECT ON public.post_unlocks TO authenticated;
GRANT ALL ON public.post_unlocks TO service_role;
ALTER TABLE public.post_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pu_read_involved" ON public.post_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin'));

-- ============ creator_balance ============
CREATE TABLE public.creator_balance (
  user_id uuid NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  available_cents bigint NOT NULL DEFAULT 0,
  pending_cents bigint NOT NULL DEFAULT 0,
  lifetime_earned_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'inr',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, environment)
);
GRANT SELECT ON public.creator_balance TO authenticated;
GRANT ALL ON public.creator_balance TO service_role;
ALTER TABLE public.creator_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cb_read_own" ON public.creator_balance FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============ payout_requests ============
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'inr',
  method text NOT NULL CHECK (method IN ('upi','bank')),
  payout_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  admin_note text,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX idx_pr_user ON public.payout_requests(user_id, created_at DESC);
CREATE INDEX idx_pr_status ON public.payout_requests(status);
GRANT SELECT, INSERT ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_read_own" ON public.payout_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pr_insert_own" ON public.payout_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pr_admin_update" ON public.payout_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ profile + post columns ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dm_price_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;

-- ============ credit_creator RPC (atomic balance bump) ============
CREATE OR REPLACE FUNCTION public.credit_creator(
  _user_id uuid,
  _environment text,
  _net_cents bigint,
  _currency text DEFAULT 'inr'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.creator_balance (user_id, environment, available_cents, lifetime_earned_cents, currency, updated_at)
  VALUES (_user_id, _environment, _net_cents, _net_cents, _currency, now())
  ON CONFLICT (user_id, environment) DO UPDATE
    SET available_cents = creator_balance.available_cents + EXCLUDED.available_cents,
        lifetime_earned_cents = creator_balance.lifetime_earned_cents + EXCLUDED.lifetime_earned_cents,
        updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.credit_creator(uuid, text, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_creator(uuid, text, bigint, text) TO service_role;

-- ============ request_payout RPC (atomic: move available -> pending + insert row) ============
CREATE OR REPLACE FUNCTION public.request_payout(
  _amount_cents bigint,
  _method text,
  _payout_detail jsonb,
  _environment text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _min bigint;
  _avail bigint;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _method NOT IN ('upi','bank') THEN RAISE EXCEPTION 'invalid method'; END IF;
  SELECT (value)::text::bigint INTO _min FROM public.app_config WHERE key = 'min_payout_cents';
  IF _amount_cents < COALESCE(_min, 50000) THEN RAISE EXCEPTION 'amount below minimum'; END IF;

  SELECT available_cents INTO _avail FROM public.creator_balance
    WHERE user_id = _uid AND environment = _environment FOR UPDATE;
  IF COALESCE(_avail,0) < _amount_cents THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  UPDATE public.creator_balance
    SET available_cents = available_cents - _amount_cents,
        pending_cents = pending_cents + _amount_cents,
        updated_at = now()
    WHERE user_id = _uid AND environment = _environment;

  INSERT INTO public.payout_requests (user_id, amount_cents, method, payout_detail, environment)
    VALUES (_uid, _amount_cents, _method, _payout_detail, _environment)
    RETURNING id INTO _id;
  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.request_payout(bigint, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_payout(bigint, text, jsonb, text) TO authenticated;
