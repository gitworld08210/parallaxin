DROP POLICY IF EXISTS ctr_read ON public.coin_topup_requests;
CREATE POLICY ctr_read ON public.coin_topup_requests
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.wallet_is_finance(auth.uid()));

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
  IF auth.uid() IS NULL OR NOT public.wallet_is_finance(auth.uid()) THEN
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

    INSERT INTO public.profiles_private (user_id, coin_balance, updated_at)
    VALUES (v_row.user_id, v_row.coins, now())
    ON CONFLICT (user_id) DO UPDATE
      SET coin_balance = public.profiles_private.coin_balance + EXCLUDED.coin_balance,
          updated_at = now();

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

DROP POLICY IF EXISTS credit_app_read ON public.aap_credit_applications;
DROP POLICY IF EXISTS "credit_app_read" ON public.aap_credit_applications;
CREATE POLICY credit_app_read ON public.aap_credit_applications
FOR SELECT TO authenticated
USING (
  requested_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.aap_advertiser_members m
    WHERE m.advertiser_id = aap_credit_applications.advertiser_id
      AND m.user_id = auth.uid()
      AND m.role = 'advertiser_admin'
  )
  OR public.wallet_is_finance(auth.uid())
  OR public.has_admin_permission(auth.uid(), 'aap.credit.review')
  OR public.has_admin_permission(auth.uid(), 'aap.credit.approve')
);

DROP POLICY IF EXISTS credit_app_finance_write ON public.aap_credit_applications;
DROP POLICY IF EXISTS "credit_app_finance_write" ON public.aap_credit_applications;
CREATE POLICY credit_app_finance_write ON public.aap_credit_applications
FOR UPDATE TO authenticated
USING (
  public.wallet_is_finance(auth.uid())
  OR public.has_admin_permission(auth.uid(), 'aap.credit.review')
  OR public.has_admin_permission(auth.uid(), 'aap.credit.approve')
)
WITH CHECK (
  public.wallet_is_finance(auth.uid())
  OR public.has_admin_permission(auth.uid(), 'aap.credit.review')
  OR public.has_admin_permission(auth.uid(), 'aap.credit.approve')
);

DROP POLICY IF EXISTS aap_advertisers_finance_read ON public.aap_advertisers;
CREATE POLICY aap_advertisers_finance_read ON public.aap_advertisers
FOR SELECT TO authenticated
USING (public.wallet_is_finance(auth.uid()));

CREATE OR REPLACE FUNCTION public.aap_is_finance()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.wallet_is_finance(auth.uid()), false)
    OR public.aap_is_staff(ARRAY['finance','finance_legal'])
    OR public.aap_is_founder();
$$;

CREATE OR REPLACE FUNCTION public.aap_finance_approve_credit(
  _application_id uuid,
  _approved_limit numeric,
  _approved_cycle text,
  _risk_level text,
  _security_deposit numeric,
  _payment_method text,
  _autopay boolean,
  _notes text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_app RECORD; v_acct_id uuid;
BEGIN
  IF NOT (
    public.aap_is_finance()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_admin_permission(auth.uid(), 'aap.credit.approve')
  ) THEN
    RAISE EXCEPTION 'Only Finance or admin can approve credit';
  END IF;
  IF _approved_limit IS NULL OR _approved_limit <= 0 THEN
    RAISE EXCEPTION 'Approved limit must be positive';
  END IF;

  SELECT * INTO v_app FROM public.aap_credit_applications
  WHERE id = _application_id AND status IN ('pending','under_review') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found or not reviewable'; END IF;

  UPDATE public.aap_credit_applications
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
      approved_limit = _approved_limit, approved_cycle = _approved_cycle,
      risk_level = _risk_level, security_deposit = coalesce(_security_deposit, 0),
      review_notes = _notes, updated_at = now()
  WHERE id = _application_id;

  INSERT INTO public.aap_postpaid_accounts (
    advertiser_id, credit_limit, currency, billing_cycle, risk_level,
    security_deposit, payment_method, autopay_enabled, approved_by, notes, terms_accepted_at
  ) VALUES (
    v_app.advertiser_id, _approved_limit, v_app.currency, _approved_cycle, _risk_level,
    coalesce(_security_deposit, 0), coalesce(_payment_method, 'bank_transfer'),
    coalesce(_autopay, false), auth.uid(), _notes, now()
  )
  ON CONFLICT (advertiser_id) DO UPDATE
  SET credit_limit = EXCLUDED.credit_limit,
      billing_cycle = EXCLUDED.billing_cycle,
      risk_level = EXCLUDED.risk_level,
      security_deposit = EXCLUDED.security_deposit,
      payment_method = EXCLUDED.payment_method,
      autopay_enabled = EXCLUDED.autopay_enabled,
      status = 'active', approved_by = auth.uid(), approved_at = now(),
      notes = EXCLUDED.notes, updated_at = now()
  RETURNING id INTO v_acct_id;

  UPDATE public.aap_advertisers
  SET billing_mode = 'postpaid_invoice', updated_at = now()
  WHERE id = v_app.advertiser_id;

  IF coalesce(_security_deposit, 0) > 0 THEN
    INSERT INTO public.aap_security_deposits (advertiser_id, direction, amount, reason, approved_by)
    VALUES (v_app.advertiser_id, 'hold', _security_deposit, 'Initial credit approval deposit', auth.uid());
  END IF;

  PERFORM public.aap_log_financial_event(
    v_app.advertiser_id, 'finance_approval', _approved_limit, v_app.currency,
    'credit_application', _application_id,
    jsonb_build_object('cycle', _approved_cycle, 'risk', _risk_level, 'deposit', _security_deposit)
  );
  RETURN v_acct_id;
END;
$$;
REVOKE ALL ON FUNCTION public.aap_finance_approve_credit(uuid, numeric, text, text, numeric, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aap_finance_approve_credit(uuid, numeric, text, text, numeric, text, boolean, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.aap_finance_reject_credit(_application_id uuid, _notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_adv uuid;
BEGIN
  IF NOT (
    public.aap_is_finance()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_admin_permission(auth.uid(), 'aap.credit.review')
    OR public.has_admin_permission(auth.uid(), 'aap.credit.approve')
  ) THEN
    RAISE EXCEPTION 'Only Finance can reject';
  END IF;

  UPDATE public.aap_credit_applications
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
      review_notes = _notes, updated_at = now()
  WHERE id = _application_id AND status IN ('pending','under_review')
  RETURNING advertiser_id INTO v_adv;

  IF v_adv IS NULL THEN RAISE EXCEPTION 'Application not found or not reviewable'; END IF;
  PERFORM public.aap_log_financial_event(
    v_adv, 'finance_rejection', NULL, 'INR', 'credit_application', _application_id,
    jsonb_build_object('notes', _notes)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.aap_finance_reject_credit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aap_finance_reject_credit(uuid, text) TO authenticated, service_role;