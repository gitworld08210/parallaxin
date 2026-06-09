
-- profiles: UPI fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS upi_id text,
  ADD COLUMN IF NOT EXISTS payment_qr_url text;

-- tips: relax old constraints, add new fields
ALTER TABLE public.tips DROP CONSTRAINT IF EXISTS tips_status_check;
ALTER TABLE public.tips
  ADD COLUMN IF NOT EXISTS utr text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text;
ALTER TABLE public.tips
  ADD CONSTRAINT tips_status_check
  CHECK (status IN ('pending','submitted','verified','disputed','refunded'));

-- index on utr for lookup
CREATE INDEX IF NOT EXISTS idx_tips_utr ON public.tips(utr) WHERE utr IS NOT NULL;

-- Allow senders to create their own tip records
DROP POLICY IF EXISTS "tips_insert_sender" ON public.tips;
CREATE POLICY "tips_insert_sender" ON public.tips
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

-- Senders can update their pending tip to add UTR (only their own, only if not verified)
DROP POLICY IF EXISTS "tips_update_sender_utr" ON public.tips;
CREATE POLICY "tips_update_sender_utr" ON public.tips
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id AND status IN ('pending','submitted'))
  WITH CHECK (auth.uid() = sender_id AND status IN ('pending','submitted'));

-- Recipients can verify or dispute tips sent to them
DROP POLICY IF EXISTS "tips_update_recipient_verify" ON public.tips;
CREATE POLICY "tips_update_recipient_verify" ON public.tips
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);
