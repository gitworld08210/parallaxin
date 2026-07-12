
-- =========================================================
-- Phase 3.5 — Strategic Decision Center
-- =========================================================

-- Helper: check founder office (already exists as is_admin_department_member).

-- ---------- STRATEGIC DECISIONS ----------
CREATE TABLE public.strategic_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  business_problem TEXT,
  objectives TEXT,
  alternatives_considered TEXT,
  risk_assessment TEXT,
  expected_benefits TEXT,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','discussion','review','approved','implementation','monitoring','completed','archived')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affected_departments UUID[] NOT NULL DEFAULT '{}',
  effective_date DATE,
  review_date DATE,
  completed_date DATE,
  current_version INT NOT NULL DEFAULT 1,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX strat_dec_status_idx ON public.strategic_decisions(status);
CREATE INDEX strat_dec_category_idx ON public.strategic_decisions(category);
CREATE INDEX strat_dec_owner_idx ON public.strategic_decisions(owner_id);

GRANT SELECT, INSERT, UPDATE ON public.strategic_decisions TO authenticated;
GRANT ALL ON public.strategic_decisions TO service_role;
ALTER TABLE public.strategic_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strat_dec_read" ON public.strategic_decisions
  FOR SELECT TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
    OR status IN ('implementation','monitoring','completed','archived')
  );
CREATE POLICY "strat_dec_insert_founder" ON public.strategic_decisions
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "strat_dec_update_founder" ON public.strategic_decisions
  FOR UPDATE TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- ---------- VERSIONS ----------
CREATE TABLE public.strategic_decision_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.strategic_decisions(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,
  changelog TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (decision_id, version)
);
CREATE INDEX strat_dec_ver_idx ON public.strategic_decision_versions(decision_id, version DESC);
GRANT SELECT, INSERT ON public.strategic_decision_versions TO authenticated;
GRANT ALL ON public.strategic_decision_versions TO service_role;
ALTER TABLE public.strategic_decision_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strat_ver_read_founder" ON public.strategic_decision_versions
  FOR SELECT TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "strat_ver_insert_founder" ON public.strategic_decision_versions
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- ---------- PARTICIPANTS ----------
CREATE TABLE public.strategic_decision_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.strategic_decisions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','reviewer','approver','contributor','observer')),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (decision_id, user_id, role)
);
CREATE INDEX strat_dec_part_idx ON public.strategic_decision_participants(decision_id);
CREATE INDEX strat_dec_part_user_idx ON public.strategic_decision_participants(user_id);
GRANT SELECT, INSERT, DELETE ON public.strategic_decision_participants TO authenticated;
GRANT ALL ON public.strategic_decision_participants TO service_role;
ALTER TABLE public.strategic_decision_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strat_part_read" ON public.strategic_decision_participants
  FOR SELECT TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
    OR user_id = auth.uid()
  );
CREATE POLICY "strat_part_write_founder" ON public.strategic_decision_participants
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "strat_part_delete_founder" ON public.strategic_decision_participants
  FOR DELETE TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- ---------- TIMELINE (append-only) ----------
CREATE TABLE public.strategic_decision_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.strategic_decisions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX strat_dec_timeline_idx ON public.strategic_decision_timeline(decision_id, created_at DESC);
GRANT SELECT, INSERT ON public.strategic_decision_timeline TO authenticated;
GRANT ALL ON public.strategic_decision_timeline TO service_role;
ALTER TABLE public.strategic_decision_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strat_timeline_read" ON public.strategic_decision_timeline
  FOR SELECT TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
    OR EXISTS (
      SELECT 1 FROM public.strategic_decisions d
      WHERE d.id = decision_id
        AND d.status IN ('implementation','monitoring','completed','archived')
    )
  );
CREATE POLICY "strat_timeline_insert_founder" ON public.strategic_decision_timeline
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- ---------- IMPACT ----------
CREATE TABLE public.strategic_decision_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.strategic_decisions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL
    CHECK (kind IN ('expected','actual','financial','operational','employee','customer','risk','lessons')),
  summary TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX strat_dec_impact_idx ON public.strategic_decision_impact(decision_id, recorded_at DESC);
GRANT SELECT, INSERT ON public.strategic_decision_impact TO authenticated;
GRANT ALL ON public.strategic_decision_impact TO service_role;
ALTER TABLE public.strategic_decision_impact ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strat_impact_read" ON public.strategic_decision_impact
  FOR SELECT TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
    OR EXISTS (
      SELECT 1 FROM public.strategic_decisions d
      WHERE d.id = decision_id
        AND d.status IN ('implementation','monitoring','completed','archived')
    )
  );
CREATE POLICY "strat_impact_insert_founder" ON public.strategic_decision_impact
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- ---------- ATTACHMENTS ----------
CREATE TABLE public.strategic_decision_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.strategic_decisions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  version INT NOT NULL DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX strat_dec_att_idx ON public.strategic_decision_attachments(decision_id);
GRANT SELECT, INSERT ON public.strategic_decision_attachments TO authenticated;
GRANT ALL ON public.strategic_decision_attachments TO service_role;
ALTER TABLE public.strategic_decision_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strat_att_read_founder" ON public.strategic_decision_attachments
  FOR SELECT TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "strat_att_insert_founder" ON public.strategic_decision_attachments
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- ---------- DEPENDENCIES ----------
CREATE TABLE public.strategic_decision_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.strategic_decisions(id) ON DELETE CASCADE,
  related_decision_id UUID REFERENCES public.strategic_decisions(id) ON DELETE SET NULL,
  related_policy_id UUID REFERENCES public.governance_policies(id) ON DELETE SET NULL,
  related_approval_request_id UUID REFERENCES public.platform_approval_requests(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'related',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX strat_dec_dep_idx ON public.strategic_decision_dependencies(decision_id);
GRANT SELECT, INSERT, DELETE ON public.strategic_decision_dependencies TO authenticated;
GRANT ALL ON public.strategic_decision_dependencies TO service_role;
ALTER TABLE public.strategic_decision_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strat_dep_read" ON public.strategic_decision_dependencies
  FOR SELECT TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
    OR EXISTS (
      SELECT 1 FROM public.strategic_decisions d
      WHERE d.id = decision_id
        AND d.status IN ('implementation','monitoring','completed','archived')
    )
  );
CREATE POLICY "strat_dep_write_founder" ON public.strategic_decision_dependencies
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "strat_dep_delete_founder" ON public.strategic_decision_dependencies
  FOR DELETE TO authenticated USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- ---------- TRIGGERS ----------
CREATE TRIGGER trg_strat_dec_touch BEFORE UPDATE ON public.strategic_decisions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
