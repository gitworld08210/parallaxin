
-- Phase 3.7 — Executive Command Center

CREATE TABLE public.executive_emergency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'emergency' CHECK (mode IN ('emergency','elevated','drill')),
  reason TEXT NOT NULL,
  expected_duration_minutes INT,
  effects JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended','cancelled')),
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  end_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_emerg_status_idx ON public.executive_emergency_events(status, activated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_emergency_events TO authenticated;
GRANT ALL ON public.executive_emergency_events TO service_role;
ALTER TABLE public.executive_emergency_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_emerg_read_all" ON public.executive_emergency_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "exec_emerg_write" ON public.executive_emergency_events FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_emerg_update" ON public.executive_emergency_events FOR UPDATE TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_emerg_delete" ON public.executive_emergency_events FOR DELETE TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('scheduled','emergency','department','module')),
  target TEXT,
  title TEXT NOT NULL,
  message TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','completed','cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_maint_status_idx ON public.executive_maintenance_windows(status, starts_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_maintenance_windows TO authenticated;
GRANT ALL ON public.executive_maintenance_windows TO service_role;
ALTER TABLE public.executive_maintenance_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_maint_read_all" ON public.executive_maintenance_windows FOR SELECT TO authenticated USING (true);
CREATE POLICY "exec_maint_write" ON public.executive_maintenance_windows FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('company','department','executive','holiday','maintenance','security','policy')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  audience_type TEXT NOT NULL DEFAULT 'company' CHECK (audience_type IN ('company','department','role','level','employees')),
  audience_ref JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','archived')),
  publish_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_ann_status_idx ON public.executive_announcements(status, publish_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_announcements TO authenticated;
GRANT ALL ON public.executive_announcements TO service_role;
ALTER TABLE public.executive_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_ann_read" ON public.executive_announcements FOR SELECT TO authenticated
  USING (status = 'published' OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_ann_write" ON public.executive_announcements FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.executive_announcements(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery TEXT NOT NULL DEFAULT 'immediate' CHECK (delivery IN ('immediate','scheduled')),
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','cancelled','failed')),
  require_ack BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_bcast_status_idx ON public.executive_broadcasts(status, scheduled_for);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_broadcasts TO authenticated;
GRANT ALL ON public.executive_broadcasts TO service_role;
ALTER TABLE public.executive_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.executive_broadcast_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.executive_broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','read','acknowledged','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, user_id)
);
CREATE INDEX exec_bcast_del_user_idx ON public.executive_broadcast_deliveries(user_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_broadcast_deliveries TO authenticated;
GRANT ALL ON public.executive_broadcast_deliveries TO service_role;
ALTER TABLE public.executive_broadcast_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_bcast_del_read" ON public.executive_broadcast_deliveries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_bcast_del_insert" ON public.executive_broadcast_deliveries FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_bcast_del_update" ON public.executive_broadcast_deliveries FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_bcast_del_delete" ON public.executive_broadcast_deliveries FOR DELETE TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));

-- broadcast policies (deliveries now exist so we can reference them)
CREATE POLICY "exec_bcast_read" ON public.executive_broadcasts FOR SELECT TO authenticated USING (
  public.is_admin_department_member(auth.uid(),'founder_office')
  OR EXISTS (
    SELECT 1 FROM public.executive_broadcast_deliveries d
    WHERE d.broadcast_id = executive_broadcasts.id AND d.user_id = auth.uid()
  )
);
CREATE POLICY "exec_bcast_write" ON public.executive_broadcasts FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_system_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'operational'
    CHECK (status IN ('operational','degraded','partial_outage','major_outage','maintenance')),
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_system_status TO authenticated;
GRANT ALL ON public.executive_system_status TO service_role;
ALTER TABLE public.executive_system_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_sys_read_all" ON public.executive_system_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "exec_sys_write" ON public.executive_system_status FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));
INSERT INTO public.executive_system_status (service, status) VALUES
  ('authentication','operational'), ('database','operational'), ('realtime','operational'),
  ('api','operational'), ('storage','operational'), ('notifications','operational'),
  ('scheduler','operational')
ON CONFLICT (service) DO NOTHING;

CREATE TABLE public.executive_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE DEFAULT ('INC-' || to_char(now(),'YYYYMMDDHH24MISS')),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('security','outage','policy','bug','infrastructure','business')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','mitigating','resolved','closed')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  summary TEXT,
  resolution TEXT,
  lessons_learned TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_incidents_status_idx ON public.executive_incidents(status, severity, detected_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_incidents TO authenticated;
GRANT ALL ON public.executive_incidents TO service_role;
ALTER TABLE public.executive_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_inc_read" ON public.executive_incidents FOR SELECT TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_inc_write" ON public.executive_incidents FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_incident_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.executive_incidents(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  status TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_incident_upd_idx ON public.executive_incident_updates(incident_id, created_at DESC);
GRANT SELECT, INSERT ON public.executive_incident_updates TO authenticated;
GRANT ALL ON public.executive_incident_updates TO service_role;
ALTER TABLE public.executive_incident_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_inc_upd_read" ON public.executive_incident_updates FOR SELECT TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_inc_upd_write" ON public.executive_incident_updates FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_continuity_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  summary TEXT,
  content TEXT NOT NULL DEFAULT '',
  contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_reviewed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_continuity_plans TO authenticated;
GRANT ALL ON public.executive_continuity_plans TO service_role;
ALTER TABLE public.executive_continuity_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_bcp_read" ON public.executive_continuity_plans FOR SELECT TO authenticated USING (
  public.is_admin_department_member(auth.uid(),'founder_office')
  OR (status = 'active' AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid() AND e.department_id = executive_continuity_plans.department_id
  ))
);
CREATE POLICY "exec_bcp_write" ON public.executive_continuity_plans FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_department_lockdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.admin_departments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  duration_hours INT,
  restrictions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended','cancelled')),
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_lock_status_idx ON public.executive_department_lockdowns(status, department_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_department_lockdowns TO authenticated;
GRANT ALL ON public.executive_department_lockdowns TO service_role;
ALTER TABLE public.executive_department_lockdowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_lock_read" ON public.executive_department_lockdowns FOR SELECT TO authenticated USING (
  public.is_admin_department_member(auth.uid(),'founder_office')
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid() AND e.department_id = executive_department_lockdowns.department_id
  )
);
CREATE POLICY "exec_lock_write" ON public.executive_department_lockdowns FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_shared BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_watchlists TO authenticated;
GRANT ALL ON public.executive_watchlists TO service_role;
ALTER TABLE public.executive_watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_wl_read" ON public.executive_watchlists FOR SELECT TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_wl_write" ON public.executive_watchlists FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TABLE public.executive_watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES public.executive_watchlists(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('project','department','kpi','risk','approval','decision','incident','employee','custom')),
  item_ref TEXT,
  label TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_wli_idx ON public.executive_watchlist_items(watchlist_id, priority);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_watchlist_items TO authenticated;
GRANT ALL ON public.executive_watchlist_items TO service_role;
ALTER TABLE public.executive_watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_wli_read" ON public.executive_watchlist_items FOR SELECT TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "exec_wli_write" ON public.executive_watchlist_items FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

CREATE TRIGGER trg_exec_emerg_updated BEFORE UPDATE ON public.executive_emergency_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exec_maint_updated BEFORE UPDATE ON public.executive_maintenance_windows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exec_ann_updated BEFORE UPDATE ON public.executive_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exec_bcast_updated BEFORE UPDATE ON public.executive_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exec_sys_updated BEFORE UPDATE ON public.executive_system_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exec_inc_updated BEFORE UPDATE ON public.executive_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exec_bcp_updated BEFORE UPDATE ON public.executive_continuity_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exec_lock_updated BEFORE UPDATE ON public.executive_department_lockdowns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exec_wl_updated BEFORE UPDATE ON public.executive_watchlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
