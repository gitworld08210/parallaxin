
-- 1. Tips status: add review/rejected
ALTER TABLE public.tips DROP CONSTRAINT IF EXISTS tips_status_check;
ALTER TABLE public.tips ADD CONSTRAINT tips_status_check
  CHECK (status IN ('pending','submitted','pending_review','verified','rejected','disputed','refunded','revoked'));

ALTER TABLE public.tips ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.tips ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.tips ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.tips ADD COLUMN IF NOT EXISTS review_note text;

-- 2. Notifications: add new types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like','comment','follow','message','mention','verification_approved','verification_revoked',
                  'founder_inducted','founder_revoked','collab_invite','collab_accepted',
                  'tip','tip_rejected','tip_revoked',
                  'kyc_approved','kyc_rejected',
                  'payout_approved','payout_rejected'));

-- 3. UTR submission: no longer auto-credits
CREATE OR REPLACE FUNCTION public.verify_tip_with_utr(_tip_id uuid, _utr text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _tip public.tips%ROWTYPE;
  _clean text := regexp_replace(coalesce(_utr,''), '\s', '', 'g');
  _exists uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF _clean !~ '^[0-9]{12}$' THEN RAISE EXCEPTION 'UTR must be exactly 12 digits' USING ERRCODE='22023'; END IF;

  SELECT * INTO _tip FROM public.tips WHERE id=_tip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tip not found' USING ERRCODE='P0002'; END IF;
  IF _tip.sender_id <> _uid THEN RAISE EXCEPTION 'not your tip' USING ERRCODE='42501'; END IF;
  IF _tip.status IN ('verified','pending_review') THEN
    RETURN jsonb_build_object('status', _tip.status, 'already', true);
  END IF;

  SELECT id INTO _exists FROM public.tips WHERE utr=_clean AND id<>_tip_id LIMIT 1;
  IF _exists IS NOT NULL THEN RAISE EXCEPTION 'this UTR has already been used' USING ERRCODE='23505'; END IF;

  UPDATE public.tips
     SET utr=_clean, status='pending_review', submitted_at=now()
     WHERE id=_tip_id;

  RETURN jsonb_build_object('status','pending_review');
END $$;

-- 4. Admin approve tip
CREATE OR REPLACE FUNCTION public.admin_approve_tip(_tip_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _tip public.tips%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501'; END IF;
  SELECT * INTO _tip FROM public.tips WHERE id=_tip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tip not found'; END IF;
  IF _tip.status='verified' THEN RETURN; END IF;
  IF _tip.status NOT IN ('pending_review','submitted','pending') THEN
    RAISE EXCEPTION 'tip cannot be approved from status %', _tip.status;
  END IF;

  UPDATE public.tips
     SET status='verified', verified_at=now(), paid_at=COALESCE(paid_at,now()),
         reviewed_at=now(), reviewed_by=_uid
     WHERE id=_tip_id;

  PERFORM public.credit_creator(_tip.recipient_id, _tip.environment, _tip.net_cents, _tip.currency);
  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  VALUES (_tip.recipient_id, _tip.sender_id, 'tip', _tip.post_id);
END $$;

-- 5. Admin reject tip
CREATE OR REPLACE FUNCTION public.admin_reject_tip(_tip_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _tip public.tips%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501'; END IF;
  SELECT * INTO _tip FROM public.tips WHERE id=_tip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tip not found'; END IF;
  IF _tip.status='verified' THEN RAISE EXCEPTION 'use revoke for verified tips'; END IF;

  UPDATE public.tips
     SET status='rejected', reviewed_at=now(), reviewed_by=_uid, review_note=_reason
     WHERE id=_tip_id;

  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  VALUES (_tip.sender_id, _uid, 'tip_rejected', _tip.post_id);
END $$;

-- 6. Admin revoke verified tip
CREATE OR REPLACE FUNCTION public.admin_revoke_tip(_tip_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _tip public.tips%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501'; END IF;
  SELECT * INTO _tip FROM public.tips WHERE id=_tip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tip not found'; END IF;
  IF _tip.status<>'verified' THEN RAISE EXCEPTION 'only verified tips can be revoked'; END IF;

  -- Reverse the credit
  UPDATE public.creator_balance
     SET available_cents = GREATEST(available_cents - _tip.net_cents, 0),
         lifetime_earned_cents = GREATEST(lifetime_earned_cents - _tip.net_cents, 0),
         updated_at = now()
   WHERE user_id = _tip.recipient_id AND environment = _tip.environment;

  UPDATE public.tips
     SET status='revoked', reviewed_at=now(), reviewed_by=_uid, review_note=_reason
     WHERE id=_tip_id;

  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  VALUES (_tip.recipient_id, _uid, 'tip_revoked', _tip.post_id);
  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  VALUES (_tip.sender_id, _uid, 'tip_rejected', _tip.post_id);
END $$;

-- 7. KYC submissions
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  pan_number text,
  bank_account_number text NOT NULL,
  bank_ifsc text NOT NULL,
  bank_name text,
  id_photo_url text NOT NULL,
  passbook_photo_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc own select" ON public.kyc_submissions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "kyc own insert" ON public.kyc_submissions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "kyc own update pending" ON public.kyc_submissions
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'pending') WITH CHECK (user_id = auth.uid());
CREATE POLICY "kyc admin update" ON public.kyc_submissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS kyc_submissions_user_idx ON public.kyc_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kyc_submissions_status_idx ON public.kyc_submissions(status, created_at DESC);

CREATE TRIGGER kyc_set_updated_at BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. KYC helper: latest approved status check
CREATE OR REPLACE FUNCTION public.has_approved_kyc(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.kyc_submissions WHERE user_id=_user_id AND status='approved');
$$;

-- 9. KYC admin actions
CREATE OR REPLACE FUNCTION public.admin_approve_kyc(_kyc_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.kyc_submissions%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501'; END IF;
  SELECT * INTO _row FROM public.kyc_submissions WHERE id=_kyc_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'kyc not found'; END IF;
  UPDATE public.kyc_submissions
    SET status='approved', reviewed_at=now(), reviewed_by=_uid, review_note=NULL
    WHERE id=_kyc_id;
  INSERT INTO public.notifications (user_id, actor_id, type) VALUES (_row.user_id, _uid, 'kyc_approved');
END $$;

CREATE OR REPLACE FUNCTION public.admin_reject_kyc(_kyc_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.kyc_submissions%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501'; END IF;
  SELECT * INTO _row FROM public.kyc_submissions WHERE id=_kyc_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'kyc not found'; END IF;
  UPDATE public.kyc_submissions
    SET status='rejected', reviewed_at=now(), reviewed_by=_uid, review_note=_reason
    WHERE id=_kyc_id;
  INSERT INTO public.notifications (user_id, actor_id, type) VALUES (_row.user_id, _uid, 'kyc_rejected');
END $$;

-- 10. Require approved KYC before payout requests
CREATE OR REPLACE FUNCTION public.request_payout(_amount_cents bigint, _method text, _payout_detail jsonb, _environment text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _min bigint;
  _avail bigint;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _method NOT IN ('upi','bank') THEN RAISE EXCEPTION 'invalid method'; END IF;
  IF NOT public.has_approved_kyc(_uid) THEN RAISE EXCEPTION 'KYC not approved'; END IF;

  SELECT (value)::text::bigint INTO _min FROM public.app_config WHERE key='min_payout_cents';
  IF _amount_cents < COALESCE(_min, 50000) THEN RAISE EXCEPTION 'amount below minimum'; END IF;

  SELECT available_cents INTO _avail FROM public.creator_balance
    WHERE user_id=_uid AND environment=_environment FOR UPDATE;
  IF COALESCE(_avail,0) < _amount_cents THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  UPDATE public.creator_balance
    SET available_cents = available_cents - _amount_cents,
        pending_cents = pending_cents + _amount_cents,
        updated_at = now()
    WHERE user_id=_uid AND environment=_environment;

  INSERT INTO public.payout_requests (user_id, amount_cents, method, payout_detail, environment, currency, status)
    VALUES (_uid, _amount_cents, _method, _payout_detail, _environment, 'inr', 'pending')
    RETURNING id INTO _id;
  RETURN _id;
END $$;

-- 11. Admin approve / reject payouts
CREATE OR REPLACE FUNCTION public.admin_approve_payout(_payout_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.payout_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501'; END IF;
  SELECT * INTO _row FROM public.payout_requests WHERE id=_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payout not found'; END IF;
  IF _row.status <> 'pending' THEN RAISE EXCEPTION 'payout already processed'; END IF;

  UPDATE public.creator_balance
    SET pending_cents = GREATEST(pending_cents - _row.amount_cents, 0),
        updated_at = now()
    WHERE user_id=_row.user_id AND environment=_row.environment;

  UPDATE public.payout_requests
    SET status='paid', admin_note=_note, processed_at=now()
    WHERE id=_payout_id;

  INSERT INTO public.notifications (user_id, actor_id, type) VALUES (_row.user_id, _uid, 'payout_approved');
END $$;

CREATE OR REPLACE FUNCTION public.admin_reject_payout(_payout_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.payout_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'admin only' USING ERRCODE='42501'; END IF;
  SELECT * INTO _row FROM public.payout_requests WHERE id=_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payout not found'; END IF;
  IF _row.status <> 'pending' THEN RAISE EXCEPTION 'payout already processed'; END IF;

  -- Return funds to available
  UPDATE public.creator_balance
    SET pending_cents = GREATEST(pending_cents - _row.amount_cents, 0),
        available_cents = available_cents + _row.amount_cents,
        updated_at = now()
    WHERE user_id=_row.user_id AND environment=_row.environment;

  UPDATE public.payout_requests
    SET status='rejected', admin_note=_reason, processed_at=now()
    WHERE id=_payout_id;

  INSERT INTO public.notifications (user_id, actor_id, type) VALUES (_row.user_id, _uid, 'payout_rejected');
END $$;
