
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.wallet_status AS ENUM ('active','pending','restricted','suspended','frozen','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wallet_bucket AS ENUM ('purchased','reward','gift','ads','bonus','locked','pending','withdrawable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wallet_source AS ENUM ('purchase','gift','reward','ads','marketplace','subscription','withdrawal','refund','tip','adjustment','transfer','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wallet_risk_level AS ENUM ('normal','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ TABLES ============
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  wallet_id text NOT NULL UNIQUE,
  handle text NOT NULL UNIQUE,
  status public.wallet_status NOT NULL DEFAULT 'active',
  version text NOT NULL DEFAULT 'v1.0.0',
  trust_score integer NOT NULL DEFAULT 70,
  security_score integer NOT NULL DEFAULT 60,
  risk_level public.wallet_risk_level NOT NULL DEFAULT 'normal',
  frozen_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.wallet_balances (
  wallet_id uuid PRIMARY KEY REFERENCES public.wallets(id) ON DELETE CASCADE,
  purchased bigint NOT NULL DEFAULT 0 CHECK (purchased >= 0),
  reward bigint NOT NULL DEFAULT 0 CHECK (reward >= 0),
  gift bigint NOT NULL DEFAULT 0 CHECK (gift >= 0),
  ads bigint NOT NULL DEFAULT 0 CHECK (ads >= 0),
  bonus bigint NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  locked bigint NOT NULL DEFAULT 0 CHECK (locked >= 0),
  pending bigint NOT NULL DEFAULT 0 CHECK (pending >= 0),
  withdrawable bigint NOT NULL DEFAULT 0 CHECK (withdrawable >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_balances TO authenticated;
GRANT ALL ON public.wallet_balances TO service_role;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_id text NOT NULL,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  counterparty_wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  bucket public.wallet_bucket NOT NULL,
  source public.wallet_source NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  fee bigint NOT NULL DEFAULT 0 CHECK (fee >= 0),
  balance_after bigint NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_ledger_wallet_idx ON public.wallet_ledger(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_ledger_txn_idx ON public.wallet_ledger(txn_id);
GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT ALL ON public.wallet_ledger TO service_role;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.wallet_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  from_status public.wallet_status,
  to_status public.wallet_status NOT NULL,
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_status_history TO authenticated;
GRANT ALL ON public.wallet_status_history TO service_role;
ALTER TABLE public.wallet_status_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.wallet_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  note text NOT NULL,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_notes TO authenticated;
GRANT ALL ON public.wallet_notes TO service_role;
ALTER TABLE public.wallet_notes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.wallet_risk_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  level public.wallet_risk_level NOT NULL DEFAULT 'medium',
  kind text NOT NULL,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.wallet_risk_alerts TO authenticated;
GRANT ALL ON public.wallet_risk_alerts TO service_role;
ALTER TABLE public.wallet_risk_alerts ENABLE ROW LEVEL SECURITY;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.wallet_is_finance(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.is_finance_staff(_uid), false) OR coalesce(public.is_admin_os_founder(), false);
$$;

CREATE OR REPLACE FUNCTION public.wallet_is_staff(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.is_admin_os_staff(), false) OR coalesce(public.wallet_is_finance(_uid), false);
$$;

CREATE OR REPLACE FUNCTION public.wallet_owner(_wallet uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.wallets WHERE id = _wallet;
$$;

-- ============ POLICIES ============
CREATE POLICY "wallets_select_own" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.wallet_is_staff());

CREATE POLICY "wallet_balances_select" ON public.wallet_balances FOR SELECT TO authenticated
  USING (public.wallet_owner(wallet_id) = auth.uid() OR public.wallet_is_staff());

CREATE POLICY "wallet_ledger_select" ON public.wallet_ledger FOR SELECT TO authenticated
  USING (public.wallet_owner(wallet_id) = auth.uid() OR public.wallet_is_staff());

CREATE POLICY "wallet_status_history_select" ON public.wallet_status_history FOR SELECT TO authenticated
  USING (public.wallet_owner(wallet_id) = auth.uid() OR public.wallet_is_staff());

CREATE POLICY "wallet_notes_staff_select" ON public.wallet_notes FOR SELECT TO authenticated
  USING (public.wallet_is_staff());
CREATE POLICY "wallet_notes_staff_insert" ON public.wallet_notes FOR INSERT TO authenticated
  WITH CHECK (public.wallet_is_staff() AND author_id = auth.uid());

CREATE POLICY "wallet_risk_staff_select" ON public.wallet_risk_alerts FOR SELECT TO authenticated
  USING (public.wallet_is_staff());
CREATE POLICY "wallet_risk_finance_update" ON public.wallet_risk_alerts FOR UPDATE TO authenticated
  USING (public.wallet_is_finance()) WITH CHECK (public.wallet_is_finance());

-- ============ IMMUTABILITY ============
CREATE OR REPLACE FUNCTION public.wallet_ledger_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'wallet_ledger is append-only';
END; $$;

DROP TRIGGER IF EXISTS wallet_ledger_no_update ON public.wallet_ledger;
CREATE TRIGGER wallet_ledger_no_update BEFORE UPDATE OR DELETE ON public.wallet_ledger
  FOR EACH ROW EXECUTE FUNCTION public.wallet_ledger_immutable();

-- ============ WALLET PROVISIONING ============
CREATE OR REPLACE FUNCTION public.wallet_generate_id()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  LOOP
    v := 'AUX-' || lpad((floor(random()*10000))::int::text, 4, '0')
              || '-' || lpad((floor(random()*10000))::int::text, 4, '0')
              || '-' || lpad((floor(random()*10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.wallet_id = v);
  END LOOP;
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.wallet_ensure(_user uuid DEFAULT auth.uid())
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wid uuid; base text; cand text; n int := 0;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'no user'; END IF;
  SELECT id INTO wid FROM public.wallets WHERE user_id = _user;
  IF wid IS NOT NULL THEN RETURN wid; END IF;

  SELECT coalesce(nullif(regexp_replace(lower(username), '[^a-z0-9._]', '', 'g'), ''), 'user')
    INTO base FROM public.profiles WHERE user_id = _user;
  base := coalesce(base, 'user');
  cand := base || '.wallet';
  WHILE EXISTS (SELECT 1 FROM public.wallets w WHERE w.handle = cand) LOOP
    n := n + 1; cand := base || n::text || '.wallet';
  END LOOP;

  INSERT INTO public.wallets (user_id, wallet_id, handle)
  VALUES (_user, public.wallet_generate_id(), cand)
  RETURNING id INTO wid;

  INSERT INTO public.wallet_balances (wallet_id) VALUES (wid) ON CONFLICT DO NOTHING;
  INSERT INTO public.wallet_status_history (wallet_id, to_status, reason)
  VALUES (wid, 'active', 'Wallet created');
  RETURN wid;
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_ensure(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.wallet_on_profile_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.wallet_ensure(NEW.user_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS wallet_provision_on_profile ON public.profiles;
CREATE TRIGGER wallet_provision_on_profile AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.wallet_on_profile_created();

-- ============ MONEY MOVEMENT (server side only) ============
CREATE OR REPLACE FUNCTION public.wallet_apply(
  _wallet uuid, _direction text, _bucket public.wallet_bucket, _source public.wallet_source,
  _amount bigint, _fee bigint DEFAULT 0, _label text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb, _counterparty uuid DEFAULT NULL,
  _actor uuid DEFAULT NULL, _txn text DEFAULT NULL
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur bigint; nb bigint; txn text; st public.wallet_status;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  SELECT status INTO st FROM public.wallets WHERE id = _wallet FOR UPDATE;
  IF st IS NULL THEN RAISE EXCEPTION 'wallet not found'; END IF;
  IF st IN ('frozen','suspended','closed') AND _direction = 'debit' THEN
    RAISE EXCEPTION 'wallet is % — debits blocked', st;
  END IF;

  EXECUTE format('SELECT %I FROM public.wallet_balances WHERE wallet_id = $1 FOR UPDATE', _bucket)
    INTO cur USING _wallet;
  IF cur IS NULL THEN
    INSERT INTO public.wallet_balances (wallet_id) VALUES (_wallet) ON CONFLICT DO NOTHING;
    cur := 0;
  END IF;

  IF _direction = 'credit' THEN nb := cur + _amount;
  ELSE
    nb := cur - _amount - coalesce(_fee, 0);
    IF nb < 0 THEN RAISE EXCEPTION 'insufficient % balance', _bucket; END IF;
  END IF;

  EXECUTE format('UPDATE public.wallet_balances SET %I = $1, updated_at = now() WHERE wallet_id = $2', _bucket)
    USING nb, _wallet;

  txn := coalesce(_txn, 'TXN' || to_char(now(), 'YYMMDD') || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8)));

  INSERT INTO public.wallet_ledger (txn_id, wallet_id, counterparty_wallet_id, direction, bucket, source,
                                    amount, fee, balance_after, label, metadata, created_by)
  VALUES (txn, _wallet, _counterparty, _direction, _bucket, _source, _amount, coalesce(_fee,0), nb,
          _label, coalesce(_metadata,'{}'::jsonb), _actor);
  RETURN txn;
END; $$;

CREATE OR REPLACE FUNCTION public.wallet_transfer(
  _from uuid, _to uuid, _amount bigint, _fee bigint DEFAULT 0,
  _source public.wallet_source DEFAULT 'gift', _label text DEFAULT NULL, _actor uuid DEFAULT NULL
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE txn text;
BEGIN
  IF _from = _to THEN RAISE EXCEPTION 'cannot transfer to self'; END IF;
  txn := 'TXN' || to_char(now(), 'YYMMDD') || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8));
  PERFORM public.wallet_apply(_from, 'debit', 'purchased', _source, _amount, _fee, _label, '{}'::jsonb, _to, _actor, txn);
  PERFORM public.wallet_apply(_to, 'credit', 'gift', _source, _amount, 0, _label, '{}'::jsonb, _from, _actor, txn);
  RETURN txn;
END; $$;

CREATE OR REPLACE FUNCTION public.wallet_set_status(_wallet uuid, _status public.wallet_status, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev public.wallet_status;
BEGIN
  IF NOT public.wallet_is_finance() THEN RAISE EXCEPTION 'Finance Department only'; END IF;
  SELECT status INTO prev FROM public.wallets WHERE id = _wallet;
  UPDATE public.wallets SET status = _status, frozen_reason = _reason, updated_at = now() WHERE id = _wallet;
  INSERT INTO public.wallet_status_history (wallet_id, from_status, to_status, reason, changed_by)
  VALUES (_wallet, prev, _status, _reason, auth.uid());
  INSERT INTO public.admin_audit_logs (action, resource_type, resource_id, user_id, details, severity)
  VALUES ('wallet.status_change', 'wallet', _wallet::text, auth.uid(),
          jsonb_build_object('from', prev, 'to', _status, 'reason', _reason), 'warning');
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_set_status(uuid, public.wallet_status, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.wallet_manual_adjust(
  _wallet uuid, _direction text, _bucket public.wallet_bucket, _amount bigint, _reason text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE txn text;
BEGIN
  IF NOT public.wallet_is_finance() THEN RAISE EXCEPTION 'Finance Department only'; END IF;
  IF coalesce(trim(_reason), '') = '' THEN RAISE EXCEPTION 'reason required'; END IF;
  txn := public.wallet_apply(_wallet, _direction, _bucket, 'adjustment', _amount, 0, _reason,
                             jsonb_build_object('manual', true, 'reason', _reason), NULL, auth.uid(), NULL);
  INSERT INTO public.admin_audit_logs (action, resource_type, resource_id, user_id, details, severity)
  VALUES ('wallet.manual_' || _direction, 'wallet', _wallet::text, auth.uid(),
          jsonb_build_object('amount', _amount, 'bucket', _bucket, 'reason', _reason, 'txn', txn), 'warning');
  RETURN txn;
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_manual_adjust(uuid, text, public.wallet_bucket, bigint, text) TO authenticated;

-- ============ READ RPCs ============
CREATE OR REPLACE FUNCTION public.wallet_overview(_user uuid DEFAULT auth.uid())
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE w record; b record; res jsonb;
BEGIN
  IF _user <> auth.uid() AND NOT public.wallet_is_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO w FROM public.wallets WHERE user_id = _user;
  IF w IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO b FROM public.wallet_balances WHERE wallet_id = w.id;
  res := jsonb_build_object(
    'wallet_id', w.wallet_id, 'handle', w.handle, 'status', w.status, 'version', w.version,
    'trust_score', w.trust_score, 'security_score', w.security_score, 'risk_level', w.risk_level,
    'created_at', w.created_at,
    'balances', jsonb_build_object(
      'purchased', coalesce(b.purchased,0), 'reward', coalesce(b.reward,0), 'gift', coalesce(b.gift,0),
      'ads', coalesce(b.ads,0), 'bonus', coalesce(b.bonus,0), 'locked', coalesce(b.locked,0),
      'pending', coalesce(b.pending,0), 'withdrawable', coalesce(b.withdrawable,0)),
    'total', coalesce(b.purchased,0)+coalesce(b.reward,0)+coalesce(b.gift,0)+coalesce(b.ads,0)+coalesce(b.bonus,0),
    'earned', (SELECT coalesce(sum(amount),0) FROM public.wallet_ledger WHERE wallet_id = w.id AND direction='credit'),
    'spent', (SELECT coalesce(sum(amount+fee),0) FROM public.wallet_ledger WHERE wallet_id = w.id AND direction='debit')
  );
  RETURN res;
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_overview(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.wallet_analytics(_user uuid DEFAULT auth.uid(), _days int DEFAULT 30)
RETURNS TABLE(day date, income bigint, expense bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d::date,
    coalesce(sum(l.amount) FILTER (WHERE l.direction='credit'), 0)::bigint,
    coalesce(sum(l.amount + l.fee) FILTER (WHERE l.direction='debit'), 0)::bigint
  FROM generate_series(current_date - (_days - 1), current_date, interval '1 day') d
  LEFT JOIN public.wallet_ledger l
    ON l.created_at::date = d::date
   AND l.wallet_id = (SELECT id FROM public.wallets WHERE user_id = coalesce(_user, auth.uid()))
  WHERE coalesce(_user, auth.uid()) = auth.uid() OR public.wallet_is_staff()
  GROUP BY d ORDER BY d;
$$;
GRANT EXECUTE ON FUNCTION public.wallet_analytics(uuid, int) TO authenticated;

-- ============ BACKFILL ============
DO $$
DECLARE r record; wid uuid; bal bigint;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles LOOP
    BEGIN
      wid := public.wallet_ensure(r.user_id);
      SELECT coalesce(coin_balance, 0) INTO bal FROM public.profiles_private WHERE user_id = r.user_id;
      IF coalesce(bal,0) > 0 THEN
        UPDATE public.wallet_balances SET purchased = bal WHERE wallet_id = wid AND purchased = 0;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;
