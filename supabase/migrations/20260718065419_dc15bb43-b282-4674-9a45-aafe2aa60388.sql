
-- creator_subscription_settings
CREATE TABLE public.creator_subscription_settings (
  creator_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  monthly_price_coins integer NOT NULL DEFAULT 500 CHECK (monthly_price_coins BETWEEN 50 AND 100000),
  monthly_price_inr_cents integer NOT NULL DEFAULT 19900 CHECK (monthly_price_inr_cents BETWEEN 4900 AND 10000000),
  perks jsonb NOT NULL DEFAULT '["Exclusive posts","Subscriber-only lives","Priority DMs"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.creator_subscription_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.creator_subscription_settings TO authenticated;
GRANT ALL ON public.creator_subscription_settings TO service_role;
ALTER TABLE public.creator_subscription_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY css_read ON public.creator_subscription_settings FOR SELECT USING (enabled = true OR creator_id = auth.uid());
CREATE POLICY css_write_own ON public.creator_subscription_settings FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- creator_subscriptions
CREATE TABLE public.creator_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  price_coins integer NOT NULL,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subscriber_id, creator_id)
);
GRANT SELECT, INSERT, UPDATE ON public.creator_subscriptions TO authenticated;
GRANT ALL ON public.creator_subscriptions TO service_role;
ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cs_read ON public.creator_subscriptions FOR SELECT TO authenticated USING (subscriber_id = auth.uid() OR creator_id = auth.uid());
CREATE POLICY cs_update_own ON public.creator_subscriptions FOR UPDATE TO authenticated USING (subscriber_id = auth.uid()) WITH CHECK (subscriber_id = auth.uid());

-- coin_topup_requests
CREATE TABLE public.coin_topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coins integer NOT NULL CHECK (coins > 0),
  amount_inr_cents integer NOT NULL CHECK (amount_inr_cents > 0),
  status text NOT NULL DEFAULT 'pending',
  utr text UNIQUE,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid
);
GRANT SELECT, INSERT ON public.coin_topup_requests TO authenticated;
GRANT ALL ON public.coin_topup_requests TO service_role;
ALTER TABLE public.coin_topup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY ctr_read ON public.coin_topup_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY ctr_insert ON public.coin_topup_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER trg_css_updated BEFORE UPDATE ON public.creator_subscription_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.creator_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: create_coin_topup
CREATE OR REPLACE FUNCTION public.create_coin_topup(_coins integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _cents int; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF _coins IS NULL OR _coins < 100 OR _coins > 100000 THEN RAISE EXCEPTION 'invalid coin amount'; END IF;
  _cents := CASE
    WHEN _coins <= 100 THEN 4900
    WHEN _coins <= 500 THEN 19900
    WHEN _coins <= 1500 THEN 49900
    WHEN _coins <= 5000 THEN 149900
    ELSE _coins * 30
  END;
  INSERT INTO public.coin_topup_requests(user_id, coins, amount_inr_cents)
  VALUES (_uid, _coins, _cents) RETURNING id INTO _id;
  RETURN _id;
END $$;

-- RPC: verify_coin_topup_with_utr
CREATE OR REPLACE FUNCTION public.verify_coin_topup_with_utr(_topup_id uuid, _utr text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _row public.coin_topup_requests%ROWTYPE;
  _clean text := regexp_replace(coalesce(_utr,''), '\s', '', 'g'); _exists uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF _clean !~ '^[0-9]{12}$' THEN RAISE EXCEPTION 'UTR must be exactly 12 digits' USING ERRCODE='22023'; END IF;
  SELECT * INTO _row FROM public.coin_topup_requests WHERE id=_topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  IF _row.user_id <> _uid THEN RAISE EXCEPTION 'not yours' USING ERRCODE='42501'; END IF;
  IF _row.status IN ('pending_review','approved') THEN
    RETURN jsonb_build_object('status',_row.status,'already',true);
  END IF;
  SELECT id INTO _exists FROM public.coin_topup_requests WHERE utr=_clean AND id<>_topup_id LIMIT 1;
  IF _exists IS NOT NULL THEN RAISE EXCEPTION 'UTR already used' USING ERRCODE='23505'; END IF;
  UPDATE public.coin_topup_requests SET utr=_clean, status='pending_review', submitted_at=now() WHERE id=_topup_id;
  RETURN jsonb_build_object('status','pending_review');
END $$;

-- RPC: subscribe_creator (atomic: debit coins, credit creator, upsert sub)
CREATE OR REPLACE FUNCTION public.subscribe_creator(_creator_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _settings public.creator_subscription_settings%ROWTYPE;
  _bal int; _fee_bps int; _fee bigint; _net bigint; _amount_cents int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF _uid = _creator_id THEN RAISE EXCEPTION 'cannot subscribe to yourself'; END IF;
  SELECT * INTO _settings FROM public.creator_subscription_settings WHERE creator_id=_creator_id AND enabled=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'subscriptions not enabled' USING ERRCODE='P0001'; END IF;

  SELECT coin_balance INTO _bal FROM public.profiles_private WHERE user_id=_uid FOR UPDATE;
  IF COALESCE(_bal,0) < _settings.monthly_price_coins THEN
    RAISE EXCEPTION 'insufficient coins' USING ERRCODE='P0001';
  END IF;

  UPDATE public.profiles_private SET coin_balance = coin_balance - _settings.monthly_price_coins, updated_at=now() WHERE user_id=_uid;
  INSERT INTO public.coin_transactions(user_id, amount, kind, environment)
    VALUES (_uid, -_settings.monthly_price_coins, 'subscription', 'live');

  _amount_cents := _settings.monthly_price_inr_cents;
  SELECT (value #>> '{}')::int INTO _fee_bps FROM public.app_config WHERE key='platform_fee_bps';
  _fee_bps := COALESCE(_fee_bps, 1500);
  _fee := (_amount_cents::bigint * _fee_bps) / 10000;
  _net := _amount_cents::bigint - _fee;

  INSERT INTO public.creator_balance(user_id, available_cents, pending_cents, lifetime_earned_cents, currency, environment, updated_at)
  VALUES (_creator_id, _net, 0, _net, 'inr', 'live', now())
  ON CONFLICT (user_id, environment) DO UPDATE
    SET available_cents = public.creator_balance.available_cents + EXCLUDED.available_cents,
        lifetime_earned_cents = public.creator_balance.lifetime_earned_cents + EXCLUDED.lifetime_earned_cents,
        updated_at = now();

  INSERT INTO public.creator_subscriptions(subscriber_id, creator_id, price_coins, current_period_start, current_period_end, status)
  VALUES (_uid, _creator_id, _settings.monthly_price_coins, now(), now() + interval '30 days', 'active')
  ON CONFLICT (subscriber_id, creator_id) DO UPDATE
    SET status='active',
        current_period_start = GREATEST(public.creator_subscriptions.current_period_end, now()),
        current_period_end = GREATEST(public.creator_subscriptions.current_period_end, now()) + interval '30 days',
        cancel_at_period_end=false,
        updated_at=now();

  RETURN jsonb_build_object('ok', true, 'coins_debited', _settings.monthly_price_coins);
END $$;

CREATE OR REPLACE FUNCTION public.cancel_creator_subscription(_creator_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  UPDATE public.creator_subscriptions SET cancel_at_period_end=true, updated_at=now()
    WHERE subscriber_id=_uid AND creator_id=_creator_id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.has_creator_subscription(_subscriber uuid, _creator uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.creator_subscriptions
    WHERE subscriber_id=_subscriber AND creator_id=_creator
      AND status='active' AND current_period_end > now()
  );
$$;
