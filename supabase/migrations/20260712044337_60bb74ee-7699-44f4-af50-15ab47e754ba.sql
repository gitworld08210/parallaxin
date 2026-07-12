
-- ============ WAVE 1: Approval + Workflow + Notification + Activity Feed ============

-- ---------- WORKFLOWS ----------
CREATE TABLE public.platform_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  owner_department TEXT,
  trigger TEXT NOT NULL DEFAULT 'manual',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_workflows TO authenticated;
GRANT ALL ON public.platform_workflows TO service_role;
ALTER TABLE public.platform_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflows readable by admins" ON public.platform_workflows FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'workflows.view') OR public.is_admin_department_member(auth.uid(), 'founder_office'));
CREATE POLICY "workflows managed by founders" ON public.platform_workflows FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));

CREATE TABLE public.platform_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.platform_workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  current_step INT NOT NULL DEFAULT 0,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT,
  entity_id TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_workflow_runs_wf_idx ON public.platform_workflow_runs(workflow_id);
CREATE INDEX platform_workflow_runs_entity_idx ON public.platform_workflow_runs(entity_type, entity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_workflow_runs TO authenticated;
GRANT ALL ON public.platform_workflow_runs TO service_role;
ALTER TABLE public.platform_workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow runs readable by admins" ON public.platform_workflow_runs FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'workflows.view') OR started_by = auth.uid());
CREATE POLICY "workflow runs writable by admins" ON public.platform_workflow_runs FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));

-- ---------- APPROVALS ----------
CREATE TABLE public.platform_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  workflow_id UUID REFERENCES public.platform_workflows(id) ON DELETE SET NULL,
  workflow_run_id UUID REFERENCES public.platform_workflow_runs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  current_step INT NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_approvals_status_idx ON public.platform_approval_requests(status);
CREATE INDEX platform_approvals_entity_idx ON public.platform_approval_requests(entity_type, entity_id);
CREATE INDEX platform_approvals_module_idx ON public.platform_approval_requests(module);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_approval_requests TO authenticated;
GRANT ALL ON public.platform_approval_requests TO service_role;
ALTER TABLE public.platform_approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals readable" ON public.platform_approval_requests FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR public.has_admin_permission(auth.uid(), 'approvals.view')
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "approvals insertable by employees" ON public.platform_approval_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());
CREATE POLICY "approvals updatable by approvers" ON public.platform_approval_requests FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'approvals.decide') OR public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (true);

CREATE TABLE public.platform_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.platform_approval_requests(id) ON DELETE CASCADE,
  step_index INT NOT NULL,
  approver_role TEXT,
  approver_department TEXT,
  approver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_approval_steps_req_idx ON public.platform_approval_steps(request_id, step_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_approval_steps TO authenticated;
GRANT ALL ON public.platform_approval_steps TO service_role;
ALTER TABLE public.platform_approval_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval steps readable" ON public.platform_approval_steps FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.platform_approval_requests r WHERE r.id = request_id AND (
      r.requested_by = auth.uid()
      OR public.has_admin_permission(auth.uid(), 'approvals.view')
      OR public.is_admin_department_member(auth.uid(), 'founder_office')
    ))
  );
CREATE POLICY "approval steps managed by admins" ON public.platform_approval_steps FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));

CREATE TABLE public.platform_approval_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.platform_approval_requests(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.platform_approval_steps(id) ON DELETE SET NULL,
  decided_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_approval_decisions_req_idx ON public.platform_approval_decisions(request_id);
GRANT SELECT, INSERT ON public.platform_approval_decisions TO authenticated;
GRANT ALL ON public.platform_approval_decisions TO service_role;
ALTER TABLE public.platform_approval_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval decisions readable" ON public.platform_approval_decisions FOR SELECT TO authenticated
  USING (
    decided_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.platform_approval_requests r WHERE r.id = request_id AND (
      r.requested_by = auth.uid()
      OR public.has_admin_permission(auth.uid(), 'approvals.view')
      OR public.is_admin_department_member(auth.uid(), 'founder_office')
    ))
  );
