
-- 1) Lock financial columns on tips via BEFORE UPDATE trigger
CREATE OR REPLACE FUNCTION public.tips_lock_financial_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
     OR NEW.post_id IS DISTINCT FROM OLD.post_id
     OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
     OR NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents
     OR NEW.net_cents IS DISTINCT FROM OLD.net_cents
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.environment IS DISTINCT FROM OLD.environment
     OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
  THEN
    -- Allow service_role (edge functions) to correct amounts if needed
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Financial fields on tips are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tips_lock_financial_columns_trg ON public.tips;
CREATE TRIGGER tips_lock_financial_columns_trg
BEFORE UPDATE ON public.tips
FOR EACH ROW EXECUTE FUNCTION public.tips_lock_financial_columns();

-- 2) Recreate views with security_invoker=on
DROP VIEW IF EXISTS public.aap_founder_finance_overview;
CREATE VIEW public.aap_founder_finance_overview
WITH (security_invoker=on) AS
SELECT
  (SELECT COALESCE(sum(total),0) FROM aap_invoices WHERE status='paid'::aap_invoice_status) AS collected_revenue,
  (SELECT COALESCE(sum(total),0) FROM aap_invoices WHERE status = ANY (ARRAY['issued'::aap_invoice_status,'overdue'::aap_invoice_status])) AS outstanding_revenue,
  (SELECT COALESCE(sum(total),0) FROM aap_invoices WHERE status='overdue'::aap_invoice_status) AS overdue_revenue,
  (SELECT COALESCE(sum(total),0) FROM aap_invoices) AS total_revenue,
  (SELECT COALESCE(sum(outstanding_amount),0) FROM aap_collections_cases WHERE status='bad_debt') AS bad_debt,
  (SELECT COALESCE(sum(credit_limit),0) FROM aap_postpaid_accounts WHERE status='active') AS total_credit_exposure,
  (SELECT count(*) FROM aap_postpaid_accounts WHERE status='active') AS postpaid_accounts,
  (SELECT count(*) FROM aap_credit_applications WHERE status = ANY (ARRAY['pending','under_review'])) AS pending_applications,
  (SELECT count(*) FROM aap_risk_events WHERE severity = ANY (ARRAY['high','critical']) AND resolved=false) AS active_risk_alerts;
GRANT SELECT ON public.aap_founder_finance_overview TO authenticated, service_role;

DROP VIEW IF EXISTS public.executive_approval_timeline;
CREATE VIEW public.executive_approval_timeline
WITH (security_invoker=on) AS
SELECT r.id AS request_id, 'created'::text AS event_kind, r.created_at AS event_at, r.requested_by AS actor_id,
       'Request created'::text AS summary,
       jsonb_build_object('title', r.title, 'priority', r.priority) AS metadata
FROM platform_approval_requests r
UNION ALL
SELECT s.request_id, 'step', s.updated_at, s.approver_user_id,
       'Step '||s.step_index||' · '||COALESCE(s.approver_role,s.approver_department,'Reviewer')||' · '||s.status,
       jsonb_build_object('status', s.status, 'step', s.step_index)
FROM platform_approval_steps s
UNION ALL
SELECT d.request_id, 'decision', d.created_at, d.decided_by,
       'Decision · '||d.decision||COALESCE(' · '||d.reason,''),
       jsonb_build_object('decision', d.decision)
FROM platform_approval_decisions d
UNION ALL
SELECT del.request_id, 'delegation', del.created_at, del.delegated_by,
       'Delegated to '||del.delegated_to::text||' · '||del.status,
       jsonb_build_object('to', del.delegated_to, 'status', del.status)
FROM executive_delegations del
UNION ALL
SELECT e.request_id, 'escalation', e.created_at, e.triggered_by_user, e.reason,
       jsonb_build_object('from', e.from_priority, 'to', e.to_priority)
FROM executive_escalations e
UNION ALL
SELECT n.request_id, 'note', n.created_at, n.author_id, 'Executive note added',
       jsonb_build_object('visibility', n.visibility)
FROM executive_notes n;
GRANT SELECT ON public.executive_approval_timeline TO authenticated, service_role;

-- 3) Tighten always-true RLS policies
-- 3a) platform_approval_requests: add WITH CHECK that matches USING
DROP POLICY IF EXISTS "approvals updatable by approvers" ON public.platform_approval_requests;
CREATE POLICY "approvals updatable by approvers"
ON public.platform_approval_requests
FOR UPDATE
USING (has_admin_permission(auth.uid(),'approvals.decide') OR is_admin_department_member(auth.uid(),'founder_office'))
WITH CHECK (has_admin_permission(auth.uid(),'approvals.decide') OR is_admin_department_member(auth.uid(),'founder_office'));

-- 3b) ver_history: writer must set actor_id = auth.uid()
DROP POLICY IF EXISTS ver_hist_insert_any_auth ON public.ver_history;
CREATE POLICY ver_hist_insert_self
ON public.ver_history
FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid());

-- 3c) sup_history: writer must set actor_id = auth.uid()
DROP POLICY IF EXISTS sup_hist_insert_any ON public.sup_history;
CREATE POLICY sup_hist_insert_self
ON public.sup_history
FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid());

-- 3d) routing_events: only service_role or the actor themselves
DROP POLICY IF EXISTS "routing_events insertable by system" ON public.routing_events;
CREATE POLICY routing_events_insert_self_or_service
ON public.routing_events
FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR actor_id = auth.uid());

-- 4) Set fixed search_path on our custom functions
ALTER FUNCTION public.aap_ledger_immutable_guard() SET search_path = public;
ALTER FUNCTION public.eng_prevent_update_delete() SET search_path = public;
ALTER FUNCTION public.fin_prevent_update_delete() SET search_path = public;
ALTER FUNCTION public.gen_eng_id(text) SET search_path = public;
ALTER FUNCTION public.gen_fin_id(text) SET search_path = public;
ALTER FUNCTION public.hash_credential(text) SET search_path = public;
ALTER FUNCTION public.tg_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.ver_app_before_insert() SET search_path = public;
ALTER FUNCTION public.ver_badge_before_insert() SET search_path = public;
ALTER FUNCTION public.ver_block_write() SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
