
CREATE OR REPLACE FUNCTION public.verify_tip_with_utr(_tip_id uuid, _utr text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tip public.tips%ROWTYPE;
  _clean text := regexp_replace(coalesce(_utr,''), '\s', '', 'g');
  _exists uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  IF _clean !~ '^[0-9]{12}$' THEN
    RAISE EXCEPTION 'UTR must be exactly 12 digits' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO _tip FROM public.tips WHERE id = _tip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tip not found' USING ERRCODE = 'P0002'; END IF;
  IF _tip.sender_id <> _uid THEN RAISE EXCEPTION 'not your tip' USING ERRCODE = '42501'; END IF;
  IF _tip.status = 'verified' THEN
    RETURN jsonb_build_object('status','verified','already',true);
  END IF;

  -- Reject duplicate UTRs across all tips (a UTR can only be used once)
  SELECT id INTO _exists FROM public.tips WHERE utr = _clean AND id <> _tip_id LIMIT 1;
  IF _exists IS NOT NULL THEN
    RAISE EXCEPTION 'this UTR has already been used' USING ERRCODE = '23505';
  END IF;

  UPDATE public.tips
    SET utr = _clean,
        status = 'verified',
        verified_at = now(),
        paid_at = COALESCE(paid_at, now())
    WHERE id = _tip_id;

  -- Credit creator's in-app balance
  PERFORM public.credit_creator(_tip.recipient_id, _tip.environment, _tip.net_cents, _tip.currency);

  -- Notify recipient
  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  VALUES (_tip.recipient_id, _tip.sender_id, 'tip', _tip.post_id);

  RETURN jsonb_build_object('status','verified','net_cents', _tip.net_cents);
END $$;

REVOKE ALL ON FUNCTION public.verify_tip_with_utr(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_tip_with_utr(uuid, text) TO authenticated;
