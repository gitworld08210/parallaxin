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
    AND current_user = 'postgres';

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