-- Normalize legacy category values
UPDATE public.verification_requests SET category = 'government' WHERE category = 'gov';
UPDATE public.verification_requests SET category = 'business' WHERE category = 'brand';
UPDATE public.verification_requests SET category = 'public_figure' WHERE category IN ('creator','verified');

ALTER TABLE public.verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_category_check;

ALTER TABLE public.verification_requests
  ADD CONSTRAINT verification_requests_category_check
  CHECK (category IN ('government','founder','public_figure','business','media'));

ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS organization text,
  ADD COLUMN IF NOT EXISTS official_email text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS supporting_doc_url text;