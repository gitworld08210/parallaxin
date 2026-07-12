
CREATE TABLE public.executive_ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ,
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_ai_conversations TO authenticated;
GRANT ALL ON public.executive_ai_conversations TO service_role;
ALTER TABLE public.executive_ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner or founder read conversations" ON public.executive_ai_conversations
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "owner manage conversations" ON public.executive_ai_conversations
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.executive_ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.executive_ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  tokens INT,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_ai_messages TO authenticated;
GRANT ALL ON public.executive_ai_messages TO service_role;
ALTER TABLE public.executive_ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner or founder read messages" ON public.executive_ai_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.executive_ai_conversations c
      WHERE c.id = conversation_id
        AND (c.owner_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office')))
  );
CREATE POLICY "owner insert messages" ON public.executive_ai_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.executive_ai_conversations c
      WHERE c.id = conversation_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "owner delete messages" ON public.executive_ai_messages
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.executive_ai_conversations c
      WHERE c.id = conversation_id AND c.owner_id = auth.uid())
  );

CREATE TABLE public.executive_ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  recommendation TEXT NOT NULL,
  reasoning TEXT,
  confidence NUMERIC,
  business_impact TEXT,
  supporting_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_ai_recommendations TO authenticated;
GRANT ALL ON public.executive_ai_recommendations TO service_role;
ALTER TABLE public.executive_ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read ai recs" ON public.executive_ai_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "founder manage ai recs" ON public.executive_ai_recommendations
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  forecast JSONB NOT NULL DEFAULT '{}'::jsonb,
  horizon TEXT,
  confidence NUMERIC,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_ai_predictions TO authenticated;
GRANT ALL ON public.executive_ai_predictions TO service_role;
ALTER TABLE public.executive_ai_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read ai predictions" ON public.executive_ai_predictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "founder manage ai predictions" ON public.executive_ai_predictions
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.executive_ai_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_ai_feedback TO authenticated;
GRANT ALL ON public.executive_ai_feedback TO service_role;
ALTER TABLE public.executive_ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manage own feedback" ON public.executive_ai_feedback
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "founder read feedback" ON public.executive_ai_feedback
  FOR SELECT TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_ai_saved_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_ai_saved_prompts TO authenticated;
GRANT ALL ON public.executive_ai_saved_prompts TO service_role;
ALTER TABLE public.executive_ai_saved_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner or shared read prompts" ON public.executive_ai_saved_prompts
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_shared = true);
CREATE POLICY "owner manage prompts" ON public.executive_ai_saved_prompts
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.executive_ai_knowledge_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  result JSONB NOT NULL,
  source TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_ai_knowledge_cache TO authenticated;
GRANT ALL ON public.executive_ai_knowledge_cache TO service_role;
ALTER TABLE public.executive_ai_knowledge_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read knowledge cache" ON public.executive_ai_knowledge_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "founder manage knowledge cache" ON public.executive_ai_knowledge_cache
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TRIGGER trg_ai_conv_updated BEFORE UPDATE ON public.executive_ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_recs_updated BEFORE UPDATE ON public.executive_ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_pred_updated BEFORE UPDATE ON public.executive_ai_predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_prompts_updated BEFORE UPDATE ON public.executive_ai_saved_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ai_conv_owner ON public.executive_ai_conversations(owner_id, last_message_at DESC);
CREATE INDEX idx_ai_messages_conv ON public.executive_ai_messages(conversation_id, created_at);
CREATE INDEX idx_ai_recs_status ON public.executive_ai_recommendations(status, created_at DESC);
CREATE INDEX idx_ai_pred_category ON public.executive_ai_predictions(category, created_at DESC);
CREATE INDEX idx_ai_prompts_owner ON public.executive_ai_saved_prompts(owner_id);
