
-- Gift Aura between wallets
CREATE OR REPLACE FUNCTION public.wallet_gift(_to_handle text, _amount bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE from_w uuid; to_w uuid; fee bigint; txn text; st public.wallet_status;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT id, status INTO from_w, st FROM public.wallets WHERE user_id = auth.uid();
  IF from_w IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF st <> 'active' THEN RAISE EXCEPTION 'Your wallet is % — gifting blocked', st; END IF;

  SELECT id INTO to_w FROM public.wallets WHERE handle = lower(replace(_to_handle, '@', ''));
  IF to_w IS NULL THEN RAISE EXCEPTION 'Recipient wallet not found'; END IF;
  IF to_w = from_w THEN RAISE EXCEPTION 'Cannot gift to yourself'; END IF;

  fee := greatest(1, (_amount * 1) / 100);
  txn := 'GFT' || to_char(now(), 'YYMMDD') || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8));

  PERFORM public.wallet_apply(from_w, 'debit', 'purchased', 'gift', _amount, fee,
    'Gift to @' || lower(replace(_to_handle, '@', '')), jsonb_build_object('fee', fee), to_w, auth.uid(), txn);
  PERFORM public.wallet_apply(to_w, 'credit', 'gift', 'gift', _amount, 0,
    'Gift received', '{}'::jsonb, from_w, auth.uid(), txn);

  RETURN jsonb_build_object('txn_id', txn, 'amount', _amount, 'fee', fee, 'total', _amount + fee);
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_gift(text, bigint) TO authenticated;

