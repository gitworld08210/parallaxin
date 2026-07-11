
-- Fix: Restrict sensitive column updates on profiles (trust badge forgery)
REVOKE UPDATE (verified, verification_kind, is_founder, founder_level, founder_title, council_role, council_vote_weight, contribution_score, tier, is_creator, aura_rank, followers_count, following_count, posts_count) ON public.profiles FROM authenticated;

-- Fix: Restrict coin balance direct writes on profiles_private (coin forgery)
REVOKE INSERT, UPDATE ON public.profiles_private FROM authenticated;
GRANT INSERT (user_id, dob, gender, upi_id, payment_qr_url, dm_price_cents) ON public.profiles_private TO authenticated;
GRANT UPDATE (dob, gender, upi_id, payment_qr_url, dm_price_cents, creator_terms_accepted_at) ON public.profiles_private TO authenticated;

-- Fix: Restrict verification_requests self-approval
REVOKE UPDATE ON public.verification_requests FROM authenticated;
GRANT UPDATE (full_name, category) ON public.verification_requests TO authenticated;

-- Fix: Lock down credit_coins RPC (coin purchase forgery)
REVOKE ALL ON FUNCTION public.credit_coins(uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_coins(uuid, integer, text, text, text) TO service_role;
