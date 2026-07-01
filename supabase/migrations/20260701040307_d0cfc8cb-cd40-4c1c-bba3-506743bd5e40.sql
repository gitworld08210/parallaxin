
-- 1) PROFILES_PRIVATE: create table, move data, drop cols
CREATE TABLE IF NOT EXISTS public.profiles_private (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dob date,
  gender text,
  upi_id text,
  payment_qr_url text,
  dm_price_cents integer NOT NULL DEFAULT 0,
  coin_balance integer NOT NULL DEFAULT 0,
  deletion_scheduled_at timestamptz,
  creator_terms_accepted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles_private TO authenticated;
GRANT ALL ON public.profiles_private TO service_role;

ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_private_owner_select" ON public.profiles_private
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_private_owner_insert" ON public.profiles_private
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_private_owner_update" ON public.profiles_private
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Backfill from existing profiles
INSERT INTO public.profiles_private (user_id, dob, gender, upi_id, payment_qr_url, dm_price_cents, coin_balance, deletion_scheduled_at, creator_terms_accepted_at, updated_at)
SELECT user_id, dob, gender, upi_id, payment_qr_url, dm_price_cents, coin_balance, deletion_scheduled_at, creator_terms_accepted_at, now()
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Update credit_coins to write to the private table
CREATE OR REPLACE FUNCTION public.credit_coins(_user_id uuid, _amount integer, _session_id text, _price_id text, _environment text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.coin_transactions (user_id, amount, kind, stripe_session_id, price_id, environment)
  VALUES (_user_id, _amount, 'purchase', _session_id, _price_id, _environment)
  ON CONFLICT (stripe_session_id) DO NOTHING;

  IF FOUND THEN
    INSERT INTO public.profiles_private (user_id, coin_balance, updated_at)
    VALUES (_user_id, _amount, now())
    ON CONFLICT (user_id) DO UPDATE
      SET coin_balance = public.profiles_private.coin_balance + EXCLUDED.coin_balance,
          updated_at = now();
  END IF;
END $function$;

-- Update become_creator to write terms timestamp into private table
CREATE OR REPLACE FUNCTION public.become_creator(_terms_version text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF _terms_version IS NULL OR length(_terms_version) = 0 THEN
    RAISE EXCEPTION 'terms version required' USING ERRCODE='22023';
  END IF;
  UPDATE public.profiles
    SET is_creator = true,
        creator_since = COALESCE(creator_since, now()),
        creator_terms_version = _terms_version,
        updated_at = now()
    WHERE user_id = _uid;
  INSERT INTO public.profiles_private (user_id, creator_terms_accepted_at, updated_at)
    VALUES (_uid, now(), now())
    ON CONFLICT (user_id) DO UPDATE SET creator_terms_accepted_at = now(), updated_at = now();
END $function$;

-- Helper RPC used by onboarding to write dob/gender
CREATE OR REPLACE FUNCTION public.upsert_profile_private(_dob date, _gender text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF _gender IS NOT NULL AND _gender NOT IN ('female','male','nonbinary','other','prefer_not') THEN
    RAISE EXCEPTION 'invalid gender';
  END IF;
  INSERT INTO public.profiles_private (user_id, dob, gender, updated_at)
    VALUES (_uid, _dob, _gender, now())
    ON CONFLICT (user_id) DO UPDATE
      SET dob = COALESCE(EXCLUDED.dob, public.profiles_private.dob),
          gender = COALESCE(EXCLUDED.gender, public.profiles_private.gender),
          updated_at = now();
END $function$;
GRANT EXECUTE ON FUNCTION public.upsert_profile_private(date, text) TO authenticated;

-- Now drop the sensitive columns from public.profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS dob,
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS upi_id,
  DROP COLUMN IF EXISTS payment_qr_url,
  DROP COLUMN IF EXISTS dm_price_cents,
  DROP COLUMN IF EXISTS coin_balance,
  DROP COLUMN IF EXISTS deletion_scheduled_at,
  DROP COLUMN IF EXISTS creator_terms_accepted_at;

-- 2) APP_CONFIG: restrict reads to admins; expose payment display via RPC
DROP POLICY IF EXISTS app_config_read_all ON public.app_config;
CREATE POLICY app_config_admin_read ON public.app_config
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_platform_pay_config()
RETURNS TABLE(upi_id text, qr_url text, payee_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _unwrap text;
  _u text; _q text; _p text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  SELECT value #>> '{}' INTO _u FROM public.app_config WHERE key = 'platform_upi_id';
  SELECT value #>> '{}' INTO _q FROM public.app_config WHERE key = 'platform_qr_url';
  SELECT value #>> '{}' INTO _p FROM public.app_config WHERE key = 'platform_payee_name';
  RETURN QUERY SELECT COALESCE(_u,'')::text, COALESCE(_q,'')::text, COALESCE(_p,'Aurelix')::text;
END $function$;
GRANT EXECUTE ON FUNCTION public.get_platform_pay_config() TO authenticated;

-- 3) TIPS: drop overly permissive recipient update policy; add server-side create_tip RPC
DROP POLICY IF EXISTS tips_update_recipient_verify ON public.tips;

-- Remove client insert; only admins & the RPC (SECURITY DEFINER) may write financial fields.
DROP POLICY IF EXISTS tips_insert_sender ON public.tips;

CREATE OR REPLACE FUNCTION public.create_tip(_recipient_id uuid, _amount_cents integer, _post_id uuid, _message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _fee_bps int;
  _fee bigint;
  _net bigint;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='28000'; END IF;
  IF _recipient_id IS NULL OR _recipient_id = _uid THEN RAISE EXCEPTION 'invalid recipient'; END IF;
  IF NOT public.is_creator(_recipient_id) THEN RAISE EXCEPTION 'recipient is not a creator'; END IF;
  IF _amount_cents IS NULL OR _amount_cents < 4900 THEN RAISE EXCEPTION 'amount below minimum'; END IF;
  IF _amount_cents > 100000000 THEN RAISE EXCEPTION 'amount too large'; END IF;

  SELECT (value #>> '{}')::int INTO _fee_bps FROM public.app_config WHERE key = 'platform_fee_bps';
  _fee_bps := COALESCE(_fee_bps, 1500);
  _fee := (_amount_cents::bigint * _fee_bps) / 10000;
  _net := _amount_cents::bigint - _fee;

  INSERT INTO public.tips (
    sender_id, recipient_id, post_id, amount_cents, platform_fee_cents, net_cents,
    currency, environment, message, status
  ) VALUES (
    _uid, _recipient_id, _post_id, _amount_cents, _fee, _net,
    'inr', 'live', NULLIF(left(COALESCE(_message,''), 280), ''), 'pending'
  ) RETURNING id INTO _id;
  RETURN _id;
END $function$;
GRANT EXECUTE ON FUNCTION public.create_tip(uuid, integer, uuid, text) TO authenticated;

-- 4) verification-docs storage: admin read + owner/admin delete
CREATE POLICY vdocs_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'verification-docs' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY vdocs_owner_or_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );
