
-- Phase 3.3 — Executive Inbox & Approval Center

-- =============== 1. Executive Delegations ===============
CREATE TABLE public.executive_delegations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.platform_approval_requests(id) ON DELETE CASCADE,
  delegated_by    UUID NOT NULL,
  delegated_to    UUID NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','declined','revoked','expired','completed')),
  expires_at      TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_delegations_request_idx ON public.executive_delegations(request_id);
CREATE INDEX exec_delegations_delegate_idx ON public.executive_delegations(delegated_to, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_delegations TO authenticated;
GRANT ALL ON public.executive_delegations TO service_role;
ALTER TABLE public.executive_delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder office reads delegations"
  ON public.executive_delegations FOR SELECT TO authenticated
  USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
    OR delegated_to = auth.uid()
    OR delegated_by = auth.uid()
  );
CREATE POLICY "Founder office creates delegations"
  ON public.executive_delegations FOR INSERT TO authenticated
  WITH CHECK (
    delegated_by = auth.uid()
    AND public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "Delegate or founder office updates delegations"
  ON public.executive_delegations FOR UPDATE TO authenticated
  USING (
    delegated_to = auth.uid()
    OR delegated_by = auth.uid()
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- =============== 2. Executive Notes ===============
CREATE TABLE public.executive_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID NOT NULL REFERENCES public.platform_approval_requests(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL,
  body         TEXT NOT NULL,
  visibility   TEXT NOT NULL DEFAULT 'founder_office'
                 CHECK (visibility IN ('founder_office','shared')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_notes_request_idx ON public.executive_notes(request_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_notes TO authenticated;
GRANT ALL ON public.executive_notes TO service_role;
ALTER TABLE public.executive_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notes readable by founder office or requester"
  ON public.executive_notes FOR SELECT TO authenticated
  USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
    OR (
      visibility = 'shared'
      AND EXISTS (
        SELECT 1 FROM public.platform_approval_requests r
        WHERE r.id = executive_notes.request_id AND r.requested_by = auth.uid()
      )
    )
  );
CREATE POLICY "Founder office writes notes"
  ON public.executive_notes FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_admin_department_member(auth.uid(), 'founder_office')
  );
CREATE POLICY "Author deletes own note"
  ON public.executive_notes FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- =============== 3. Executive Escalations ===============
CREATE TABLE public.executive_escalations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id           UUID NOT NULL REFERENCES public.platform_approval_requests(id) ON DELETE CASCADE,
  reason               TEXT NOT NULL,
  triggered_by         TEXT NOT NULL DEFAULT 'system'
                         CHECK (triggered_by IN ('system','user')),
  triggered_by_user    UUID,
  from_priority        TEXT,
  to_priority          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exec_escalations_request_idx ON public.executive_escalations(request_id, created_at DESC);

GRANT SELECT, INSERT ON public.executive_escalations TO authenticated;
GRANT ALL ON public.executive_escalations TO service_role;
ALTER TABLE public.executive_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder office reads escalations"
  ON public.executive_escalations FOR SELECT TO authenticated
  USING (
    public.is_admin_department_member(auth.uid(), 'founder_office')
    OR public.has_admin_permission(auth.uid(), 'approvals.view')
  );
CREATE POLICY "Founder office writes escalations"
  ON public.executive_escalations FOR INSERT TO authenticated
  WITH CHECK (
    triggered_by_user = auth.uid()
    AND public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- =============== 4. Escalation on priority change ===============
CREATE OR REPLACE FUNCTION public.log_approval_priority_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_map JSONB := '{"low":1,"medium":2,"normal":2,"high":3,"critical":4,"urgent":4}';
  old_rank INT;
  new_rank INT;
BEGIN
  old_rank := COALESCE((order_map->>OLD.priority)::INT, 2);
  new_rank := COALESCE((order_map->>NEW.priority)::INT, 2);
  IF new_rank > old_rank THEN
    INSERT INTO public.executive_escalations(
      request_id, reason, triggered_by, from_priority, to_priority
    ) VALUES (
      NEW.id,
      'Priority escalated from ' || OLD.priority || ' to ' || NEW.priority,
      'system',
      OLD.priority,
      NEW.priority
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_approval_priority_change ON public.platform_approval_requests;
CREATE TRIGGER trg_approval_priority_change
  AFTER UPDATE OF priority ON public.platform_approval_requests
  FOR EACH ROW
  WHEN (OLD.priority IS DISTINCT FROM NEW.priority)
  EXECUTE FUNCTION public.log_approval_priority_change();

-- =============== 5. Updated_at trigger for delegations ===============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exec_delegations_touch ON public.executive_delegations;
CREATE TRIGGER trg_exec_delegations_touch
  BEFORE UPDATE ON public.executive_delegations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =============== 6. Executive Timeline view ===============
CREATE OR REPLACE VIEW public.executive_approval_timeline AS
  SELECT
    r.id                       AS request_id,
    'created'                  AS event_kind,
    r.created_at               AS event_at,
    r.requested_by             AS actor_id,
    'Request created'          AS summary,
    jsonb_build_object('title', r.title, 'priority', r.priority) AS metadata
  FROM public.platform_approval_requests r
  UNION ALL
  SELECT
    s.request_id,
    'step',
    s.updated_at,
    s.approver_user_id,
    'Step ' || s.step_index || ' · ' || COALESCE(s.approver_role, s.approver_department, 'Reviewer') || ' · ' || s.status,
    jsonb_build_object('status', s.status, 'step', s.step_index)
  FROM public.platform_approval_steps s
  UNION ALL
  SELECT
    d.request_id,
    'decision',
    d.created_at,
    d.decided_by,
    'Decision · ' || d.decision || COALESCE(' · ' || d.reason, ''),
    jsonb_build_object('decision', d.decision)
  FROM public.platform_approval_decisions d
  UNION ALL
  SELECT
    del.request_id,
    'delegation',
    del.created_at,
    del.delegated_by,
    'Delegated to ' || del.delegated_to::TEXT || ' · ' || del.status,
    jsonb_build_object('to', del.delegated_to, 'status', del.status)
  FROM public.executive_delegations del
  UNION ALL
  SELECT
    e.request_id,
    'escalation',
    e.created_at,
    e.triggered_by_user,
    e.reason,
    jsonb_build_object('from', e.from_priority, 'to', e.to_priority)
  FROM public.executive_escalations e
  UNION ALL
  SELECT
    n.request_id,
    'note',
    n.created_at,
    n.author_id,
    'Executive note added',
    jsonb_build_object('visibility', n.visibility)
  FROM public.executive_notes n;

GRANT SELECT ON public.executive_approval_timeline TO authenticated;

-- =============== 7. Permission registry ===============
INSERT INTO public.admin_permissions(module, permission_key, name, description) VALUES
  ('founder_office', 'founder_office.inbox.view',    'Executive Inbox — View',   'View the Executive Inbox'),
  ('founder_office', 'founder_office.inbox.decide',  'Executive Inbox — Decide', 'Approve/reject executive requests'),
  ('founder_office', 'founder_office.delegate',      'Executive Delegation',     'Delegate executive reviews')
ON CONFLICT (permission_key) DO NOTHING;
