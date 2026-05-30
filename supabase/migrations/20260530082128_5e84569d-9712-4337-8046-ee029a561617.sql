UPDATE public.profiles
SET onboarded_at = COALESCE(onboarded_at, created_at, now())
WHERE onboarded_at IS NULL;