CREATE POLICY "approval decisions insertable by approver" ON public.platform_approval_decisions FOR INSERT TO authenticated
  WITH CHECK (
    decided_by = auth.uid()
    AND (public.has_admin_permission(auth.uid(), 'approvals.decide') OR public.is_admin_department_member(auth.uid(), 'founder_office'))
  );

-- ---------- NOTIFICATIONS (extend) ----------
CREATE TABLE public.platform_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  default_channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  category TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_notification_templates TO authenticated;
GRANT ALL ON public.platform_notification_templates TO service_role;
ALTER TABLE public.platform_notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates readable by employees" ON public.platform_notification_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates managed by founders" ON public.platform_notification_templates FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));

CREATE TABLE public.platform_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  in_app BOOLEAN NOT NULL DEFAULT true,
  email BOOLEAN NOT NULL DEFAULT true,
  system_announcements BOOLEAN NOT NULL DEFAULT true,
  security_alerts BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start INT,
  quiet_hours_end INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.platform_notification_preferences TO authenticated;
GRANT ALL ON public.platform_notification_preferences TO service_role;
ALTER TABLE public.platform_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs self manage" ON public.platform_notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.platform_notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key TEXT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_notif_deliveries_recipient_idx ON public.platform_notification_deliveries(recipient_user_id, created_at DESC);
GRANT SELECT ON public.platform_notification_deliveries TO authenticated;
GRANT ALL ON public.platform_notification_deliveries TO service_role;
ALTER TABLE public.platform_notification_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries self read" ON public.platform_notification_deliveries FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid() OR public.is_admin_department_member(auth.uid(), 'founder_office'));

-- ---------- ACTIVITY FEED ----------
CREATE TABLE public.platform_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  verb TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT,
  department TEXT,
  visibility TEXT NOT NULL DEFAULT 'admin',
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_activity_created_idx ON public.platform_activity_events(created_at DESC);
CREATE INDEX platform_activity_object_idx ON public.platform_activity_events(object_type, object_id);
CREATE INDEX platform_activity_dept_idx ON public.platform_activity_events(department);
GRANT SELECT, INSERT ON public.platform_activity_events TO authenticated;
GRANT ALL ON public.platform_activity_events TO service_role;
ALTER TABLE public.platform_activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity readable by admins" ON public.platform_activity_events FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR actor_user_id = auth.uid()
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
    OR public.is_admin_department_member(auth.uid(), 'security')
    OR (department IS NOT NULL AND public.is_admin_department_member(auth.uid(), department))
  );
CREATE POLICY "activity insertable by employees" ON public.platform_activity_events FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid() OR public.is_admin_department_member(auth.uid(), 'founder_office'));

-- ---------- updated_at triggers ----------
CREATE TRIGGER trg_platform_workflows_updated BEFORE UPDATE ON public.platform_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_platform_workflow_runs_updated BEFORE UPDATE ON public.platform_workflow_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_platform_approvals_updated BEFORE UPDATE ON public.platform_approval_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_platform_approval_steps_updated BEFORE UPDATE ON public.platform_approval_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_platform_notif_templates_updated BEFORE UPDATE ON public.platform_notification_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_platform_notif_prefs_updated BEFORE UPDATE ON public.platform_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Realtime ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_approval_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_approval_decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_activity_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_notification_deliveries;

-- ---------- Seed permissions (idempotent) ----------
INSERT INTO public.admin_permissions (module, permission_key, name, description)
VALUES
  ('platform', 'approvals.view', 'View Approvals', 'View approval requests'),
  ('platform', 'approvals.decide', 'Decide Approvals', 'Approve or reject approval requests'),
  ('platform', 'workflows.view', 'View Workflows', 'View workflow definitions and runs'),
  ('platform', 'workflows.manage', 'Manage Workflows', 'Create and edit workflows'),
  ('platform', 'platform.activity.view', 'View Activity Feed', 'View platform activity feed')
ON CONFLICT (permission_key) DO NOTHING;
