
-- Phase 3.12 Production Readiness
CREATE TABLE public.production_validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  triggered_by UUID REFERENCES auth.users(id),
  total_checks INT NOT NULL DEFAULT 0,
  passed_checks INT NOT NULL DEFAULT 0,
  failed_checks INT NOT NULL DEFAULT 0,
  warning_checks INT NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.production_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.production_validation_runs(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  check_name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.production_integration_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.production_validation_runs(id) ON DELETE CASCADE,
  source_module TEXT NOT NULL,
  target_module TEXT NOT NULL,
  integration_name TEXT NOT NULL,
  status TEXT NOT NULL,
  latency_ms INT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.production_readiness_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  score INT NOT NULL DEFAULT 0,
  notes TEXT,
  last_checked_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.production_release_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  release_type TEXT NOT NULL DEFAULT 'production',
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by UUID REFERENCES auth.users(id),
  validation_run_id UUID REFERENCES public.production_validation_runs(id),
  release_notes TEXT,
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.production_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  module TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  description TEXT,
  detected_by TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_validation_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_health_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_integration_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_readiness_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_release_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_issues TO authenticated;
GRANT ALL ON public.production_validation_runs, public.production_health_checks, public.production_integration_results, public.production_readiness_status, public.production_release_history, public.production_issues TO service_role;

ALTER TABLE public.production_validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_integration_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_readiness_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_release_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_issues ENABLE ROW LEVEL SECURITY;

-- Founder Office only (reuse has_role pattern already in project)
CREATE POLICY "Founders manage validation runs" ON public.production_validation_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Founders manage health checks" ON public.production_health_checks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Founders manage integration results" ON public.production_integration_results FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Founders manage readiness" ON public.production_readiness_status FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Founders manage releases" ON public.production_release_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Founders manage issues" ON public.production_issues FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_health_checks_run ON public.production_health_checks(run_id);
CREATE INDEX idx_integration_run ON public.production_integration_results(run_id);
CREATE INDEX idx_issues_status ON public.production_issues(status, severity);

CREATE TRIGGER trg_issues_updated BEFORE UPDATE ON public.production_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_readiness_updated BEFORE UPDATE ON public.production_readiness_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed readiness categories
INSERT INTO public.production_readiness_status (category, status, score) VALUES
  ('security', 'pending', 0),
  ('governance', 'pending', 0),
  ('automation', 'pending', 0),
  ('reports', 'pending', 0),
  ('ai', 'pending', 0),
  ('workflows', 'pending', 0),
  ('rbac', 'pending', 0),
  ('audit', 'pending', 0),
  ('performance', 'pending', 0),
  ('bugs', 'pending', 0)
ON CONFLICT (category) DO NOTHING;
