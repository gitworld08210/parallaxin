
-- =============== WAVE 2: Assignments + Global Search + Documents ===============

CREATE TABLE public.platform_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  department TEXT,
  method TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_assignments_assignee_idx ON public.platform_assignments(assignee_user_id, status);
CREATE INDEX platform_assignments_entity_idx ON public.platform_assignments(entity_type, entity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_assignments TO authenticated;
GRANT ALL ON public.platform_assignments TO service_role;
ALTER TABLE public.platform_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments readable" ON public.platform_assignments FOR SELECT TO authenticated
  USING (
    assignee_user_id = auth.uid() OR assigned_by = auth.uid()
    OR public.has_admin_permission(auth.uid(), 'assignments.view')
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "assignments update" ON public.platform_assignments FOR UPDATE TO authenticated
  USING (assignee_user_id = auth.uid() OR public.has_admin_permission(auth.uid(), 'assignments.manage') OR public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (assignee_user_id = auth.uid() OR public.has_admin_permission(auth.uid(), 'assignments.manage') OR public.is_admin_department_member(auth.uid(), 'founder_office'));
CREATE POLICY "assignments create" ON public.platform_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission(auth.uid(), 'assignments.manage') OR public.is_admin_department_member(auth.uid(), 'founder_office'));

CREATE TABLE public.platform_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'round_robin',
  filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_assignment_rules TO authenticated;
GRANT ALL ON public.platform_assignment_rules TO service_role;
ALTER TABLE public.platform_assignment_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules managed" ON public.platform_assignment_rules FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));
CREATE POLICY "rules readable" ON public.platform_assignment_rules FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'assignments.view'));

-- GLOBAL SEARCH: use trigger-maintained tsvector (generated cols need immutable)
CREATE TABLE public.platform_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  department TEXT,
  permission_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  document tsvector,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (object_type, object_id)
);
CREATE INDEX platform_search_document_idx ON public.platform_search_index USING GIN (document);
CREATE INDEX platform_search_type_idx ON public.platform_search_index(object_type);

CREATE OR REPLACE FUNCTION public.platform_search_index_tsv() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.document :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(NEW.body, '')), 'B')
    || setweight(to_tsvector('simple', array_to_string(coalesce(NEW.tags, ARRAY[]::text[]), ' ')), 'C');
  NEW.updated_at := now();
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_platform_search_tsv BEFORE INSERT OR UPDATE ON public.platform_search_index
  FOR EACH ROW EXECUTE FUNCTION public.platform_search_index_tsv();

GRANT SELECT ON public.platform_search_index TO authenticated;
GRANT ALL ON public.platform_search_index TO service_role;
ALTER TABLE public.platform_search_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search index founder only" ON public.platform_search_index FOR SELECT TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'));

CREATE OR REPLACE FUNCTION public.platform_search(_q TEXT, _limit INT DEFAULT 25)
RETURNS TABLE (object_type TEXT, object_id TEXT, title TEXT, body TEXT, department TEXT, rank REAL)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT s.object_type, s.object_id, s.title, s.body, s.department,
         ts_rank(s.document, plainto_tsquery('simple', _q)) AS rank
  FROM public.platform_search_index s
  WHERE s.document @@ plainto_tsquery('simple', _q)
    AND (
      s.permission_key IS NULL
      OR public.has_admin_permission(auth.uid(), s.permission_key)
      OR public.is_admin_department_member(auth.uid(), 'founder_office')
    )
  ORDER BY rank DESC
  LIMIT _limit;
END;$$;
REVOKE ALL ON FUNCTION public.platform_search(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_search(TEXT, INT) TO authenticated;

-- DOCUMENTS
CREATE TABLE public.platform_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT,
  storage_path TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  current_version INT NOT NULL DEFAULT 1,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_documents_owner_idx ON public.platform_documents(owner_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_documents TO authenticated;
GRANT ALL ON public.platform_documents TO service_role;
ALTER TABLE public.platform_documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.platform_document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.platform_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT,
  permission_level TEXT NOT NULL DEFAULT 'read',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_doc_perms_doc_idx ON public.platform_document_permissions(document_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_document_permissions TO authenticated;
GRANT ALL ON public.platform_document_permissions TO service_role;
ALTER TABLE public.platform_document_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc perms readable" ON public.platform_document_permissions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.platform_documents d WHERE d.id = document_id AND d.owner_user_id = auth.uid())
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "doc perms writable owner" ON public.platform_document_permissions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.platform_documents d WHERE d.id = document_id AND d.owner_user_id = auth.uid())
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.platform_documents d WHERE d.id = document_id AND d.owner_user_id = auth.uid())
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );

CREATE POLICY "documents read" ON public.platform_documents FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
    OR EXISTS (
      SELECT 1 FROM public.platform_document_permissions p
      WHERE p.document_id = platform_documents.id
        AND (p.user_id = auth.uid() OR (p.department IS NOT NULL AND public.is_admin_department_member(auth.uid(), p.department)))
    )
  );
CREATE POLICY "documents insert" ON public.platform_documents FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "documents update" ON public.platform_documents FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (owner_user_id = auth.uid() OR public.is_admin_department_member(auth.uid(), 'founder_office'));
CREATE POLICY "documents delete" ON public.platform_documents FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_admin_department_member(auth.uid(), 'founder_office'));

