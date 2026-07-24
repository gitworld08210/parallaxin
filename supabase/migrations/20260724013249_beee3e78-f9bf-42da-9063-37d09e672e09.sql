
-- 1. ai_task_routes
CREATE TABLE public.ai_task_routes (
  task_key TEXT PRIMARY KEY,
  primary_model TEXT NOT NULL,
  fallback_model TEXT,
  purpose TEXT,
  notes TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_task_routes TO authenticated;
GRANT ALL ON public.ai_task_routes TO service_role;
ALTER TABLE public.ai_task_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_task_routes read" ON public.ai_task_routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_task_routes admin write" ON public.ai_task_routes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.ai_task_routes (task_key, primary_model, fallback_model, purpose, notes) VALUES
  ('general_reasoning','openai/gpt-5.5','openai/gpt-5','Business reasoning, executive reports, long-context analysis','Claude Opus mapped to GPT-5.5 (closest supported)'),
  ('fast_daily','openai/gpt-5-mini','google/gemini-2.5-flash','Chat, UI assistant, quick summaries',NULL),
  ('ad_copy','openai/gpt-5.4','openai/gpt-5','Headlines, descriptions, CTAs','Claude Sonnet mapped to GPT-5.4'),
  ('image_analysis','openai/gpt-5','google/gemini-2.5-pro','OCR, brand logo detection, moderation',NULL),
  ('video_analysis','google/gemini-2.5-pro','openai/gpt-5','Video review, scene detection, brand safety',NULL),
  ('audio_transcribe','openai/whisper-1','google/gemini-2.5-flash','Speech recognition, transcription',NULL),
  ('translation','google/gemini-2.5-flash','openai/gpt-5','Localization, multi-language campaigns',NULL),
  ('embeddings','openai/text-embedding-3-large','google/gemini-embedding-001','Semantic search, similar ads, audience matching',NULL),
  ('moderation','openai/gpt-5-mini','google/gemini-2.5-flash-lite','Hate, violence, adult, spam classification','Wraps OpenAI moderation semantics via chat model until native moderation model is exposed'),
  ('recommendation','internal/stub',NULL,'Reserved for Aurelix internal ML',NULL),
  ('fraud_detection','internal/stub',NULL,'Reserved for Aurelix internal ML',NULL),
  ('forecasting','internal/stub',NULL,'Reserved for Aurelix internal ML',NULL);

-- 2. ai_gateway_runs
CREATE TABLE public.ai_gateway_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key TEXT NOT NULL,
  model_used TEXT NOT NULL,
  fallback_used BOOLEAN NOT NULL DEFAULT false,
  user_id UUID,
  advertiser_id UUID,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'ok',
  error TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_gateway_runs TO authenticated;
GRANT ALL ON public.ai_gateway_runs TO service_role;
ALTER TABLE public.ai_gateway_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_gateway_runs own" ON public.ai_gateway_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX ai_gateway_runs_user_idx ON public.ai_gateway_runs(user_id, created_at DESC);
CREATE INDEX ai_gateway_runs_task_idx ON public.ai_gateway_runs(task_key, created_at DESC);

-- 3. user_ad_consent
CREATE TABLE public.user_ad_consent (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  opted_in BOOLEAN NOT NULL DEFAULT false,
  policy_version TEXT NOT NULL DEFAULT 'v1',
  opted_in_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_ad_consent TO authenticated;
GRANT ALL ON public.user_ad_consent TO service_role;
ALTER TABLE public.user_ad_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_ad_consent self" ON public.user_ad_consent FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. user_dm_ai_consent
CREATE TABLE public.user_dm_ai_consent (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  opted_in BOOLEAN NOT NULL DEFAULT false,
  policy_version TEXT NOT NULL DEFAULT 'v1',
  opted_in_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_dm_ai_consent TO authenticated;
GRANT ALL ON public.user_dm_ai_consent TO service_role;
ALTER TABLE public.user_dm_ai_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_dm_ai_consent self" ON public.user_dm_ai_consent FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
