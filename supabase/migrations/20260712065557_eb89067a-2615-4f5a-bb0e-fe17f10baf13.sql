
CREATE TABLE public.executive_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  department TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'draft',
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INT NOT NULL DEFAULT 0,
  failure_count INT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_automations TO authenticated;
GRANT ALL ON public.executive_automations TO service_role;
ALTER TABLE public.executive_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read automations" ON public.executive_automations FOR SELECT TO authenticated USING (true);
CREATE POLICY "founder manage automations" ON public.executive_automations
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_automation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.executive_automations(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL,
  cron_expression TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_automation_schedules TO authenticated;
GRANT ALL ON public.executive_automation_schedules TO service_role;
ALTER TABLE public.executive_automation_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read schedules" ON public.executive_automation_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "founder manage schedules" ON public.executive_automation_schedules
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.executive_automations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  trigger_source TEXT,
  input JSONB,
  output JSONB,
  error TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_automation_runs TO authenticated;
GRANT ALL ON public.executive_automation_runs TO service_role;
ALTER TABLE public.executive_automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder or owner read runs" ON public.executive_automation_runs
  FOR SELECT TO authenticated
  USING (
    public.is_admin_department_member(auth.uid(),'founder_office')
    OR EXISTS (SELECT 1 FROM public.executive_automations a WHERE a.id = automation_id AND a.owner_id = auth.uid())
  );
CREATE POLICY "founder manage runs" ON public.executive_automation_runs
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_automation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  department TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_automation_templates TO authenticated;
GRANT ALL ON public.executive_automation_templates TO service_role;
ALTER TABLE public.executive_automation_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read templates" ON public.executive_automation_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "founder manage templates" ON public.executive_automation_templates
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES public.executive_automations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  snoozed_until TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_reminders TO authenticated;
GRANT ALL ON public.executive_reminders TO service_role;
ALTER TABLE public.executive_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipient or founder read reminders" ON public.executive_reminders
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "founder create reminders" ON public.executive_reminders
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "recipient or founder update reminders" ON public.executive_reminders
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (recipient_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "founder delete reminders" ON public.executive_reminders
  FOR DELETE TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_automation_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_id UUID,
  reason TEXT NOT NULL,
  level INT NOT NULL DEFAULT 1,
  escalated_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  escalated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_automation_escalations TO authenticated;
GRANT ALL ON public.executive_automation_escalations TO service_role;
ALTER TABLE public.executive_automation_escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder or target read auto escalations" ON public.executive_automation_escalations
  FOR SELECT TO authenticated
  USING (escalated_to = auth.uid() OR escalated_by = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "founder manage auto escalations" ON public.executive_automation_escalations
  FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TRIGGER trg_automations_updated BEFORE UPDATE ON public.executive_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_auto_schedules_updated BEFORE UPDATE ON public.executive_automation_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_auto_templates_updated BEFORE UPDATE ON public.executive_automation_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_reminders_updated BEFORE UPDATE ON public.executive_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_auto_escalations_updated BEFORE UPDATE ON public.executive_automation_escalations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_automations_status ON public.executive_automations(status);
CREATE INDEX idx_automations_next_run ON public.executive_automations(next_run_at) WHERE is_enabled = true;
CREATE INDEX idx_runs_automation ON public.executive_automation_runs(automation_id, started_at DESC);
CREATE INDEX idx_reminders_recipient ON public.executive_reminders(recipient_id, status, remind_at);
CREATE INDEX idx_auto_escalations_status ON public.executive_automation_escalations(status, level);
