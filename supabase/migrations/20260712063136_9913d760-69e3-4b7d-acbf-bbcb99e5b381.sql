
-- Phase 3.6 — Executive Reports & Analytics Center

CREATE TABLE public.executive_report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'company'
    CHECK (scope IN ('company','department','hr','finance','security','support','verification','engineering','custom')),
  source_module TEXT,
  query_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'founder_only'
    CHECK (visibility IN ('founder_only','department','shared','public')),
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_report_defs_category_idx ON public.executive_report_definitions(category);
CREATE INDEX exec_report_defs_scope_idx ON public.executive_report_definitions(scope);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_report_definitions TO authenticated;
GRANT ALL ON public.executive_report_definitions TO service_role;
ALTER TABLE public.executive_report_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_rdef_read" ON public.executive_report_definitions FOR SELECT TO authenticated
  USING (visibility IN ('shared','public') OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_rdef_write" ON public.executive_report_definitions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_rdef_update" ON public.executive_report_definitions FOR UPDATE TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_rdef_delete" ON public.executive_report_definitions FOR DELETE TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office') AND is_system = false);

CREATE TABLE public.executive_scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID NOT NULL REFERENCES public.executive_report_definitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','quarterly','annual','custom')),
  cron_expression TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  format TEXT NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf','excel','csv','json')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_sched_active_idx ON public.executive_scheduled_reports(is_active, next_run_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_scheduled_reports TO authenticated;
GRANT ALL ON public.executive_scheduled_reports TO service_role;
ALTER TABLE public.executive_scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_sched_all" ON public.executive_scheduled_reports FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID REFERENCES public.executive_report_definitions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot JSONB,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_saved_owner_idx ON public.executive_saved_reports(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_saved_reports TO authenticated;
GRANT ALL ON public.executive_saved_reports TO service_role;
ALTER TABLE public.executive_saved_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_saved_read" ON public.executive_saved_reports FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_saved_insert" ON public.executive_saved_reports FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "exec_saved_update" ON public.executive_saved_reports FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_saved_delete" ON public.executive_saved_reports FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID REFERENCES public.executive_report_definitions(id) ON DELETE SET NULL,
  scheduled_id UUID REFERENCES public.executive_scheduled_reports(id) ON DELETE SET NULL,
  triggered_by TEXT NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual','schedule','api')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','success','failed')),
  format TEXT CHECK (format IN ('pdf','excel','csv','json')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_path TEXT,
  row_count INT,
  duration_ms INT,
  error TEXT,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_report_history_def_idx ON public.executive_report_history(definition_id, generated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_report_history TO authenticated;
GRANT ALL ON public.executive_report_history TO service_role;
ALTER TABLE public.executive_report_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_history_read" ON public.executive_report_history FOR SELECT TO authenticated
  USING (generated_by = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_history_insert" ON public.executive_report_history FOR INSERT TO authenticated
  WITH CHECK (generated_by = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_history_update" ON public.executive_report_history FOR UPDATE TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  history_id UUID REFERENCES public.executive_report_history(id) ON DELETE CASCADE,
  saved_id UUID REFERENCES public.executive_saved_reports(id) ON DELETE CASCADE,
  shared_with_user UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_department UUID REFERENCES public.admin_departments(id) ON DELETE CASCADE,
  can_export BOOLEAN NOT NULL DEFAULT false,
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (history_id IS NOT NULL OR saved_id IS NOT NULL),
  CHECK (shared_with_user IS NOT NULL OR shared_with_department IS NOT NULL)
);
CREATE INDEX exec_share_user_idx ON public.executive_report_shares(shared_with_user);
CREATE INDEX exec_share_dept_idx ON public.executive_report_shares(shared_with_department);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_report_shares TO authenticated;
GRANT ALL ON public.executive_report_shares TO service_role;
ALTER TABLE public.executive_report_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_share_read" ON public.executive_report_shares FOR SELECT TO authenticated
  USING (shared_with_user = auth.uid() OR shared_by = auth.uid()
         OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_share_write" ON public.executive_report_shares FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_kpi_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'company',
  unit TEXT,
  formula TEXT,
  source_module TEXT,
  target_value NUMERIC,
  warn_threshold NUMERIC,
  alert_threshold NUMERIC,
  direction TEXT NOT NULL DEFAULT 'higher_better' CHECK (direction IN ('higher_better','lower_better','target')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_kpi_configs TO authenticated;
GRANT ALL ON public.executive_kpi_configs TO service_role;
ALTER TABLE public.executive_kpi_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_kpi_read_all" ON public.executive_kpi_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "exec_kpi_write_founder" ON public.executive_kpi_configs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_kpi_update_founder" ON public.executive_kpi_configs FOR UPDATE TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_kpi_delete_founder" ON public.executive_kpi_configs FOR DELETE TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_code TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'company',
  scope_ref UUID,
  period TEXT NOT NULL CHECK (period IN ('daily','weekly','monthly','quarterly','yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  value NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kpi_code, scope, scope_ref, period, period_start)
);
CREATE INDEX exec_snapshot_kpi_idx ON public.executive_analytics_snapshots(kpi_code, period, period_start DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_analytics_snapshots TO authenticated;
GRANT ALL ON public.executive_analytics_snapshots TO service_role;
ALTER TABLE public.executive_analytics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_snapshot_read_all" ON public.executive_analytics_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "exec_snapshot_write_founder" ON public.executive_analytics_snapshots FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.department_periodic_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.admin_departments(id) ON DELETE CASCADE,
  cadence TEXT NOT NULL CHECK (cadence IN ('weekly','monthly','quarterly','annual','custom')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  highlights TEXT,
  risks TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','reopened','overdue','archived')),
  revision INT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reopened_at TIMESTAMPTZ,
  reopened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reopen_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, cadence, period_start)
);
CREATE INDEX dept_periodic_status_idx ON public.department_periodic_reports(status, due_date);
CREATE INDEX dept_periodic_dept_idx ON public.department_periodic_reports(department_id, period_start DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_periodic_reports TO authenticated;
GRANT ALL ON public.department_periodic_reports TO service_role;
ALTER TABLE public.department_periodic_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dept_periodic_read" ON public.department_periodic_reports FOR SELECT TO authenticated USING (
  public.is_admin_department_member(auth.uid(),'founder_office')
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid() AND e.department_id = department_periodic_reports.department_id
  )
);
CREATE POLICY "dept_periodic_insert" ON public.department_periodic_reports FOR INSERT TO authenticated WITH CHECK (
  public.is_admin_department_member(auth.uid(),'founder_office')
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid() AND e.department_id = department_periodic_reports.department_id
  )
);
CREATE POLICY "dept_periodic_update" ON public.department_periodic_reports FOR UPDATE TO authenticated USING (
  public.is_admin_department_member(auth.uid(),'founder_office')
  OR (
    status IN ('draft','reopened','overdue') AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = auth.uid() AND e.department_id = department_periodic_reports.department_id
    )
  )
);
CREATE POLICY "dept_periodic_delete" ON public.department_periodic_reports FOR DELETE TO authenticated USING (
  public.is_admin_department_member(auth.uid(),'founder_office')
);

CREATE OR REPLACE FUNCTION public.enforce_periodic_report_immutability()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'submitted' AND NEW.status = 'submitted' THEN
    IF NOT public.is_admin_department_member(auth.uid(),'founder_office') THEN
      RAISE EXCEPTION 'Submitted reports are immutable. Request Founder Office to reopen for revision.';
    END IF;
  END IF;
  IF OLD.status = 'submitted' AND NEW.status = 'reopened' THEN
    NEW.revision := COALESCE(OLD.revision,0) + 1;
    NEW.reopened_at := now();
    NEW.reopened_by := auth.uid();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_periodic_report_immutability
  BEFORE UPDATE ON public.department_periodic_reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_periodic_report_immutability();

CREATE TRIGGER trg_exec_rdef_updated BEFORE UPDATE ON public.executive_report_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exec_sched_updated BEFORE UPDATE ON public.executive_scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exec_saved_updated BEFORE UPDATE ON public.executive_saved_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exec_kpi_updated BEFORE UPDATE ON public.executive_kpi_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
