
CREATE TABLE public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ip text,
  user_agent text,
  city text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY le_select_own ON public.login_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY le_insert_own ON public.login_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_login_events_user_created ON public.login_events(user_id, created_at DESC);

CREATE TABLE public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.data_export_requests TO authenticated;
GRANT ALL ON public.data_export_requests TO service_role;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY der_select_own ON public.data_export_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY der_insert_own ON public.data_export_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_private boolean not null default false,
  ADD COLUMN IF NOT EXISTS show_read_receipts boolean not null default true,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;
