
CREATE OR REPLACE FUNCTION public.is_engineering_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.admin_departments d ON d.id = e.department_id
    WHERE e.user_id = _user_id
      AND e.employment_status = 'active'
      AND d.key IN ('engineering','product','engineering_product','eng','design','qa','devops','ai')
  ) OR public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.gen_eng_id(_prefix text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE seq_num int;
BEGIN
  seq_num := (floor(random() * 900000) + 100000)::int;
  RETURN _prefix || '-' || to_char(now(), 'YYYY') || '-' || seq_num::text;
END; $$;

CREATE TABLE public.eng_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eng_products TO authenticated;
GRANT ALL ON public.eng_products TO service_role;
ALTER TABLE public.eng_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng_products view" ON public.eng_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "eng_products manage" ON public.eng_products FOR ALL TO authenticated
  USING (public.is_engineering_staff(auth.uid())) WITH CHECK (public.is_engineering_staff(auth.uid()));

CREATE TABLE public.eng_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.eng_products(id) ON DELETE SET NULL,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planning',
  health text NOT NULL DEFAULT 'green',
  priority text NOT NULL DEFAULT 'medium',
  start_date date,
  target_date date,
  lead_id uuid REFERENCES auth.users(id),
  team text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eng_projects TO authenticated;
GRANT ALL ON public.eng_projects TO service_role;
ALTER TABLE public.eng_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng_projects view" ON public.eng_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "eng_projects manage" ON public.eng_projects FOR ALL TO authenticated
  USING (public.is_engineering_staff(auth.uid())) WITH CHECK (public.is_engineering_staff(auth.uid()));

CREATE TABLE public.eng_epics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.eng_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planning',
  priority text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eng_epics TO authenticated;
GRANT ALL ON public.eng_epics TO service_role;
ALTER TABLE public.eng_epics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng_epics view" ON public.eng_epics FOR SELECT TO authenticated USING (true);
CREATE POLICY "eng_epics manage" ON public.eng_epics FOR ALL TO authenticated
  USING (public.is_engineering_staff(auth.uid())) WITH CHECK (public.is_engineering_staff(auth.uid()));

CREATE TABLE public.eng_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id text UNIQUE NOT NULL DEFAULT public.gen_eng_id('FEAT'),
  epic_id uuid REFERENCES public.eng_epics(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES public.eng_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'proposed',
  priority text NOT NULL DEFAULT 'medium',
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eng_features TO authenticated;
GRANT ALL ON public.eng_features TO service_role;
ALTER TABLE public.eng_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng_features view" ON public.eng_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "eng_features manage" ON public.eng_features FOR ALL TO authenticated
  USING (public.is_engineering_staff(auth.uid())) WITH CHECK (public.is_engineering_staff(auth.uid()));

CREATE TABLE public.eng_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.eng_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal text,
  status text NOT NULL DEFAULT 'planned',
  start_date date,
  end_date date,
  velocity numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eng_sprints TO authenticated;
GRANT ALL ON public.eng_sprints TO service_role;
ALTER TABLE public.eng_sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng_sprints view" ON public.eng_sprints FOR SELECT TO authenticated USING (true);
CREATE POLICY "eng_sprints manage" ON public.eng_sprints FOR ALL TO authenticated
  USING (public.is_engineering_staff(auth.uid())) WITH CHECK (public.is_engineering_staff(auth.uid()));

CREATE TABLE public.eng_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text UNIQUE NOT NULL DEFAULT public.gen_eng_id('TASK'),
  project_id uuid NOT NULL REFERENCES public.eng_projects(id) ON DELETE CASCADE,
  sprint_id uuid REFERENCES public.eng_sprints(id) ON DELETE SET NULL,
  feature_id uuid REFERENCES public.eng_features(id) ON DELETE SET NULL,
  epic_id uuid REFERENCES public.eng_epics(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  task_type text NOT NULL DEFAULT 'task',
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  assignee_id uuid REFERENCES auth.users(id),
  reporter_id uuid REFERENCES auth.users(id),
  story_points numeric,
  estimate_hours numeric,
  labels text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eng_tasks TO authenticated;
GRANT ALL ON public.eng_tasks TO service_role;
ALTER TABLE public.eng_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng_tasks view" ON public.eng_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "eng_tasks manage" ON public.eng_tasks FOR ALL TO authenticated
  USING (public.is_engineering_staff(auth.uid())) WITH CHECK (public.is_engineering_staff(auth.uid()));

CREATE TABLE public.eng_bugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id text UNIQUE NOT NULL DEFAULT public.gen_eng_id('BUG'),
  project_id uuid NOT NULL REFERENCES public.eng_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  environment text,
  reproduction_steps text,
  expected_behavior text,
  actual_behavior text,
  assignee_id uuid REFERENCES auth.users(id),
  reporter_id uuid REFERENCES auth.users(id),
  release_id uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eng_bugs TO authenticated;
GRANT ALL ON public.eng_bugs TO service_role;
ALTER TABLE public.eng_bugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng_bugs view" ON public.eng_bugs FOR SELECT TO authenticated USING (true);
CREATE POLICY "eng_bugs manage" ON public.eng_bugs FOR ALL TO authenticated
  USING (public.is_engineering_staff(auth.uid())) WITH CHECK (public.is_engineering_staff(auth.uid()));

CREATE TABLE public.eng_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id text UNIQUE NOT NULL DEFAULT public.gen_eng_id('REL'),
  project_id uuid NOT NULL REFERENCES public.eng_projects(id) ON DELETE CASCADE,
  version text NOT NULL,
  title text NOT NULL,
  release_notes text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  qa_approved boolean NOT NULL DEFAULT false,
  qa_approved_by uuid REFERENCES auth.users(id),
  qa_approved_at timestamptz,
  founder_approved boolean NOT NULL DEFAULT false,
  founder_approved_by uuid REFERENCES auth.users(id),
  founder_approved_at timestamptz,
  is_production boolean NOT NULL DEFAULT false,
  scheduled_at timestamptz,
  released_at timestamptz,
  released_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eng_releases TO authenticated;
GRANT ALL ON public.eng_releases TO service_role;
ALTER TABLE public.eng_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng_releases view" ON public.eng_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY "eng_releases manage" ON public.eng_releases FOR ALL TO authenticated
  USING (public.is_engineering_staff(auth.uid())) WITH CHECK (public.is_engineering_staff(auth.uid()));

CREATE TABLE public.eng_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid REFERENCES public.eng_releases(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES public.eng_projects(id) ON DELETE CASCADE,
  environment text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  deployed_by uuid REFERENCES auth.users(id),
  deployed_at timestamptz,
  rolled_back boolean NOT NULL DEFAULT false,
  rollback_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eng_deployments TO authenticated;
GRANT ALL ON public.eng_deployments TO service_role;
ALTER TABLE public.eng_deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng_deployments view" ON public.eng_deployments FOR SELECT TO authenticated USING (true);
CREATE POLICY "eng_deployments manage" ON public.eng_deployments FOR ALL TO authenticated
  USING (public.is_engineering_staff(auth.uid())) WITH CHECK (public.is_engineering_staff(auth.uid()));

CREATE TABLE public.eng_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.eng_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  doc_type text NOT NULL DEFAULT 'spec',
  content text,
  version int NOT NULL DEFAULT 1,
  author_id uuid REFERENCES auth.users(id),
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eng_documents TO authenticated;
GRANT ALL ON public.eng_documents TO service_role;
ALTER TABLE public.eng_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng_documents view" ON public.eng_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "eng_documents manage" ON public.eng_documents FOR ALL TO authenticated
  USING (public.is_engineering_staff(auth.uid())) WITH CHECK (public.is_engineering_staff(auth.uid()));

CREATE TABLE public.eng_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.eng_history TO authenticated;
GRANT ALL ON public.eng_history TO service_role;
ALTER TABLE public.eng_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng_history view" ON public.eng_history FOR SELECT TO authenticated
  USING (public.is_engineering_staff(auth.uid()));
CREATE POLICY "eng_history insert" ON public.eng_history FOR INSERT TO authenticated
  WITH CHECK (public.is_engineering_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.eng_prevent_update_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Engineering history is immutable';
END; $$;

CREATE TRIGGER eng_history_no_update BEFORE UPDATE ON public.eng_history
  FOR EACH ROW EXECUTE FUNCTION public.eng_prevent_update_delete();
CREATE TRIGGER eng_history_no_delete BEFORE DELETE ON public.eng_history
  FOR EACH ROW EXECUTE FUNCTION public.eng_prevent_update_delete();

CREATE TRIGGER trg_eng_products_updated BEFORE UPDATE ON public.eng_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_eng_projects_updated BEFORE UPDATE ON public.eng_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_eng_epics_updated BEFORE UPDATE ON public.eng_epics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_eng_features_updated BEFORE UPDATE ON public.eng_features FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_eng_sprints_updated BEFORE UPDATE ON public.eng_sprints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_eng_tasks_updated BEFORE UPDATE ON public.eng_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_eng_bugs_updated BEFORE UPDATE ON public.eng_bugs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_eng_releases_updated BEFORE UPDATE ON public.eng_releases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_eng_deployments_updated BEFORE UPDATE ON public.eng_deployments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_eng_documents_updated BEFORE UPDATE ON public.eng_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_eng_projects_status ON public.eng_projects(status);
CREATE INDEX idx_eng_tasks_project ON public.eng_tasks(project_id);
CREATE INDEX idx_eng_tasks_sprint ON public.eng_tasks(sprint_id);
CREATE INDEX idx_eng_tasks_status ON public.eng_tasks(status);
CREATE INDEX idx_eng_tasks_assignee ON public.eng_tasks(assignee_id);
CREATE INDEX idx_eng_bugs_project ON public.eng_bugs(project_id);
CREATE INDEX idx_eng_bugs_status ON public.eng_bugs(status);
CREATE INDEX idx_eng_releases_project ON public.eng_releases(project_id);
CREATE INDEX idx_eng_history_entity ON public.eng_history(entity_type, entity_id);
