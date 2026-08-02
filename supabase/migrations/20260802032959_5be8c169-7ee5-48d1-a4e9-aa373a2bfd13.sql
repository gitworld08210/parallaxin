
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS shield_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS biometric_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alerts_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.wallet_overview(_user uuid DEFAULT auth.uid())
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE w record; b record; res jsonb;
BEGIN
  IF _user <> auth.uid() AND NOT public.wallet_is_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO w FROM public.wallets WHERE user_id = _user;
  IF w IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO b FROM public.wallet_balances WHERE wallet_id = w.id;
  res := jsonb_build_object(
    'id', w.id,
    'wallet_id', w.wallet_id, 'handle', w.handle, 'status', w.status, 'version', w.version,
    'trust_score', w.trust_score, 'security_score', w.security_score, 'risk_level', w.risk_level,
    'created_at', w.created_at,
    'shield_enabled', w.shield_enabled, 'biometric_enabled', w.biometric_enabled,
    'pin_enabled', w.pin_enabled, 'alerts_enabled', w.alerts_enabled,
    'balances', jsonb_build_object(
      'purchased', coalesce(b.purchased,0), 'reward', coalesce(b.reward,0), 'gift', coalesce(b.gift,0),
      'ads', coalesce(b.ads,0), 'bonus', coalesce(b.bonus,0), 'locked', coalesce(b.locked,0),
      'pending', coalesce(b.pending,0), 'withdrawable', coalesce(b.withdrawable,0)),
    'total', coalesce(b.purchased,0)+coalesce(b.reward,0)+coalesce(b.gift,0)+coalesce(b.ads,0)+coalesce(b.bonus,0),
    'earned', (SELECT coalesce(sum(amount),0) FROM public.wallet_ledger WHERE wallet_id = w.id AND direction='credit'),
    'spent', (SELECT coalesce(sum(amount+fee),0) FROM public.wallet_ledger WHERE wallet_id = w.id AND direction='debit')
  );
  RETURN res;
END; $function$;
