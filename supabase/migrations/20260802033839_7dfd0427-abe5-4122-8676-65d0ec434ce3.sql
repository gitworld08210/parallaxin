
DO $$ BEGIN
  CREATE TYPE public.wallet_card_type AS ENUM ('standard','verified','creator','organization','premium','founder','internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wallet_card_theme AS ENUM ('standard','creator','premium','elite','founder','organization','internal','holiday','anniversary','limited');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wallet_badge_kind AS ENUM ('verified','creator','premium','organization','early_supporter','top_creator','top_earner','community_leader','founder','internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wallet_card_security AS ENUM ('secure','review_recommended','refresh_recommended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CARDS ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  version integer NOT NULL,
  card_type public.wallet_card_type NOT NULL DEFAULT 'standard',
  theme public.wallet_card_theme NOT NULL DEFAULT 'standard',
  security_status public.wallet_card_security NOT NULL DEFAULT 'secure',
  encryption text NOT NULL DEFAULT 'AES-256-GCM',
  issued_at timestamptz NOT NULL DEFAULT now(),
  refresh_due_at timestamptz NOT NULL DEFAULT (now() + interval '730 days'),
  retired_at timestamptz,
  is_current boolean NOT NULL DEFAULT true,
  refresh_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_cards_current_idx ON public.wallet_cards(wallet_id) WHERE is_current;

GRANT SELECT ON public.wallet_cards TO authenticated;
GRANT ALL ON public.wallet_cards TO service_role;
ALTER TABLE public.wallet_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own cards" ON public.wallet_cards FOR SELECT TO authenticated
  USING (public.wallet_owner(wallet_id) = auth.uid());
CREATE POLICY "Staff read all cards" ON public.wallet_cards FOR SELECT TO authenticated
  USING (public.wallet_is_staff());

-- BADGES --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  badge public.wallet_badge_kind NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, badge)
);
GRANT SELECT ON public.wallet_badges TO authenticated;
GRANT ALL ON public.wallet_badges TO service_role;
ALTER TABLE public.wallet_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges readable by signed-in users" ON public.wallet_badges FOR SELECT TO authenticated USING (true);

-- SECURITY REVIEWS ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_security_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  score integer NOT NULL,
  grade text NOT NULL,
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  next_due_at timestamptz NOT NULL DEFAULT (now() + interval '180 days')
);
GRANT SELECT ON public.wallet_security_reviews TO authenticated;
GRANT ALL ON public.wallet_security_reviews TO service_role;
ALTER TABLE public.wallet_security_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own reviews" ON public.wallet_security_reviews FOR SELECT TO authenticated
  USING (public.wallet_owner(wallet_id) = auth.uid());
CREATE POLICY "Staff read reviews" ON public.wallet_security_reviews FOR SELECT TO authenticated
  USING (public.wallet_is_staff());

-- HELPERS -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wallet_card_type_for(_user uuid)
RETURNS public.wallet_card_type LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; staff boolean;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE user_id = _user;
  SELECT EXISTS(SELECT 1 FROM public.employees e WHERE e.user_id = _user) INTO staff;
  IF p.is_founder THEN RETURN 'founder'; END IF;
  IF staff THEN RETURN 'internal'; END IF;
  IF coalesce(p.account_type::text,'') IN ('organization','business') OR p.organization_id IS NOT NULL THEN RETURN 'organization'; END IF;
  IF coalesce(p.tier,'free') <> 'free' THEN RETURN 'premium'; END IF;
  IF p.is_creator THEN RETURN 'creator'; END IF;
  IF p.verified THEN RETURN 'verified'; END IF;
  RETURN 'standard';
END; $$;

