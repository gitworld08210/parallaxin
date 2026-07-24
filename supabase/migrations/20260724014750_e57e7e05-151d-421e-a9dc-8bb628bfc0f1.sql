
-- =========================================================================
-- 1. AAP advertiser members: block self-promotion to admin
-- =========================================================================
DROP POLICY IF EXISTS "am self insert" ON public.aap_advertiser_members;

CREATE POLICY "am self insert viewer only"
ON public.aap_advertiser_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'advertiser_viewer'::aap_role_key
  AND EXISTS (
    SELECT 1 FROM public.aap_advertisers a
    WHERE a.id = advertiser_id AND a.owner_user_id = auth.uid()
  )
);

-- =========================================================================
-- 2. KYC: lock status/reviewer fields on self-update
-- =========================================================================
DROP POLICY IF EXISTS "kyc own update pending" ON public.kyc_submissions;

CREATE POLICY "kyc own update pending"
ON public.kyc_submissions
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE OR REPLACE FUNCTION public.kyc_lock_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Only allow status/reviewer changes when caller is admin (bypassing this trigger via SECURITY DEFINER RPC still works)
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.review_note IS DISTINCT FROM OLD.review_note
  THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only staff can change KYC review status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kyc_lock_review_fields_tr ON public.kyc_submissions;
CREATE TRIGGER kyc_lock_review_fields_tr
BEFORE UPDATE ON public.kyc_submissions
FOR EACH ROW EXECUTE FUNCTION public.kyc_lock_review_fields();

-- =========================================================================
-- 3. Creator subscriptions: only cancel_at_period_end may change client-side
-- =========================================================================
CREATE OR REPLACE FUNCTION public.cs_lock_paid_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     OR NEW.current_period_start IS DISTINCT FROM OLD.current_period_start
     OR NEW.price_coins IS DISTINCT FROM OLD.price_coins
     OR NEW.creator_id IS DISTINCT FROM OLD.creator_id
     OR NEW.subscriber_id IS DISTINCT FROM OLD.subscriber_id
  THEN
    RAISE EXCEPTION 'Only the server subscribe function can change subscription state';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cs_lock_paid_fields_tr ON public.creator_subscriptions;
CREATE TRIGGER cs_lock_paid_fields_tr
BEFORE UPDATE ON public.creator_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.cs_lock_paid_fields();

-- =========================================================================
-- 4. Payout requests: revoke direct client insert
-- =========================================================================
DROP POLICY IF EXISTS "pr_insert_own" ON public.payout_requests;
REVOKE INSERT ON public.payout_requests FROM authenticated;

-- request_payout SECURITY DEFINER RPC still works (service_role bypasses).
-- Keep SELECT/UPDATE for admins as-is.

-- =========================================================================
-- 5. AAP events: revoke direct client insert
-- =========================================================================
DROP POLICY IF EXISTS "events insert" ON public.aap_events;
REVOKE INSERT ON public.aap_events FROM authenticated;
-- Server-side ingestion runs as service_role and continues to work.

-- =========================================================================
-- 6. AAP audit logs: restrict inserts to trusted context
-- =========================================================================
DROP POLICY IF EXISTS "audit insert" ON public.aap_audit_logs;

CREATE POLICY "audit insert restricted"
ON public.aap_audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  actor_user_id = auth.uid()
  AND advertiser_id IS NOT NULL
  AND public.aap_is_advertiser_member(advertiser_id)
);

-- =========================================================================
-- 7. AAP internal config: restrict SELECT to platform staff
-- =========================================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'aap_config','aap_feature_flags','aap_placement_configs',
    'aap_localization','aap_placements','aap_kb_versions','aap_policy_refs'
  ]) LOOP
    -- drop existing permissive read policy (all named as short "<x> read" per audit)
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      CASE t
        WHEN 'aap_config' THEN 'cfg read'
        WHEN 'aap_feature_flags' THEN 'ff read'
        WHEN 'aap_placement_configs' THEN 'pc read'
        WHEN 'aap_localization' THEN 'loc read'
        WHEN 'aap_placements' THEN 'placements read'
        WHEN 'aap_kb_versions' THEN 'kbv read'
        WHEN 'aap_policy_refs' THEN 'policy read'
      END, t);
  END LOOP;
