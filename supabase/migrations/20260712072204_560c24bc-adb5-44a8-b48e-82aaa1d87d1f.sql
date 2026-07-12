
CREATE SEQUENCE IF NOT EXISTS public.ts_case_number_seq START 1000;

CREATE OR REPLACE FUNCTION public.is_trust_safety_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.user_id = _user_id
          AND (
            e.department_id IN (SELECT id FROM public.admin_departments WHERE lower(name) LIKE '%trust%' OR lower(name) LIKE '%safety%')
            OR EXISTS (
              SELECT 1 FROM public.admin_role_permissions rp
              JOIN public.admin_permissions p ON p.id = rp.permission_id
              WHERE rp.role_id = e.role_id
                AND p.permission_key IN ('trust_safety.reports.view','trust_safety.reports.act')
            )
          )
      );
$$;

CREATE TABLE public.ts_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL UNIQUE DEFAULT ('TS-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.ts_case_number_seq')::text, 6, '0')),
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'user_report',
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  subject_content_type TEXT,
  subject_content_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  requires_founder_review BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ts_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.ts_cases(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  description TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ts_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.ts_cases(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ts_policy_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ts_enforcement_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.ts_cases(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  reason TEXT NOT NULL,
  policy_reference TEXT NOT NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ts_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.ts_cases(id) ON DELETE CASCADE,
  enforcement_action_id UUID REFERENCES public.ts_enforcement_actions(id) ON DELETE SET NULL,
  appellant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision TEXT,
  decision_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ts_case_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.ts_cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ts_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ts_evidence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ts_internal_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ts_enforcement_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ts_appeals TO authenticated;
GRANT SELECT, INSERT ON public.ts_case_timeline TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ts_policy_references TO authenticated;
GRANT USAGE ON SEQUENCE public.ts_case_number_seq TO authenticated;
GRANT ALL ON public.ts_cases, public.ts_evidence, public.ts_internal_notes, public.ts_enforcement_actions, public.ts_appeals, public.ts_case_timeline, public.ts_policy_references TO service_role;
GRANT ALL ON SEQUENCE public.ts_case_number_seq TO service_role;

ALTER TABLE public.ts_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_enforcement_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_case_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_policy_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TS staff manage cases" ON public.ts_cases FOR ALL TO authenticated
  USING (public.is_trust_safety_staff(auth.uid())) WITH CHECK (public.is_trust_safety_staff(auth.uid()));
CREATE POLICY "Reporters can create cases" ON public.ts_cases FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id OR auth.uid() = created_by);
CREATE POLICY "Reporters can view own cases" ON public.ts_cases FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "TS staff read evidence" ON public.ts_evidence FOR SELECT TO authenticated
  USING (public.is_trust_safety_staff(auth.uid()));
CREATE POLICY "TS staff add evidence" ON public.ts_evidence FOR INSERT TO authenticated
  WITH CHECK (public.is_trust_safety_staff(auth.uid()));
CREATE POLICY "TS staff update unlocked evidence" ON public.ts_evidence FOR UPDATE TO authenticated
  USING (public.is_trust_safety_staff(auth.uid()) AND is_locked = false)
  WITH CHECK (public.is_trust_safety_staff(auth.uid()));

CREATE POLICY "TS staff manage notes" ON public.ts_internal_notes FOR ALL TO authenticated
  USING (public.is_trust_safety_staff(auth.uid())) WITH CHECK (public.is_trust_safety_staff(auth.uid()));

CREATE POLICY "TS staff manage enforcement" ON public.ts_enforcement_actions FOR ALL TO authenticated
  USING (public.is_trust_safety_staff(auth.uid())) WITH CHECK (public.is_trust_safety_staff(auth.uid()));

CREATE POLICY "TS staff manage appeals" ON public.ts_appeals FOR ALL TO authenticated
  USING (public.is_trust_safety_staff(auth.uid())) WITH CHECK (public.is_trust_safety_staff(auth.uid()));
CREATE POLICY "Appellants can submit appeals" ON public.ts_appeals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = appellant_id);
CREATE POLICY "Appellants view own appeals" ON public.ts_appeals FOR SELECT TO authenticated
  USING (auth.uid() = appellant_id);

CREATE POLICY "TS staff read timeline" ON public.ts_case_timeline FOR SELECT TO authenticated
  USING (public.is_trust_safety_staff(auth.uid()));
CREATE POLICY "TS staff add timeline" ON public.ts_case_timeline FOR INSERT TO authenticated
  WITH CHECK (public.is_trust_safety_staff(auth.uid()));

CREATE POLICY "Employees read policies" ON public.ts_policy_references FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage policies" ON public.ts_policy_references FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ts_cases_status ON public.ts_cases(status, severity, priority);
CREATE INDEX idx_ts_cases_assigned ON public.ts_cases(assigned_to);
CREATE INDEX idx_ts_cases_category ON public.ts_cases(category);
CREATE INDEX idx_ts_cases_subject_user ON public.ts_cases(subject_user_id);
CREATE INDEX idx_ts_evidence_case ON public.ts_evidence(case_id);
CREATE INDEX idx_ts_notes_case ON public.ts_internal_notes(case_id);
CREATE INDEX idx_ts_enforcement_case ON public.ts_enforcement_actions(case_id);
CREATE INDEX idx_ts_appeals_case ON public.ts_appeals(case_id);
CREATE INDEX idx_ts_timeline_case ON public.ts_case_timeline(case_id, created_at);

CREATE TRIGGER trg_ts_cases_updated BEFORE UPDATE ON public.ts_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ts_policy_updated BEFORE UPDATE ON public.ts_policy_references
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ts_log_case_created() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ts_case_timeline (case_id, event_type, actor_id, description, metadata)
  VALUES (NEW.id, 'case_created', NEW.created_by, 'Case created', jsonb_build_object('category', NEW.category, 'severity', NEW.severity));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_ts_case_created AFTER INSERT ON public.ts_cases
  FOR EACH ROW EXECUTE FUNCTION public.ts_log_case_created();

CREATE OR REPLACE FUNCTION public.ts_log_enforcement() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ts_case_timeline (case_id, event_type, actor_id, description, metadata)
  VALUES (NEW.case_id, 'enforcement_applied', NEW.created_by, NEW.action_type,
          jsonb_build_object('policy', NEW.policy_reference, 'target_type', NEW.target_type));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_ts_enforcement_log AFTER INSERT ON public.ts_enforcement_actions
  FOR EACH ROW EXECUTE FUNCTION public.ts_log_enforcement();

INSERT INTO public.ts_policy_references (code, title, category, description) VALUES
  ('POL-CS-001','Community Standards','general','General platform community standards'),
  ('POL-SPAM-001','Spam & Manipulation','spam','Prohibits automated/deceptive engagement'),
  ('POL-IMP-001','Impersonation Policy','identity','Prohibits impersonation of persons or brands'),
  ('POL-HAR-001','Harassment & Bullying','safety','Prohibits targeted harassment'),
  ('POL-CS-002','Child Safety','critical','Zero tolerance for child endangerment'),
  ('POL-SCAM-001','Fraud & Scams','fraud','Prohibits fraudulent solicitation'),
  ('POL-CR-001','Copyright & IP','ip','DMCA and IP infringement'),
  ('POL-PRIV-001','Privacy Policy','privacy','Personal information disclosure rules')
ON CONFLICT (code) DO NOTHING;
