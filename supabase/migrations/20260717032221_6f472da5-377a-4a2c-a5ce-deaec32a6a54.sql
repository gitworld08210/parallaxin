-- Big-tech style Admin OS intake routing for user submissions

-- 1) Trace payout routing into Admin OS.
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS routing_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS routed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_assignment_id uuid REFERENCES public.platform_assignments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payout_requests_routing_status_idx ON public.payout_requests(routing_status, created_at DESC);
CREATE INDEX IF NOT EXISTS payout_requests_assignment_idx ON public.payout_requests(admin_assignment_id);

-- 2) Department-assigned work must be readable by the assigned department.
DROP POLICY IF EXISTS "assignments readable" ON public.platform_assignments;
CREATE POLICY "assignments readable" ON public.platform_assignments FOR SELECT TO authenticated
  USING (
    assignee_user_id = auth.uid()
    OR assigned_by = auth.uid()
    OR public.has_admin_permission(auth.uid(), 'assignments.view')
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
    OR (department IS NOT NULL AND public.is_admin_department_member(auth.uid(), department))
  );

DROP POLICY IF EXISTS "assignments update" ON public.platform_assignments;
CREATE POLICY "assignments update" ON public.platform_assignments FOR UPDATE TO authenticated
  USING (
    assignee_user_id = auth.uid()
    OR public.has_admin_permission(auth.uid(), 'assignments.manage')
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
    OR (department IS NOT NULL AND public.is_admin_department_member(auth.uid(), department))
  )
  WITH CHECK (
    assignee_user_id = auth.uid()
    OR public.has_admin_permission(auth.uid(), 'assignments.manage')
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
    OR (department IS NOT NULL AND public.is_admin_department_member(auth.uid(), department))
  );

DROP POLICY IF EXISTS "payout_requests_finance_select" ON public.payout_requests;
CREATE POLICY "payout_requests_finance_select" ON public.payout_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_admin_permission(auth.uid(), 'finance.payouts.view')
    OR public.has_admin_permission(auth.uid(), 'finance.payouts.approve')
    OR public.is_admin_department_member(auth.uid(), 'finance')
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );

DROP POLICY IF EXISTS "payout_requests_finance_update" ON public.payout_requests;
CREATE POLICY "payout_requests_finance_update" ON public.payout_requests FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_admin_permission(auth.uid(), 'finance.payouts.approve')
    OR public.is_admin_department_member(auth.uid(), 'finance')
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_admin_permission(auth.uid(), 'finance.payouts.approve')
    OR public.is_admin_department_member(auth.uid(), 'finance')
    OR public.is_admin_department_member(auth.uid(), 'founder_office')
  );

-- 3) Shared helpers.
CREATE OR REPLACE FUNCTION public.admin_os_existing_user(_uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT CASE WHEN EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _uid) THEN _uid ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.admin_os_assignment_exists(_entity_type text, _entity_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_assignments pa
    WHERE pa.entity_type = _entity_type
      AND pa.entity_id = _entity_id
      AND pa.status <> 'cancelled'
  );
$$;