END $$;

CREATE POLICY "cfg read staff" ON public.aap_config
  FOR SELECT TO authenticated
  USING (aap_is_platform_admin() OR aap_is_engineering() OR aap_is_finance() OR aap_is_founder());

CREATE POLICY "ff read staff" ON public.aap_feature_flags
  FOR SELECT TO authenticated
  USING (aap_is_platform_admin() OR aap_is_engineering() OR aap_is_founder());

CREATE POLICY "pc read staff" ON public.aap_placement_configs
  FOR SELECT TO authenticated
  USING (aap_is_platform_admin() OR aap_is_engineering() OR aap_is_finance() OR aap_is_founder());

CREATE POLICY "loc read staff" ON public.aap_localization
  FOR SELECT TO authenticated
  USING (aap_is_platform_admin() OR aap_is_engineering() OR aap_is_founder());

CREATE POLICY "placements read staff" ON public.aap_placements
  FOR SELECT TO authenticated
  USING (aap_is_platform_admin() OR aap_is_engineering() OR aap_is_founder() OR aap_is_advertiser_member(NULL) IS NOT NULL);
-- Note: aap_placements is referenced when composing ads; broaden if needed.

CREATE POLICY "kbv read staff" ON public.aap_kb_versions
  FOR SELECT TO authenticated
  USING (aap_is_platform_admin() OR aap_is_reviewer());

CREATE POLICY "policy read staff" ON public.aap_policy_refs
  FOR SELECT TO authenticated
  USING (aap_is_platform_admin() OR aap_is_reviewer());

-- =========================================================================
-- 8. Tips: lock amount/fee/recipient columns on sender update
-- =========================================================================
CREATE OR REPLACE FUNCTION public.tips_lock_money_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
     OR NEW.net_cents IS DISTINCT FROM OLD.net_cents
     OR NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.post_id IS DISTINCT FROM OLD.post_id
  THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Tip amount and recipient cannot be modified after creation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tips_lock_money_fields_tr ON public.tips;
CREATE TRIGGER tips_lock_money_fields_tr
BEFORE UPDATE ON public.tips
FOR EACH ROW EXECUTE FUNCTION public.tips_lock_money_fields();

-- =========================================================================
-- 9. Atomic coin spend to prevent double-spend races
-- =========================================================================
CREATE OR REPLACE FUNCTION public.spend_coins_atomic(
  _reason text,
  _amount integer,
  _reference_id uuid DEFAULT NULL,
  _reference_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _balance integer;
  _tx_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  -- Serialize per-user via advisory lock so concurrent debits queue up.
  PERFORM pg_advisory_xact_lock(hashtextextended(_uid::text, 42));

  SELECT COALESCE(SUM(amount), 0) INTO _balance
  FROM public.coin_transactions
  WHERE user_id = _uid;

  IF _balance < _amount THEN
    RAISE EXCEPTION 'Insufficient coin balance' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.coin_transactions (user_id, amount, reason, reference_id, reference_type)
  VALUES (_uid, -_amount, _reason, _reference_id, _reference_type)
  RETURNING id INTO _tx_id;

  RETURN _tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.spend_coins_atomic(text, integer, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spend_coins_atomic(text, integer, uuid, text) TO authenticated;

-- =========================================================================
-- 10. Helper: is_email_sender_staff() for edge function auth check
-- =========================================================================
CREATE OR REPLACE FUNCTION public.can_send_transactional_email(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_admin_permission(_user_id, 'people_ops.hire.approve')
    OR public.has_admin_permission(_user_id, 'people_ops.onboarding.manage')
    OR public.has_admin_permission(_user_id, 'finance.payroll.release')
    OR public.has_admin_permission(_user_id, 'recruitment.offer.send')
    OR public.is_admin_department_member(_user_id, 'people_ops')
    OR public.is_admin_department_member(_user_id, 'finance')
    OR public.is_admin_department_member(_user_id, 'recruitment')
    OR public.is_admin_department_member(_user_id, 'founder_office');
$$;

GRANT EXECUTE ON FUNCTION public.can_send_transactional_email(uuid) TO authenticated, service_role;
