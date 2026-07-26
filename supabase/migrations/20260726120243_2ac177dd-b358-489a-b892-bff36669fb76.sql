CREATE TABLE public.message_passcodes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hash text NOT NULL,
  question text NOT NULL,
  answer_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_passcodes TO authenticated;
GRANT ALL ON public.message_passcodes TO service_role;

ALTER TABLE public.message_passcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own passcode select" ON public.message_passcodes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own passcode insert" ON public.message_passcodes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own passcode update" ON public.message_passcodes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own passcode delete" ON public.message_passcodes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_message_passcodes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_message_passcodes_updated_at
  BEFORE UPDATE ON public.message_passcodes
  FOR EACH ROW EXECUTE FUNCTION public.touch_message_passcodes_updated_at();