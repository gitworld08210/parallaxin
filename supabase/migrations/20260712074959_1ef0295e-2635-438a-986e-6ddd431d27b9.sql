
-- Security staff helper
CREATE OR REPLACE FUNCTION public.is_security_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.admin_departments d ON d.id = e.department_id
    WHERE e.user_id = _user_id
      AND e.employment_status = 'active'
      AND d.key IN ('security','soc','iam','incident_response','threat_monitoring','security_compliance')
  ) OR public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.gen_sec_id(_prefix text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE seq_num int;
BEGIN
  seq_num := (floor(random() * 900000) + 100000)::int;
  RETURN _prefix || '-' || to_char(now(), 'YYYY') || '-' || seq_num::text;
END; $$;

-- INCIDENTS
CREATE TABLE public.sec_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_code text UNIQUE NOT NULL DEFAULT public.gen_sec_id('INC'),
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  category text,
  affected_systems text[] DEFAULT '{}',
  affected_users uuid[] DEFAULT '{}',
  assignee_id uuid REFERENCES auth.users(id),
  reporter_id uuid REFERENCES auth.users(id),
  detected_at timestamptz NOT NULL DEFAULT now(),
  contained_at timestamptz,
  recovered_at timestamptz,
  closed_at timestamptz,
  root_cause text,
  policy_refs text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_incidents TO authenticated;
GRANT ALL ON public.sec_incidents TO service_role;
ALTER TABLE public.sec_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security staff manage incidents" ON public.sec_incidents FOR ALL TO authenticated
  USING (public.is_security_staff(auth.uid())) WITH CHECK (public.is_security_staff(auth.uid()));

-- INCIDENT UPDATES (immutable)
CREATE TABLE public.sec_incident_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.sec_incidents(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  update_type text NOT NULL DEFAULT 'note',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sec_incident_updates TO authenticated;
GRANT ALL ON public.sec_incident_updates TO service_role;
ALTER TABLE public.sec_incident_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security staff view updates" ON public.sec_incident_updates FOR SELECT TO authenticated
  USING (public.is_security_staff(auth.uid()));
CREATE POLICY "Security staff add updates" ON public.sec_incident_updates FOR INSERT TO authenticated
  WITH CHECK (public.is_security_staff(auth.uid()) AND author_id = auth.uid());

-- THREAT EVENTS
CREATE TABLE public.sec_threat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_code text UNIQUE NOT NULL DEFAULT public.gen_sec_id('THR'),
  threat_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'new',
  source_ip text,
  target_user_id uuid REFERENCES auth.users(id),
  target_resource text,
  signal_data jsonb DEFAULT '{}',
  incident_id uuid REFERENCES public.sec_incidents(id) ON DELETE SET NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_threat_events TO authenticated;
GRANT ALL ON public.sec_threat_events TO service_role;
ALTER TABLE public.sec_threat_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security staff manage threats" ON public.sec_threat_events FOR ALL TO authenticated
  USING (public.is_security_staff(auth.uid())) WITH CHECK (public.is_security_staff(auth.uid()));

-- ACCESS REVIEWS
CREATE TABLE public.sec_access_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scope text NOT NULL DEFAULT 'department',
  scope_ref text,
  status text NOT NULL DEFAULT 'draft',
  due_date date,
  owner_id uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_access_reviews TO authenticated;
GRANT ALL ON public.sec_access_reviews TO service_role;
ALTER TABLE public.sec_access_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security staff manage access reviews" ON public.sec_access_reviews FOR ALL TO authenticated
  USING (public.is_security_staff(auth.uid())) WITH CHECK (public.is_security_staff(auth.uid()));

CREATE TABLE public.sec_access_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.sec_access_reviews(id) ON DELETE CASCADE,
  subject_user_id uuid REFERENCES auth.users(id),
  role_key text,
  permission_key text,
  decision text NOT NULL DEFAULT 'pending',
  decision_reason text,
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_access_review_items TO authenticated;
GRANT ALL ON public.sec_access_review_items TO service_role;
ALTER TABLE public.sec_access_review_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security staff manage review items" ON public.sec_access_review_items FOR ALL TO authenticated
  USING (public.is_security_staff(auth.uid())) WITH CHECK (public.is_security_staff(auth.uid()));
CREATE POLICY "Subjects view own review items" ON public.sec_access_review_items FOR SELECT TO authenticated
  USING (subject_user_id = auth.uid());

-- POLICIES
CREATE TABLE public.sec_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'security',
  version text NOT NULL DEFAULT '1.0',
  status text NOT NULL DEFAULT 'active',
  body text,
  owner_id uuid REFERENCES auth.users(id),
  effective_from date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_policies TO authenticated;
GRANT ALL ON public.sec_policies TO service_role;
ALTER TABLE public.sec_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view active policies" ON public.sec_policies FOR SELECT TO authenticated
  USING (status = 'active' OR public.is_security_staff(auth.uid()));
CREATE POLICY "Security staff write policies" ON public.sec_policies FOR ALL TO authenticated
  USING (public.is_security_staff(auth.uid())) WITH CHECK (public.is_security_staff(auth.uid()));

-- COMPLIANCE RECORDS
CREATE TABLE public.sec_compliance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code text NOT NULL,
  subject_type text NOT NULL DEFAULT 'department',
  subject_ref text,
  status text NOT NULL DEFAULT 'compliant',
  checked_by uuid REFERENCES auth.users(id),
  checked_at timestamptz NOT NULL DEFAULT now(),
  evidence text,
  next_check_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_compliance_records TO authenticated;
GRANT ALL ON public.sec_compliance_records TO service_role;
ALTER TABLE public.sec_compliance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security staff manage compliance" ON public.sec_compliance_records FOR ALL TO authenticated
  USING (public.is_security_staff(auth.uid())) WITH CHECK (public.is_security_staff(auth.uid()));

-- INVESTIGATIONS
CREATE TABLE public.sec_investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES public.sec_incidents(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  lead_investigator_id uuid REFERENCES auth.users(id),
  evidence jsonb DEFAULT '[]',
  timeline jsonb DEFAULT '[]',
  affected_systems text[] DEFAULT '{}',
  affected_users uuid[] DEFAULT '{}',
  actions_taken text,
  lessons_learned text,
  recommendations text,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_investigations TO authenticated;
GRANT ALL ON public.sec_investigations TO service_role;
ALTER TABLE public.sec_investigations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security staff manage investigations" ON public.sec_investigations FOR ALL TO authenticated
  USING (public.is_security_staff(auth.uid())) WITH CHECK (public.is_security_staff(auth.uid()));

-- AUDIT LOG (immutable)
CREATE TABLE public.sec_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sec_audit_logs TO authenticated;
GRANT ALL ON public.sec_audit_logs TO service_role;
ALTER TABLE public.sec_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security staff view audit" ON public.sec_audit_logs FOR SELECT TO authenticated
  USING (public.is_security_staff(auth.uid()));
CREATE POLICY "Any staff append audit" ON public.sec_audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- updated_at triggers
CREATE TRIGGER trg_sec_incidents_updated BEFORE UPDATE ON public.sec_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sec_threat_events_updated BEFORE UPDATE ON public.sec_threat_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sec_access_reviews_updated BEFORE UPDATE ON public.sec_access_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sec_access_review_items_updated BEFORE UPDATE ON public.sec_access_review_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sec_policies_updated BEFORE UPDATE ON public.sec_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sec_compliance_updated BEFORE UPDATE ON public.sec_compliance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sec_investigations_updated BEFORE UPDATE ON public.sec_investigations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sec_incidents_status ON public.sec_incidents(status);
CREATE INDEX idx_sec_incidents_severity ON public.sec_incidents(severity);
CREATE INDEX idx_sec_threat_events_status ON public.sec_threat_events(status);
CREATE INDEX idx_sec_threat_events_type ON public.sec_threat_events(threat_type);
CREATE INDEX idx_sec_review_items_review ON public.sec_access_review_items(review_id);
CREATE INDEX idx_sec_audit_entity ON public.sec_audit_logs(entity_type, entity_id);