CREATE OR REPLACE FUNCTION public.route_verification_request_to_admin_os(_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.verification_requests%ROWTYPE;
  app_id uuid;
  assignment_id uuid;
  ver_kind public.ver_type;
  actor_id uuid;
BEGIN
  SELECT * INTO r FROM public.verification_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF r.ver_application_id IS NOT NULL THEN RETURN r.ver_application_id; END IF;

  actor_id := public.admin_os_existing_user(r.user_id);

  ver_kind := CASE r.category
    WHEN 'public_figure' THEN 'public_figure'::public.ver_type
    WHEN 'government' THEN 'government'::public.ver_type
    WHEN 'business' THEN 'business'::public.ver_type
    WHEN 'founder' THEN 'creator'::public.ver_type
    WHEN 'media' THEN 'individual'::public.ver_type
    ELSE 'individual'::public.ver_type
  END;

  INSERT INTO public.ver_applications (
    application_number, ver_type, subject_user_id, subject_display_name, status, priority,
    submitted_by, submission_notes, metadata, submitted_at
  ) VALUES (
    'VR-' || to_char(COALESCE(r.created_at, now()), 'YYYY') || '-' || upper(substr(replace(r.id::text, '-', ''), 1, 10)),
    ver_kind,
    actor_id,
    r.full_name,
    'pending',
    CASE WHEN r.category IN ('government','business') THEN 'high' ELSE 'normal' END,
    actor_id,
    r.reason,
    jsonb_build_object(
      'source','verification_requests','source_id',r.id,'department','verification','submitted_user_id',r.user_id,
      'organization',r.organization,'official_email',r.official_email,'country',r.country,'dob',r.dob,
      'links',COALESCE(r.links, ARRAY[]::text[])
    ),
    COALESCE(r.created_at, now())
  ) RETURNING id INTO app_id;

  IF r.id_doc_url IS NOT NULL THEN
    INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
    VALUES (app_id, 'id_document', r.id_doc_url, actor_id);
  END IF;
  IF r.supporting_doc_url IS NOT NULL THEN
    INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
    VALUES (app_id, 'supporting_document', r.supporting_doc_url, actor_id);
  END IF;

  INSERT INTO public.ver_history (application_id, event_type, actor_id, details)
  VALUES (app_id, 'routed_to_verification', actor_id, jsonb_build_object('source','verification_requests','source_id',r.id));

  INSERT INTO public.platform_assignments (module, entity_type, entity_id, assignee_user_id, assigned_by, department, method, priority, metadata)
  VALUES (
    'verification', 'ver_application', app_id::text, NULL, NULL, 'verification', 'rule',
    CASE WHEN r.category IN ('government','business') THEN 'high' ELSE 'normal' END,
    jsonb_build_object('source','verification_requests','source_id',r.id,'submitted_user_id',r.user_id,'sla_hours',48)
  ) RETURNING id INTO assignment_id;

  INSERT INTO public.platform_activity_events (actor_user_id, verb, object_type, object_id, department, visibility, summary, metadata)
  VALUES (
    actor_id, 'routed', 'ver_application', app_id::text, 'verification', 'department',
    'Verification request routed to Verification Department',
    jsonb_build_object('source','verification_requests','source_id',r.id,'assignment_id',assignment_id,'submitted_user_id',r.user_id)
  );

  UPDATE public.verification_requests SET ver_application_id = app_id WHERE id = r.id;
  RETURN app_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.route_kyc_submission_to_admin_os(_kyc_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.kyc_submissions%ROWTYPE;
  app_id uuid;
  assignment_id uuid;
  actor_id uuid;
BEGIN
  SELECT * INTO r FROM public.kyc_submissions WHERE id = _kyc_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF r.ver_application_id IS NOT NULL THEN RETURN r.ver_application_id; END IF;

  actor_id := public.admin_os_existing_user(r.user_id);

  INSERT INTO public.ver_applications (
    application_number, ver_type, subject_user_id, subject_display_name, status, priority,
    submitted_by, submission_notes, metadata, submitted_at
  ) VALUES (
    'KYC-' || to_char(COALESCE(r.created_at, now()), 'YYYY') || '-' || upper(substr(replace(r.id::text, '-', ''), 1, 10)),
    'individual',
    actor_id,
    r.full_name,
    'pending',
    'high',
    actor_id,
    'Creator payout KYC verification',
    jsonb_build_object(
      'source','kyc_submissions','source_id',r.id,'department','verification','submitted_user_id',r.user_id,
      'finance_signal','payout_readiness','pan_number',r.pan_number,'bank_name',r.bank_name,
      'bank_ifsc',r.bank_ifsc,'bank_account_last4',right(COALESCE(r.bank_account_number,''),4)
    ),
    COALESCE(r.created_at, now())
  ) RETURNING id INTO app_id;

  INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
  VALUES
    (app_id, 'kyc_id_photo', r.id_photo_url, actor_id),
    (app_id, 'kyc_passbook_photo', r.passbook_photo_url, actor_id);

  INSERT INTO public.ver_history (application_id, event_type, actor_id, details)
  VALUES (app_id, 'routed_to_verification', actor_id, jsonb_build_object('source','kyc_submissions','source_id',r.id,'kind','creator_kyc'));

  INSERT INTO public.platform_assignments (module, entity_type, entity_id, assignee_user_id, assigned_by, department, method, priority, metadata)
  VALUES (
    'verification', 'ver_application', app_id::text, NULL, NULL, 'verification', 'rule', 'high',
    jsonb_build_object('source','kyc_submissions','source_id',r.id,'submitted_user_id',r.user_id,'sla_hours',24,'finance_signal','payout_readiness')
  ) RETURNING id INTO assignment_id;

  INSERT INTO public.platform_activity_events (actor_user_id, verb, object_type, object_id, department, visibility, summary, metadata)
  VALUES (
    actor_id, 'routed', 'ver_application', app_id::text, 'verification', 'department',
    'Creator KYC routed to Verification Department',
    jsonb_build_object('source','kyc_submissions','source_id',r.id,'assignment_id',assignment_id,'submitted_user_id',r.user_id)
  );

  UPDATE public.kyc_submissions SET ver_application_id = app_id WHERE id = r.id;
  RETURN app_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.route_report_to_admin_os(_report_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.reports%ROWTYPE;
  case_id uuid;
  assignment_id uuid;
  subject_id uuid;
  reporter_actor uuid;
  subject_actor uuid;
  sev text;
  prio text;
BEGIN
  SELECT * INTO r FROM public.reports WHERE id = _report_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF r.ts_case_id IS NOT NULL THEN RETURN r.ts_case_id; END IF;

  reporter_actor := public.admin_os_existing_user(r.reporter_id);

  IF r.target_kind = 'profile' THEN
    subject_id := r.target_id;
  ELSIF r.target_kind = 'post' THEN
    SELECT p.user_id INTO subject_id FROM public.posts p WHERE p.id = r.target_id;
  ELSIF r.target_kind = 'comment' THEN
    SELECT c.user_id INTO subject_id FROM public.comments c WHERE c.id = r.target_id;
  ELSIF r.target_kind = 'message' THEN
    SELECT m.sender_id INTO subject_id FROM public.messages m WHERE m.id = r.target_id;
  END IF;
  subject_actor := public.admin_os_existing_user(subject_id);

  sev := CASE WHEN r.reason IN ('violence','hate','nudity','child_safety') THEN 'high' ELSE 'medium' END;
  prio := CASE WHEN r.reason IN ('violence','hate','nudity','child_safety') THEN 'high' ELSE 'normal' END;

  INSERT INTO public.ts_cases (
    category, severity, status, source, reporter_id, subject_user_id,
    subject_content_type, subject_content_id, title, description, priority, created_by, created_at
  ) VALUES (
    r.reason, sev, 'new', 'user_report', reporter_actor, subject_actor,
    CASE WHEN r.target_kind = 'profile' THEN NULL ELSE r.target_kind END,
    CASE WHEN r.target_kind = 'profile' THEN NULL ELSE r.target_id END,
    'Report: ' || r.reason || ' on ' || r.target_kind,
    r.details,
    prio,
    reporter_actor,
    COALESCE(r.created_at, now())
  ) RETURNING id INTO case_id;

  INSERT INTO public.ts_case_timeline (case_id, event_type, actor_id, description, metadata)
  VALUES (case_id, 'case_opened', reporter_actor, 'Reported by user and routed to Trust & Safety', jsonb_build_object('source','reports','source_id',r.id,'reporter_id',r.reporter_id));

  INSERT INTO public.platform_assignments (module, entity_type, entity_id, assignee_user_id, assigned_by, department, method, priority, metadata)
  VALUES (
    'trust_safety', 'ts_case', case_id::text, NULL, NULL, 'trust_safety', 'rule', prio,
    jsonb_build_object('source','reports','source_id',r.id,'target_kind',r.target_kind,'reporter_id',r.reporter_id,'sla_hours',CASE WHEN prio = 'high' THEN 4 ELSE 24 END)
  ) RETURNING id INTO assignment_id;

  INSERT INTO public.platform_activity_events (actor_user_id, verb, object_type, object_id, department, visibility, summary, metadata)
  VALUES (
    reporter_actor, 'routed', 'ts_case', case_id::text, 'trust_safety', 'department',
    'User report routed to Trust & Safety',
    jsonb_build_object('source','reports','source_id',r.id,'assignment_id',assignment_id,'severity',sev,'reporter_id',r.reporter_id)
  );

  UPDATE public.reports SET ts_case_id = case_id, status = 'reviewing' WHERE id = r.id;
  RETURN case_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.route_payout_request_to_admin_os(_payout_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.payout_requests%ROWTYPE;
  assignment_id uuid;
  approved_kyc boolean;
  actor_id uuid;
BEGIN
  SELECT * INTO r FROM public.payout_requests WHERE id = _payout_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF r.admin_assignment_id IS NOT NULL THEN RETURN r.admin_assignment_id; END IF;

  actor_id := public.admin_os_existing_user(r.user_id);
  approved_kyc := public.has_approved_kyc(r.user_id);

  INSERT INTO public.platform_assignments (module, entity_type, entity_id, assignee_user_id, assigned_by, department, method, priority, metadata)
  VALUES (
    'finance', 'payout_request', r.id::text, NULL, NULL, 'finance', 'rule',
    CASE WHEN r.amount_cents >= 500000 THEN 'high' ELSE 'normal' END,
    jsonb_build_object(
      'source','payout_requests','source_id',r.id,'submitted_user_id',r.user_id,
      'amount_cents',r.amount_cents,'currency',r.currency,'method',r.method,
      'environment',r.environment,'kyc_approved',approved_kyc,'sla_hours',24
    )
  ) RETURNING id INTO assignment_id;

  INSERT INTO public.platform_activity_events (actor_user_id, verb, object_type, object_id, department, visibility, summary, metadata)
  VALUES (
    actor_id, 'routed', 'payout_request', r.id::text, 'finance', 'department',
    'Creator payout request routed to Finance',
    jsonb_build_object('source','payout_requests','source_id',r.id,'assignment_id',assignment_id,'submitted_user_id',r.user_id,'amount_cents',r.amount_cents)
  );

  UPDATE public.payout_requests
    SET admin_assignment_id = assignment_id, routed_at = now(), routing_status = 'routed'
    WHERE id = r.id;

  RETURN assignment_id;
END;
$$;

-- 4) Trigger wrappers.
CREATE OR REPLACE FUNCTION public.trg_route_verification_request_to_admin_os()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.route_verification_request_to_admin_os(NEW.id); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.trg_route_kyc_submission_to_admin_os()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.route_kyc_submission_to_admin_os(NEW.id); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.trg_route_report_to_admin_os()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.route_report_to_admin_os(NEW.id); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.trg_route_payout_request_to_admin_os()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.route_payout_request_to_admin_os(NEW.id); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_route_verification_request_to_admin_os ON public.verification_requests;
CREATE TRIGGER trg_route_verification_request_to_admin_os AFTER INSERT ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_route_verification_request_to_admin_os();

DROP TRIGGER IF EXISTS trg_route_kyc_submission_to_admin_os ON public.kyc_submissions;
CREATE TRIGGER trg_route_kyc_submission_to_admin_os AFTER INSERT ON public.kyc_submissions
FOR EACH ROW EXECUTE FUNCTION public.trg_route_kyc_submission_to_admin_os();

DROP TRIGGER IF EXISTS trg_route_report_to_admin_os ON public.reports;
CREATE TRIGGER trg_route_report_to_admin_os AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.trg_route_report_to_admin_os();

DROP TRIGGER IF EXISTS trg_route_payout_request_to_admin_os ON public.payout_requests;
CREATE TRIGGER trg_route_payout_request_to_admin_os AFTER INSERT ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_route_payout_request_to_admin_os();

-- 5) Keep original user-facing rows synced with department decisions.
CREATE OR REPLACE FUNCTION public.sync_ver_application_source_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_table text;
  source_id uuid;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  source_table := NEW.metadata->>'source';
  source_id := NULLIF(NEW.metadata->>'source_id','')::uuid;

  IF source_table = 'kyc_submissions' AND source_id IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.kyc_submissions SET status = 'approved', reviewed_at = COALESCE(NEW.decided_at, now()), reviewed_by = public.admin_os_existing_user(NEW.assigned_to), review_note = NULL WHERE id = source_id;
    ELSIF NEW.status = 'rejected' THEN
      UPDATE public.kyc_submissions SET status = 'rejected', reviewed_at = COALESCE(NEW.decided_at, now()), reviewed_by = public.admin_os_existing_user(NEW.assigned_to), review_note = COALESCE(NEW.submission_notes, 'Rejected by Verification Department') WHERE id = source_id;
    END IF;
  ELSIF source_table = 'verification_requests' AND source_id IS NOT NULL THEN
    UPDATE public.verification_requests
      SET status = NEW.status::text,
          reviewed_at = CASE WHEN NEW.status IN ('approved','rejected','revoked','suspended') THEN COALESCE(NEW.decided_at, now()) ELSE reviewed_at END,
          approved = CASE WHEN NEW.status = 'approved' THEN true WHEN NEW.status IN ('rejected','revoked','suspended') THEN false ELSE approved END
      WHERE id = source_id;
  END IF;

  IF NEW.status IN ('approved','rejected','revoked','suspended','expired') THEN
    UPDATE public.platform_assignments SET status = 'completed', completed_at = COALESCE(NEW.decided_at, now()), updated_at = now()
    WHERE entity_type = 'ver_application' AND entity_id = NEW.id::text AND status <> 'completed';
  END IF;

  INSERT INTO public.platform_activity_events (actor_user_id, verb, object_type, object_id, department, visibility, summary, metadata)
  VALUES (public.admin_os_existing_user(COALESCE(NEW.assigned_to, NEW.submitted_by, NEW.subject_user_id)), 'status_changed', 'ver_application', NEW.id::text, 'verification', 'department', 'Verification application status changed to ' || NEW.status::text, jsonb_build_object('source',source_table,'source_id',source_id,'status',NEW.status::text));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ver_application_source_status ON public.ver_applications;
CREATE TRIGGER trg_sync_ver_application_source_status AFTER UPDATE OF status ON public.ver_applications
FOR EACH ROW EXECUTE FUNCTION public.sync_ver_application_source_status();

CREATE OR REPLACE FUNCTION public.sync_ts_case_source_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE source_id uuid;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  SELECT r.id INTO source_id FROM public.reports r WHERE r.ts_case_id = NEW.id LIMIT 1;
  IF source_id IS NOT NULL THEN
    UPDATE public.reports SET status = CASE WHEN NEW.status IN ('resolved','closed') THEN 'resolved' ELSE 'reviewing' END WHERE id = source_id;
  END IF;

  IF NEW.status IN ('resolved','closed') THEN
    UPDATE public.platform_assignments SET status = 'completed', completed_at = COALESCE(NEW.resolved_at, now()), updated_at = now()
    WHERE entity_type = 'ts_case' AND entity_id = NEW.id::text AND status <> 'completed';
  END IF;

  INSERT INTO public.platform_activity_events (actor_user_id, verb, object_type, object_id, department, visibility, summary, metadata)
  VALUES (public.admin_os_existing_user(COALESCE(NEW.assigned_to, NEW.created_by, NEW.reporter_id)), 'status_changed', 'ts_case', NEW.id::text, 'trust_safety', 'department', 'Trust & Safety case status changed to ' || NEW.status, jsonb_build_object('source','reports','source_id',source_id,'status',NEW.status));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ts_case_source_status ON public.ts_cases;
CREATE TRIGGER trg_sync_ts_case_source_status AFTER UPDATE OF status ON public.ts_cases
FOR EACH ROW EXECUTE FUNCTION public.sync_ts_case_source_status();

-- 6) Department-friendly approval functions for Finance and Verification.
CREATE OR REPLACE FUNCTION public.admin_approve_payout(_payout_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.payout_requests%ROWTYPE;
BEGIN
  IF NOT (public.has_role(_uid,'admin') OR public.has_admin_permission(_uid, 'finance.payouts.approve') OR public.is_admin_department_member(_uid, 'finance') OR public.is_admin_department_member(_uid, 'founder_office')) THEN
    RAISE EXCEPTION 'finance approval access required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO _row FROM public.payout_requests WHERE id=_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payout not found'; END IF;
  IF _row.status <> 'pending' THEN RAISE EXCEPTION 'payout already processed'; END IF;
  UPDATE public.creator_balance SET pending_cents = GREATEST(pending_cents - _row.amount_cents, 0), updated_at = now() WHERE user_id=_row.user_id AND environment=_row.environment;
  UPDATE public.payout_requests SET status='paid', admin_note=_note, processed_at=now(), routing_status='completed' WHERE id=_payout_id;
  UPDATE public.platform_assignments SET status='completed', completed_at=now(), updated_at=now() WHERE entity_type='payout_request' AND entity_id=_payout_id::text AND status <> 'completed';
  INSERT INTO public.notifications (user_id, actor_id, type) VALUES (_row.user_id, public.admin_os_existing_user(_uid), 'payout_approved');
  INSERT INTO public.platform_activity_events (actor_user_id, verb, object_type, object_id, department, visibility, summary, metadata)
  VALUES (public.admin_os_existing_user(_uid), 'approved', 'payout_request', _payout_id::text, 'finance', 'department', 'Creator payout approved by Finance', jsonb_build_object('amount_cents',_row.amount_cents,'note',_note));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_payout(_payout_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.payout_requests%ROWTYPE;
BEGIN
  IF NOT (public.has_role(_uid,'admin') OR public.has_admin_permission(_uid, 'finance.payouts.approve') OR public.is_admin_department_member(_uid, 'finance') OR public.is_admin_department_member(_uid, 'founder_office')) THEN
    RAISE EXCEPTION 'finance approval access required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO _row FROM public.payout_requests WHERE id=_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payout not found'; END IF;
  IF _row.status <> 'pending' THEN RAISE EXCEPTION 'payout already processed'; END IF;
  UPDATE public.creator_balance SET pending_cents = GREATEST(pending_cents - _row.amount_cents, 0), available_cents = available_cents + _row.amount_cents, updated_at = now() WHERE user_id=_row.user_id AND environment=_row.environment;
  UPDATE public.payout_requests SET status='rejected', admin_note=_reason, processed_at=now(), routing_status='completed' WHERE id=_payout_id;
  UPDATE public.platform_assignments SET status='completed', completed_at=now(), updated_at=now() WHERE entity_type='payout_request' AND entity_id=_payout_id::text AND status <> 'completed';
  INSERT INTO public.notifications (user_id, actor_id, type) VALUES (_row.user_id, public.admin_os_existing_user(_uid), 'payout_rejected');
  INSERT INTO public.platform_activity_events (actor_user_id, verb, object_type, object_id, department, visibility, summary, metadata)
  VALUES (public.admin_os_existing_user(_uid), 'rejected', 'payout_request', _payout_id::text, 'finance', 'department', 'Creator payout rejected by Finance', jsonb_build_object('amount_cents',_row.amount_cents,'reason',_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_kyc(_kyc_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.kyc_submissions%ROWTYPE;
BEGIN
  IF NOT (public.has_role(_uid,'admin') OR public.has_admin_permission(_uid, 'verification.requests.act') OR public.is_admin_department_member(_uid, 'verification') OR public.is_admin_department_member(_uid, 'founder_office')) THEN
    RAISE EXCEPTION 'verification access required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO _row FROM public.kyc_submissions WHERE id=_kyc_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'kyc not found'; END IF;
  UPDATE public.kyc_submissions SET status='approved', reviewed_at=now(), reviewed_by=public.admin_os_existing_user(_uid), review_note=NULL WHERE id=_kyc_id;
  IF _row.ver_application_id IS NOT NULL THEN UPDATE public.ver_applications SET status='approved', decided_at=now(), assigned_to=public.admin_os_existing_user(_uid) WHERE id=_row.ver_application_id; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type) VALUES (_row.user_id, public.admin_os_existing_user(_uid), 'kyc_approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_kyc(_kyc_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.kyc_submissions%ROWTYPE;
BEGIN
  IF NOT (public.has_role(_uid,'admin') OR public.has_admin_permission(_uid, 'verification.requests.act') OR public.is_admin_department_member(_uid, 'verification') OR public.is_admin_department_member(_uid, 'founder_office')) THEN
    RAISE EXCEPTION 'verification access required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO _row FROM public.kyc_submissions WHERE id=_kyc_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'kyc not found'; END IF;
  UPDATE public.kyc_submissions SET status='rejected', reviewed_at=now(), reviewed_by=public.admin_os_existing_user(_uid), review_note=_reason WHERE id=_kyc_id;
  IF _row.ver_application_id IS NOT NULL THEN UPDATE public.ver_applications SET status='rejected', decided_at=now(), assigned_to=public.admin_os_existing_user(_uid), submission_notes=_reason WHERE id=_row.ver_application_id; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type) VALUES (_row.user_id, public.admin_os_existing_user(_uid), 'kyc_rejected');
END;
$$;

-- 7) Backfill un-routed existing records.
DO $$
DECLARE rec record;
BEGIN
  FOR rec IN SELECT id FROM public.verification_requests WHERE ver_application_id IS NULL LOOP
    PERFORM public.route_verification_request_to_admin_os(rec.id);
  END LOOP;
  FOR rec IN SELECT id FROM public.kyc_submissions WHERE ver_application_id IS NULL LOOP
    PERFORM public.route_kyc_submission_to_admin_os(rec.id);
  END LOOP;
  FOR rec IN SELECT id FROM public.reports WHERE ts_case_id IS NULL LOOP
    PERFORM public.route_report_to_admin_os(rec.id);
  END LOOP;
  FOR rec IN SELECT id FROM public.payout_requests WHERE admin_assignment_id IS NULL LOOP
    PERFORM public.route_payout_request_to_admin_os(rec.id);
  END LOOP;
END $$;