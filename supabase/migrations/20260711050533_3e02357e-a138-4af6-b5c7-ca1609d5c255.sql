
-- 1) profiles: lock privileged columns via WITH CHECK on owner update
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND verified                IS NOT DISTINCT FROM (SELECT p.verified                FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND verification_kind       IS NOT DISTINCT FROM (SELECT p.verification_kind       FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND is_founder              IS NOT DISTINCT FROM (SELECT p.is_founder              FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND founder_level           IS NOT DISTINCT FROM (SELECT p.founder_level           FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND founder_title           IS NOT DISTINCT FROM (SELECT p.founder_title           FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND council_role            IS NOT DISTINCT FROM (SELECT p.council_role            FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND council_vote_weight     IS NOT DISTINCT FROM (SELECT p.council_vote_weight     FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND join_era                IS NOT DISTINCT FROM (SELECT p.join_era                FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND tier                    IS NOT DISTINCT FROM (SELECT p.tier                    FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND contribution_score      IS NOT DISTINCT FROM (SELECT p.contribution_score      FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND aura_rank               IS NOT DISTINCT FROM (SELECT p.aura_rank               FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND is_creator              IS NOT DISTINCT FROM (SELECT p.is_creator              FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND creator_since           IS NOT DISTINCT FROM (SELECT p.creator_since           FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND creator_terms_version   IS NOT DISTINCT FROM (SELECT p.creator_terms_version   FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND account_type            IS NOT DISTINCT FROM (SELECT p.account_type            FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND followers_count         IS NOT DISTINCT FROM (SELECT p.followers_count         FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND following_count         IS NOT DISTINCT FROM (SELECT p.following_count         FROM public.profiles p WHERE p.user_id = profiles.user_id)
    AND posts_count             IS NOT DISTINCT FROM (SELECT p.posts_count             FROM public.profiles p WHERE p.user_id = profiles.user_id)
  );

-- 2) profiles_private: prevent direct coin_balance writes by non-service_role
CREATE OR REPLACE FUNCTION public.guard_profiles_private_coin_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
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
      -- also protect this trust marker
      RAISE EXCEPTION 'creator_terms_accepted_at cannot be modified directly' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_profiles_private_coin_balance_trg ON public.profiles_private;
CREATE TRIGGER guard_profiles_private_coin_balance_trg
BEFORE INSERT OR UPDATE ON public.profiles_private
FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_private_coin_balance();

-- 3) verification_requests: prevent self-approval
DROP POLICY IF EXISTS vr_update_own ON public.verification_requests;
CREATE POLICY vr_update_own ON public.verification_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND approved IS NOT DISTINCT FROM (SELECT v.approved FROM public.verification_requests v WHERE v.id = verification_requests.id)
    AND reviewed_at IS NOT DISTINCT FROM (SELECT v.reviewed_at FROM public.verification_requests v WHERE v.id = verification_requests.id)
  );

-- 4) credit_coins: restrict execution to service_role only
REVOKE ALL ON FUNCTION public.credit_coins(uuid, integer, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_coins(uuid, integer, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.credit_coins(uuid, integer, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.credit_coins(uuid, integer, text, text, text) TO service_role;

-- 5) Fix mutable search_path on public.update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