-- Public (safe) wallet lookup for gifting
CREATE OR REPLACE FUNCTION public.wallet_lookup(_handle text)
RETURNS TABLE(handle text, display_name text, username text, avatar_url text, verified boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.handle, p.display_name, p.username, p.avatar_url, p.verified
  FROM public.wallets w
  JOIN public.profiles p ON p.user_id = w.user_id
  WHERE w.handle = lower(replace(coalesce(_handle,''), '@', ''))
    AND w.status = 'active'
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.wallet_lookup(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_lookup(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.wallet_search_handles(_q text)
RETURNS TABLE(handle text, display_name text, username text, avatar_url text, verified boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.handle, p.display_name, p.username, p.avatar_url, p.verified
  FROM public.wallets w
  JOIN public.profiles p ON p.user_id = w.user_id
  WHERE w.status = 'active'
    AND coalesce(trim(_q), '') <> ''
    AND (w.handle ILIKE '%' || _q || '%' OR p.username ILIKE '%' || _q || '%' OR p.display_name ILIKE '%' || _q || '%')
    AND w.user_id <> auth.uid()
  ORDER BY p.verified DESC, p.username
  LIMIT 12;
$$;
REVOKE EXECUTE ON FUNCTION public.wallet_search_handles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_search_handles(text) TO authenticated;

-- Withdrawal request (Finance reviews)
CREATE OR REPLACE FUNCTION public.wallet_request_withdrawal(_amount bigint, _method text DEFAULT 'upi')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w uuid; avail bigint; txn text; ref text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT id INTO w FROM public.wallets WHERE user_id = auth.uid() AND status = 'active';
  IF w IS NULL THEN RAISE EXCEPTION 'Wallet not available for withdrawal'; END IF;

  SELECT withdrawable INTO avail FROM public.wallet_balances WHERE wallet_id = w;
  IF coalesce(avail, 0) < _amount THEN RAISE EXCEPTION 'Insufficient withdrawable balance'; END IF;

  ref := 'WDW' || to_char(now(), 'YYMMDD') || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8));
  txn := public.wallet_apply(w, 'debit', 'withdrawable', 'withdrawal', _amount, 0,
          'Withdrawal requested', jsonb_build_object('reference', ref, 'method', _method), NULL, auth.uid(), ref);
  PERFORM public.wallet_apply(w, 'credit', 'pending', 'withdrawal', _amount, 0,
          'Withdrawal in review', jsonb_build_object('reference', ref), NULL, auth.uid(), ref);

  INSERT INTO public.payout_requests (user_id, amount_cents, status, method)
  VALUES (auth.uid(), _amount * 100, 'pending', _method);

  RETURN jsonb_build_object('reference', ref, 'txn_id', txn, 'amount', _amount);
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_request_withdrawal(bigint, text) TO authenticated;

-- Admin wallet search
CREATE OR REPLACE FUNCTION public.wallet_admin_search(_q text)
RETURNS TABLE(
  wallet_uuid uuid, wallet_id text, handle text, username text, display_name text,
  avatar_url text, status public.wallet_status, risk_level public.wallet_risk_level,
  trust_score integer, total bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.wallet_is_staff() THEN RAISE EXCEPTION 'Staff only'; END IF;
  RETURN QUERY
  SELECT w.id, w.wallet_id, w.handle, p.username, p.display_name, p.avatar_url,
         w.status, w.risk_level, w.trust_score,
         (coalesce(b.purchased,0)+coalesce(b.reward,0)+coalesce(b.gift,0)+coalesce(b.ads,0)+coalesce(b.bonus,0))::bigint
  FROM public.wallets w
  JOIN public.profiles p ON p.user_id = w.user_id
  LEFT JOIN public.wallet_balances b ON b.wallet_id = w.id
  LEFT JOIN auth.users u ON u.id = w.user_id
  WHERE coalesce(trim(_q), '') = ''
     OR w.wallet_id ILIKE '%' || _q || '%'
     OR w.handle ILIKE '%' || _q || '%'
     OR p.username ILIKE '%' || _q || '%'
     OR p.display_name ILIKE '%' || _q || '%'
     OR u.email ILIKE '%' || _q || '%'
     OR u.phone ILIKE '%' || _q || '%'
  ORDER BY w.created_at DESC
  LIMIT 40;
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_admin_search(text) TO authenticated;

-- Admin wallet profile
CREATE OR REPLACE FUNCTION public.wallet_admin_profile(_wallet uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE w record; b record; res jsonb;
BEGIN
  IF NOT public.wallet_is_staff() THEN RAISE EXCEPTION 'Staff only'; END IF;
  SELECT * INTO w FROM public.wallets WHERE id = _wallet;
  IF w IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO b FROM public.wallet_balances WHERE wallet_id = _wallet;

  SELECT jsonb_build_object(
    'wallet', jsonb_build_object(
      'id', w.id, 'wallet_id', w.wallet_id, 'handle', w.handle, 'status', w.status,
      'risk_level', w.risk_level, 'trust_score', w.trust_score, 'security_score', w.security_score,
      'created_at', w.created_at, 'frozen_reason', w.frozen_reason),
    'profile', (SELECT jsonb_build_object('username', p.username, 'display_name', p.display_name,
                  'avatar_url', p.avatar_url, 'verified', p.verified, 'is_creator', p.is_creator)
                FROM public.profiles p WHERE p.user_id = w.user_id),
    'balances', jsonb_build_object('purchased', coalesce(b.purchased,0), 'reward', coalesce(b.reward,0),
      'gift', coalesce(b.gift,0), 'ads', coalesce(b.ads,0), 'bonus', coalesce(b.bonus,0),
      'locked', coalesce(b.locked,0), 'pending', coalesce(b.pending,0), 'withdrawable', coalesce(b.withdrawable,0)),
    'ledger', coalesce((SELECT jsonb_agg(x) FROM (
        SELECT txn_id, direction, bucket, source, amount, fee, balance_after, status, label, created_at
        FROM public.wallet_ledger WHERE wallet_id = _wallet ORDER BY created_at DESC LIMIT 50) x), '[]'::jsonb),
    'status_history', coalesce((SELECT jsonb_agg(x) FROM (
        SELECT from_status, to_status, reason, created_at
        FROM public.wallet_status_history WHERE wallet_id = _wallet ORDER BY created_at DESC LIMIT 20) x), '[]'::jsonb),
    'notes', coalesce((SELECT jsonb_agg(x) FROM (
        SELECT note, author_id, created_at FROM public.wallet_notes
        WHERE wallet_id = _wallet ORDER BY created_at DESC LIMIT 20) x), '[]'::jsonb),
    'alerts', coalesce((SELECT jsonb_agg(x) FROM (
        SELECT id, level, kind, summary, resolved, created_at FROM public.wallet_risk_alerts
        WHERE wallet_id = _wallet ORDER BY created_at DESC LIMIT 20) x), '[]'::jsonb)
  ) INTO res;
  RETURN res;
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_admin_profile(uuid) TO authenticated;

-- Treasury
CREATE OR REPLACE FUNCTION public.wallet_treasury()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.wallet_is_finance() THEN RAISE EXCEPTION 'Finance Department only'; END IF;
  RETURN jsonb_build_object(
    'minted', (SELECT coalesce(sum(amount),0) FROM public.wallet_ledger WHERE direction = 'credit'),
    'burned', (SELECT coalesce(sum(amount + fee),0) FROM public.wallet_ledger WHERE direction = 'debit'),
    'fees', (SELECT coalesce(sum(fee),0) FROM public.wallet_ledger),
    'circulation', (SELECT coalesce(sum(purchased + reward + gift + ads + bonus),0) FROM public.wallet_balances),
    'pending_liability', (SELECT coalesce(sum(pending),0) FROM public.wallet_balances),
    'locked', (SELECT coalesce(sum(locked),0) FROM public.wallet_balances),
    'creator_liability', (SELECT coalesce(sum(withdrawable),0) FROM public.wallet_balances),
    'wallets', (SELECT count(*) FROM public.wallets),
    'frozen_wallets', (SELECT count(*) FROM public.wallets WHERE status IN ('frozen','suspended'))
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.wallet_treasury() TO authenticated;