CREATE OR REPLACE FUNCTION public.wallet_card_themes(_type public.wallet_card_type)
RETURNS public.wallet_card_theme[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _type
    WHEN 'founder' THEN ARRAY['founder','elite','premium','standard','anniversary','limited','holiday']::public.wallet_card_theme[]
    WHEN 'internal' THEN ARRAY['internal','elite','standard','anniversary','holiday']::public.wallet_card_theme[]
    WHEN 'organization' THEN ARRAY['organization','premium','standard','anniversary','holiday']::public.wallet_card_theme[]
    WHEN 'premium' THEN ARRAY['premium','elite','standard','anniversary','holiday']::public.wallet_card_theme[]
    WHEN 'creator' THEN ARRAY['creator','premium','standard','holiday']::public.wallet_card_theme[]
    WHEN 'verified' THEN ARRAY['standard','creator','holiday']::public.wallet_card_theme[]
    ELSE ARRAY['standard','holiday']::public.wallet_card_theme[]
  END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_sync_badges(_wallet uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid; p record; staff boolean; earned bigint; created timestamptz;
BEGIN
  SELECT user_id, created_at INTO u, created FROM public.wallets WHERE id = _wallet;
  IF u IS NULL THEN RETURN; END IF;
  SELECT * INTO p FROM public.profiles WHERE user_id = u;
  SELECT EXISTS(SELECT 1 FROM public.employees e WHERE e.user_id = u) INTO staff;
  SELECT coalesce(sum(amount),0) INTO earned FROM public.wallet_ledger WHERE wallet_id = _wallet AND direction = 'credit';

  INSERT INTO public.wallet_badges (wallet_id, badge)
  SELECT _wallet, b FROM (
    SELECT unnest(ARRAY[]::public.wallet_badge_kind[]) AS b
    UNION ALL SELECT 'verified'::public.wallet_badge_kind WHERE coalesce(p.verified,false)
    UNION ALL SELECT 'creator' WHERE coalesce(p.is_creator,false)
    UNION ALL SELECT 'premium' WHERE coalesce(p.tier,'free') <> 'free'
    UNION ALL SELECT 'organization' WHERE p.organization_id IS NOT NULL
    UNION ALL SELECT 'founder' WHERE coalesce(p.is_founder,false)
    UNION ALL SELECT 'internal' WHERE staff
    UNION ALL SELECT 'early_supporter' WHERE created < now() - interval '180 days'
    UNION ALL SELECT 'top_creator' WHERE coalesce(p.followers_count,0) >= 10000
    UNION ALL SELECT 'top_earner' WHERE earned >= 100000
    UNION ALL SELECT 'community_leader' WHERE coalesce(p.contribution_score,0) >= 500
  ) s
  ON CONFLICT (wallet_id, badge) DO NOTHING;
END; $$;

-- ISSUE / ENSURE ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wallet_card_ensure(_wallet uuid)
RETURNS public.wallet_cards LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.wallet_cards; u uuid; t public.wallet_card_type;
BEGIN
  SELECT user_id INTO u FROM public.wallets WHERE id = _wallet;
  IF u IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  t := public.wallet_card_type_for(u);

  SELECT * INTO c FROM public.wallet_cards WHERE wallet_id = _wallet AND is_current;
  IF c.id IS NULL THEN
    INSERT INTO public.wallet_cards (wallet_id, version, card_type, theme)
    VALUES (_wallet, 1, t, (public.wallet_card_themes(t))[1])
    RETURNING * INTO c;
  ELSIF c.card_type <> t THEN
    UPDATE public.wallet_cards SET card_type = t, updated_at = now()
    WHERE id = c.id RETURNING * INTO c;
  END IF;

  IF c.refresh_due_at < now() AND c.security_status <> 'refresh_recommended' THEN
    UPDATE public.wallet_cards SET security_status = 'refresh_recommended', updated_at = now()
    WHERE id = c.id RETURNING * INTO c;
  END IF;

  PERFORM public.wallet_sync_badges(_wallet);
  RETURN c;
END; $$;

CREATE OR REPLACE FUNCTION public.wallet_card_refresh(_reason text DEFAULT 'security_upgrade')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w uuid; cur public.wallet_cards; nxt public.wallet_cards; t public.wallet_card_type; u uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _reason NOT IN ('security_upgrade','new_encryption','design_upgrade','technology_upgrade') THEN
    RAISE EXCEPTION 'Invalid refresh reason';
  END IF;
  SELECT id, user_id INTO w, u FROM public.wallets WHERE user_id = auth.uid();
  IF w IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  cur := public.wallet_card_ensure(w);
  IF cur.issued_at > now() - interval '1 hour' AND cur.version > 1 THEN
    RAISE EXCEPTION 'Card was just refreshed — try again later';
  END IF;

  t := public.wallet_card_type_for(u);
  UPDATE public.wallet_cards SET is_current = false, retired_at = now(), updated_at = now() WHERE id = cur.id;

  INSERT INTO public.wallet_cards (wallet_id, version, card_type, theme, refresh_reason, encryption)
  VALUES (w, cur.version + 1, t, cur.theme, _reason,
          CASE WHEN _reason = 'new_encryption' THEN 'AES-256-GCM + PQ-Kyber' ELSE cur.encryption END)
  RETURNING * INTO nxt;

  RETURN jsonb_build_object('version', nxt.version, 'issued_at', nxt.issued_at,
    'refresh_due_at', nxt.refresh_due_at, 'reason', _reason);
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_card_refresh(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.wallet_card_set_theme(_theme public.wallet_card_theme)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w uuid; cur public.wallet_cards;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT id INTO w FROM public.wallets WHERE user_id = auth.uid();
  IF w IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  cur := public.wallet_card_ensure(w);
  IF NOT (_theme = ANY(public.wallet_card_themes(cur.card_type))) THEN
    RAISE EXCEPTION 'This edition is not unlocked for your card';
  END IF;
  UPDATE public.wallet_cards SET theme = _theme, updated_at = now() WHERE id = cur.id;
  RETURN jsonb_build_object('theme', _theme);
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_card_set_theme(public.wallet_card_theme) TO authenticated;

-- SECURITY REVIEW -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.wallet_security_review(_force boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record; last record; checks jsonb; score int := 0; grade text; devices int; u record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO w FROM public.wallets WHERE user_id = auth.uid();
  IF w IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  SELECT * INTO last FROM public.wallet_security_reviews
   WHERE wallet_id = w.id ORDER BY reviewed_at DESC LIMIT 1;
  IF last.id IS NOT NULL AND NOT _force AND last.next_due_at > now() THEN
    RETURN jsonb_build_object('score', last.score, 'grade', last.grade, 'checks', last.checks,
      'reviewed_at', last.reviewed_at, 'next_due_at', last.next_due_at, 'due', false);
  END IF;

  SELECT email, phone, email_confirmed_at, phone_confirmed_at INTO u FROM auth.users WHERE id = auth.uid();
  SELECT count(*) INTO devices FROM public.user_sessions s WHERE s.user_id = auth.uid();

  checks := jsonb_build_object(
    'password', true,
    'email', coalesce(u.email_confirmed_at IS NOT NULL, false),
    'phone', coalesce(u.phone_confirmed_at IS NOT NULL, false),
    'passkey', coalesce(w.biometric_enabled, false),
    'biometric', coalesce(w.biometric_enabled, false),
    'recovery', coalesce(w.pin_enabled, false),
    'shield', coalesce(w.shield_enabled, false),
    'alerts', coalesce(w.alerts_enabled, false),
    'trusted_devices', devices
  );

  score := 20
    + CASE WHEN (checks->>'email')::boolean THEN 15 ELSE 0 END
    + CASE WHEN (checks->>'phone')::boolean THEN 10 ELSE 0 END
    + CASE WHEN (checks->>'passkey')::boolean THEN 15 ELSE 0 END
    + CASE WHEN (checks->>'recovery')::boolean THEN 15 ELSE 0 END
    + CASE WHEN (checks->>'shield')::boolean THEN 15 ELSE 0 END
    + CASE WHEN (checks->>'alerts')::boolean THEN 5 ELSE 0 END
    + CASE WHEN devices BETWEEN 1 AND 3 THEN 5 ELSE 0 END;

  grade := CASE WHEN score >= 85 THEN 'Excellent' WHEN score >= 65 THEN 'Good'
                WHEN score >= 45 THEN 'Average' ELSE 'Weak' END;

  INSERT INTO public.wallet_security_reviews (wallet_id, score, grade, checks)
  VALUES (w.id, score, grade, checks);

  UPDATE public.wallets SET security_score = score, updated_at = now() WHERE id = w.id;
  UPDATE public.wallet_cards SET security_status =
    CASE WHEN score >= 65 THEN 'secure'::public.wallet_card_security ELSE 'review_recommended' END,
    updated_at = now()
   WHERE wallet_id = w.id AND is_current;

  RETURN jsonb_build_object('score', score, 'grade', grade, 'checks', checks,
    'reviewed_at', now(), 'next_due_at', now() + interval '180 days', 'due', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_security_review(boolean) TO authenticated;

-- CARD PAYLOAD --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wallet_card_state()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w uuid; cur public.wallet_cards; last record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT id INTO w FROM public.wallets WHERE user_id = auth.uid();
  IF w IS NULL THEN RETURN NULL; END IF;
  cur := public.wallet_card_ensure(w);
  SELECT * INTO last FROM public.wallet_security_reviews WHERE wallet_id = w ORDER BY reviewed_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'card', jsonb_build_object('id', cur.id, 'version', cur.version, 'card_type', cur.card_type,
      'theme', cur.theme, 'security_status', cur.security_status, 'encryption', cur.encryption,
      'issued_at', cur.issued_at, 'refresh_due_at', cur.refresh_due_at, 'refresh_reason', cur.refresh_reason),
    'themes', to_jsonb(public.wallet_card_themes(cur.card_type)),
    'badges', coalesce((SELECT jsonb_agg(badge ORDER BY granted_at) FROM public.wallet_badges WHERE wallet_id = w), '[]'::jsonb),
    'history', coalesce((SELECT jsonb_agg(x) FROM (
        SELECT version, card_type, theme, issued_at, retired_at, refresh_reason, is_current
        FROM public.wallet_cards WHERE wallet_id = w ORDER BY version) x), '[]'::jsonb),
    'review', CASE WHEN last.id IS NULL THEN NULL ELSE jsonb_build_object(
        'score', last.score, 'grade', last.grade, 'checks', last.checks,
        'reviewed_at', last.reviewed_at, 'next_due_at', last.next_due_at,
        'due', last.next_due_at < now()) END
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_card_state() TO authenticated;

CREATE OR REPLACE FUNCTION public.wallet_card_admin(_wallet uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.wallet_is_staff() THEN RAISE EXCEPTION 'Staff only'; END IF;
  RETURN jsonb_build_object(
    'cards', coalesce((SELECT jsonb_agg(x) FROM (
      SELECT version, card_type, theme, security_status, encryption, issued_at,
             refresh_due_at, retired_at, refresh_reason, is_current
      FROM public.wallet_cards WHERE wallet_id = _wallet ORDER BY version DESC) x), '[]'::jsonb),
    'badges', coalesce((SELECT jsonb_agg(badge ORDER BY granted_at) FROM public.wallet_badges WHERE wallet_id = _wallet), '[]'::jsonb),
    'reviews', coalesce((SELECT jsonb_agg(x) FROM (
      SELECT score, grade, checks, reviewed_at, next_due_at
      FROM public.wallet_security_reviews WHERE wallet_id = _wallet ORDER BY reviewed_at DESC LIMIT 10) x), '[]'::jsonb)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_card_admin(uuid) TO authenticated;

-- Backfill cards + badges for existing wallets
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.wallets LOOP
    PERFORM public.wallet_card_ensure(r.id);
  END LOOP;
END $$;
