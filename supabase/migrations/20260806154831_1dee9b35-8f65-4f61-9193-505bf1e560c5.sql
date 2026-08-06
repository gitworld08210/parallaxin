CREATE OR REPLACE FUNCTION public.guard_profiles_private_coin_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trusted_finance_write boolean := false;
BEGIN
  v_trusted_finance_write :=
    current_setting('aurelix.trusted_finance_balance_write', true) = 'on'
    AND session_user = 'postgres';

  IF current_setting('request.jwt.claim.role', true) = 'service_role' OR v_trusted_finance_write THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.coin_balance IS DISTINCT FROM 0 AND NEW.coin_balance IS NOT NULL THEN
      RAISE EXCEPTION 'coin_balance cannot be set directly' USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.coin_balance IS DISTINCT FROM OLD.coin_balance THEN
      RAISE EXCEPTION 'coin_balance cannot be modified directly' USING ERRCODE = '42501';
    END IF;
    IF NEW.creator_terms_accepted_at IS DISTINCT FROM OLD.creator_terms_accepted_at THEN
      RAISE EXCEPTION 'creator_terms_accepted_at cannot be modified directly' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_review_coin_topup(
  _topup_id uuid,
  _decision text,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.coin_topup_requests%ROWTYPE;
  v_wallet uuid;
  v_txn text;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.is_finance_staff(auth.uid())
    OR public.is_admin_os_founder()
  ) THEN
    RAISE EXCEPTION 'Finance Department only' USING ERRCODE = '42501';
  END IF;
  IF _decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row
  FROM public.coin_topup_requests
  WHERE id = _topup_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Top-up request not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.status <> 'pending_review' THEN
    RAISE EXCEPTION 'Top-up request has already been reviewed';
  END IF;

  IF _decision = 'approved' THEN
    INSERT INTO public.coin_transactions (
      user_id, amount, kind, stripe_session_id, price_id, environment
    ) VALUES (
      v_row.user_id,
      v_row.coins,
      'manual_upi_topup',
      'manual-topup:' || v_row.id::text,
      'upi',
      'live'
    );

    PERFORM set_config('aurelix.trusted_finance_balance_write', 'on', true);
    INSERT INTO public.profiles_private (user_id, coin_balance, updated_at)
    VALUES (v_row.user_id, v_row.coins, now())
    ON CONFLICT (user_id) DO UPDATE
      SET coin_balance = public.profiles_private.coin_balance + EXCLUDED.coin_balance,
          updated_at = now();
    PERFORM set_config('aurelix.trusted_finance_balance_write', 'off', true);

    v_wallet := public.wallet_ensure(v_row.user_id);
    v_txn := public.wallet_apply(
      v_wallet,
      'credit',
      'purchased',
      'purchase',
      v_row.coins,
      0,
      'UPI coin top-up',
      jsonb_build_object('topup_id', v_row.id, 'utr', v_row.utr),
      NULL,
      auth.uid(),
      'TOPUP-' || replace(v_row.id::text, '-', '')
    );
  END IF;

  UPDATE public.coin_topup_requests
  SET status = _decision,
      admin_note = NULLIF(trim(coalesce(_note, '')), ''),
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = v_row.id;

  INSERT INTO public.admin_audit_logs (
    action, resource_type, resource_id, user_id, details, severity
  ) VALUES (
    'finance.coin_topup.' || _decision,
    'coin_topup_request',
    v_row.id::text,
    auth.uid(),
    jsonb_build_object('coins', v_row.coins, 'utr', v_row.utr, 'wallet_txn', v_txn),
    CASE WHEN _decision = 'approved' THEN 'info' ELSE 'warning' END
  );

  RETURN jsonb_build_object('status', _decision, 'coins', v_row.coins, 'wallet_txn', v_txn);
END;
$$;
REVOKE ALL ON FUNCTION public.finance_review_coin_topup(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finance_review_coin_topup(uuid, text, text) TO authenticated, service_role;