CREATE TABLE public.platform_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.platform_documents(id) ON DELETE CASCADE,
  version INT NOT NULL,
  storage_path TEXT,
  size_bytes BIGINT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);
GRANT SELECT, INSERT ON public.platform_document_versions TO authenticated;
GRANT ALL ON public.platform_document_versions TO service_role;
ALTER TABLE public.platform_document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc versions read" ON public.platform_document_versions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.platform_documents d WHERE d.id = document_id AND (
      d.owner_user_id = auth.uid()
      OR public.is_admin_department_member(auth.uid(), 'founder_office')
      OR EXISTS (SELECT 1 FROM public.platform_document_permissions p WHERE p.document_id = d.id AND (p.user_id = auth.uid() OR (p.department IS NOT NULL AND public.is_admin_department_member(auth.uid(), p.department))))
    ))
  );
CREATE POLICY "doc versions insert" ON public.platform_document_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_documents d WHERE d.id = document_id AND d.owner_user_id = auth.uid()));

-- =============== WAVE 3: Reports + Dashboards + Scheduler ===============

CREATE TABLE public.platform_report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'operational',
  source TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_schedule TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_report_definitions TO authenticated;
GRANT ALL ON public.platform_report_definitions TO service_role;
ALTER TABLE public.platform_report_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports defs read" ON public.platform_report_definitions FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'reports.view') OR public.is_admin_department_member(auth.uid(), 'founder_office'));
CREATE POLICY "reports defs manage" ON public.platform_report_definitions FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));

CREATE TABLE public.platform_report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID NOT NULL REFERENCES public.platform_report_definitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_count INT,
  output_url TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.platform_report_runs TO authenticated;
GRANT ALL ON public.platform_report_runs TO service_role;
ALTER TABLE public.platform_report_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report runs read" ON public.platform_report_runs FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR public.has_admin_permission(auth.uid(), 'reports.view')
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "report runs insert" ON public.platform_report_runs FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND (public.has_admin_permission(auth.uid(), 'reports.view') OR public.is_admin_department_member(auth.uid(), 'founder_office'))
  );

CREATE TABLE public.platform_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  owner_department TEXT,
  layout TEXT NOT NULL DEFAULT 'grid',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_dashboards TO authenticated;
GRANT ALL ON public.platform_dashboards TO service_role;
ALTER TABLE public.platform_dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dashboards read" ON public.platform_dashboards FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'dashboards.view') OR public.is_admin_department_member(auth.uid(), 'founder_office'));
CREATE POLICY "dashboards manage" ON public.platform_dashboards FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));

CREATE TABLE public.platform_dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.platform_dashboards(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  title TEXT,
  position INT NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_widgets_dashboard_idx ON public.platform_dashboard_widgets(dashboard_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_dashboard_widgets TO authenticated;
GRANT ALL ON public.platform_dashboard_widgets TO service_role;
ALTER TABLE public.platform_dashboard_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "widgets read" ON public.platform_dashboard_widgets FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'dashboards.view') OR public.is_admin_department_member(auth.uid(), 'founder_office'));
CREATE POLICY "widgets manage" ON public.platform_dashboard_widgets FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));

CREATE TABLE public.platform_scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  cron TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_scheduled_jobs TO authenticated;
GRANT ALL ON public.platform_scheduled_jobs TO service_role;
ALTER TABLE public.platform_scheduled_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs read" ON public.platform_scheduled_jobs FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'scheduler.view') OR public.is_admin_department_member(auth.uid(), 'founder_office'));
CREATE POLICY "jobs manage" ON public.platform_scheduled_jobs FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(), 'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(), 'founder_office'));

CREATE TABLE public.platform_scheduled_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.platform_scheduled_jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  output JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_job_runs_job_idx ON public.platform_scheduled_job_runs(job_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.platform_scheduled_job_runs TO authenticated;
GRANT ALL ON public.platform_scheduled_job_runs TO service_role;
ALTER TABLE public.platform_scheduled_job_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job runs read" ON public.platform_scheduled_job_runs FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'scheduler.view') OR public.is_admin_department_member(auth.uid(), 'founder_office'));

-- Triggers
CREATE TRIGGER trg_platform_assignments_updated BEFORE UPDATE ON public.platform_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_platform_assignment_rules_updated BEFORE UPDATE ON public.platform_assignment_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_platform_documents_updated BEFORE UPDATE ON public.platform_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_platform_report_defs_updated BEFORE UPDATE ON public.platform_report_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_platform_dashboards_updated BEFORE UPDATE ON public.platform_dashboards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_platform_widgets_updated BEFORE UPDATE ON public.platform_dashboard_widgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_platform_jobs_updated BEFORE UPDATE ON public.platform_scheduled_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_scheduled_job_runs;

INSERT INTO public.admin_permissions (module, permission_key, name, description) VALUES
  ('platform', 'assignments.view', 'View Assignments', 'View assignment queue'),
  ('platform', 'assignments.manage', 'Manage Assignments', 'Create and reassign work'),
  ('platform', 'documents.view', 'View Documents', 'Browse the document platform'),
  ('platform', 'reports.view', 'View Reports', 'Browse and run reports'),
  ('platform', 'dashboards.view', 'View Dashboards', 'View shared dashboards'),
  ('platform', 'scheduler.view', 'View Scheduler', 'View scheduled jobs and runs')
ON CONFLICT (permission_key) DO NOTHING;
