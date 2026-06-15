
-- Calls table: one row per call
CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('voice','video')),
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','accepted','declined','ended','missed','cancelled','busy')),
  started_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  duration_sec integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calls TO authenticated;
GRANT ALL ON public.calls TO service_role;

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read their calls"
  ON public.calls FOR SELECT TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Caller can create calls"
  ON public.calls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Participants can update their calls"
  ON public.calls FOR UPDATE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE INDEX idx_calls_callee_ringing ON public.calls(callee_id, status) WHERE status = 'ringing';
CREATE INDEX idx_calls_conversation ON public.calls(conversation_id, created_at DESC);

CREATE TRIGGER calls_updated_at BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Signals table: ephemeral SDP/ICE exchange
CREATE TABLE public.call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('offer','answer','ice','bye')),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.call_signals TO authenticated;
GRANT ALL ON public.call_signals TO service_role;

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read signals"
  ON public.call_signals FOR SELECT TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Sender can insert signals"
  ON public.call_signals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user);

CREATE POLICY "Participants can delete signals"
  ON public.call_signals FOR DELETE TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE INDEX idx_call_signals_call ON public.call_signals(call_id, created_at);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER TABLE public.call_signals REPLICA IDENTITY FULL;
