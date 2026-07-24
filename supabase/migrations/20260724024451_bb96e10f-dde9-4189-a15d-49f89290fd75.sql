CREATE OR REPLACE FUNCTION public.tips_lock_sender_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role / admin unrestricted updates (RPC flows run as definer)
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- If the sender is updating, lock all monetary/recipient/status-critical fields
  IF auth.uid() = OLD.sender_id THEN
    IF NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents
       OR NEW.net_cents IS DISTINCT FROM OLD.net_cents
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Senders can only update the UTR / dispute fields on their tip'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tips_lock_sender_update ON public.tips;
CREATE TRIGGER trg_tips_lock_sender_update
BEFORE UPDATE ON public.tips
FOR EACH ROW EXECUTE FUNCTION public.tips_lock_sender_update();