ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IS NULL OR gender IN ('female','male','nonbinary','other','prefer_not'));