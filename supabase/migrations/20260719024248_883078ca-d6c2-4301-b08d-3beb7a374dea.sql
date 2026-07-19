
-- =========================================================
-- Phase 1: DB-level intake → system-of-record routing
-- =========================================================

-- ---------- verification_requests → ver_applications ----------
CREATE OR REPLACE FUNCTION public.route_verification_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_id uuid;
  v_ver_type text;
BEGIN
  IF NEW.ver_application_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_ver_type := CASE NEW.category
    WHEN 'public_figure' THEN 'public_figure'
    WHEN 'government'   THEN 'government'
    WHEN 'business'     THEN 'business'
    WHEN 'founder'      THEN 'creator'
    WHEN 'media'        THEN 'individual'
    ELSE 'individual'
  END;

  INSERT INTO public.ver_applications (
    application_number, ver_type, subject_user_id, subject_display_name,
    status, submitted_by, submission_notes, metadata
  ) VALUES (
    'VR-' || to_char(NEW.created_at, 'YYYY') || '-' || replace(NEW.id::text, '-', '')::text,
    v_ver_type, NEW.user_id, NEW.full_name,
    'pending', NEW.user_id, NEW.reason,
    jsonb_build_object(
      'source', 'verification_requests',
      'source_id', NEW.id,
      'organization', NEW.organization,
      'official_email', NEW.official_email,
      'country', NEW.country,
      'dob', NEW.dob,
      'links', NEW.links
    )
  )
  RETURNING id INTO v_app_id;

  IF NEW.id_doc_url IS NOT NULL THEN
    INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
    VALUES (v_app_id, 'id_document', NEW.id_doc_url, NEW.user_id);
  END IF;
  IF NEW.supporting_doc_url IS NOT NULL THEN
    INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
    VALUES (v_app_id, 'supporting_document', NEW.supporting_doc_url, NEW.user_id);
  END IF;

  INSERT INTO public.ver_history (application_id, event_type, actor_id, details)
  VALUES (v_app_id, 'submitted', NEW.user_id,
    jsonb_build_object('source', 'verification_requests', 'source_id', NEW.id));

  NEW.ver_application_id := v_app_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_route_verification_request ON public.verification_requests;
CREATE TRIGGER trg_route_verification_request
BEFORE INSERT ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.route_verification_request();

-- ---------- kyc_submissions → ver_applications ----------
CREATE OR REPLACE FUNCTION public.route_kyc_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_id uuid;
BEGIN
  IF NEW.ver_application_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.ver_applications (
    application_number, ver_type, subject_user_id, subject_display_name,
    status, submitted_by, metadata
  ) VALUES (
    'KYC-' || to_char(NEW.created_at, 'YYYY') || '-' || replace(NEW.id::text, '-', '')::text,
    'individual', NEW.user_id, NEW.full_name,
    'pending', NEW.user_id,
    jsonb_build_object(
      'source', 'kyc_submissions',
      'source_id', NEW.id,
      'pan_number', NEW.pan_number,
      'bank_name', NEW.bank_name,
      'bank_ifsc', NEW.bank_ifsc,
      'bank_account_last4', right(coalesce(NEW.bank_account_number, ''), 4)
    )
  )
  RETURNING id INTO v_app_id;

  IF NEW.id_photo_url IS NOT NULL THEN
    INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
    VALUES (v_app_id, 'kyc_id_photo', NEW.id_photo_url, NEW.user_id);
  END IF;
  IF NEW.passbook_photo_url IS NOT NULL THEN
    INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
    VALUES (v_app_id, 'kyc_passbook_photo', NEW.passbook_photo_url, NEW.user_id);
  END IF;

  INSERT INTO public.ver_history (application_id, event_type, actor_id, details)
  VALUES (v_app_id, 'submitted', NEW.user_id,
    jsonb_build_object('source', 'kyc_submissions', 'source_id', NEW.id, 'kind', 'kyc'));

  NEW.ver_application_id := v_app_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_route_kyc_submission ON public.kyc_submissions;
CREATE TRIGGER trg_route_kyc_submission
BEFORE INSERT ON public.kyc_submissions
FOR EACH ROW EXECUTE FUNCTION public.route_kyc_submission();

-- ---------- reports → ts_cases ----------
CREATE OR REPLACE FUNCTION public.route_user_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_subject_user uuid;
  v_severity text;
  v_priority text;
  v_high_sev constant text[] := ARRAY['violence','hate','nudity'];
BEGIN
  IF NEW.ts_case_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.target_kind = 'profile' THEN
    v_subject_user := NEW.target_id;
  ELSIF NEW.target_kind = 'post' THEN
    SELECT user_id INTO v_subject_user FROM public.posts WHERE id = NEW.target_id;
  ELSIF NEW.target_kind = 'comment' THEN
    SELECT user_id INTO v_subject_user FROM public.comments WHERE id = NEW.target_id;
  ELSIF NEW.target_kind = 'message' THEN
    SELECT sender_id INTO v_subject_user FROM public.messages WHERE id = NEW.target_id;
  END IF;

  v_severity := CASE WHEN NEW.reason = ANY(v_high_sev) THEN 'high' ELSE 'medium' END;
  v_priority := CASE WHEN NEW.reason = ANY(v_high_sev) THEN 'high' ELSE 'normal' END;

  INSERT INTO public.ts_cases (
    category, severity, status, source, reporter_id,
    subject_user_id, subject_content_type, subject_content_id,
    title, description, priority, created_by
  ) VALUES (
    NEW.reason, v_severity, 'new', 'user_report', NEW.reporter_id,
    v_subject_user,
    CASE WHEN NEW.target_kind = 'profile' THEN NULL ELSE NEW.target_kind END,
    CASE WHEN NEW.target_kind = 'profile' THEN NULL ELSE NEW.target_id END,
    'Report: ' || NEW.reason || ' on ' || NEW.target_kind,
    NEW.details, v_priority, NEW.reporter_id
  )
  RETURNING id INTO v_case_id;

  INSERT INTO public.ts_case_timeline (case_id, event_type, actor_id, description, metadata)
  VALUES (v_case_id, 'case_opened', NEW.reporter_id, 'Reported by user',
    jsonb_build_object('source', 'reports', 'source_id', NEW.id));

  NEW.ts_case_id := v_case_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_route_user_report ON public.reports;
CREATE TRIGGER trg_route_user_report
BEFORE INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.route_user_report();

-- =========================================================
-- Backfill orphans that the old client-invoke silently dropped
-- =========================================================

-- Verification requests without a linked ver_application
DO $$
DECLARE r record; v_app_id uuid; v_ver_type text;
BEGIN
  FOR r IN SELECT * FROM public.verification_requests WHERE ver_application_id IS NULL LOOP
    v_ver_type := CASE r.category
      WHEN 'public_figure' THEN 'public_figure'
      WHEN 'government'   THEN 'government'
      WHEN 'business'     THEN 'business'
      WHEN 'founder'      THEN 'creator'
      WHEN 'media'        THEN 'individual'
      ELSE 'individual'
    END;
    INSERT INTO public.ver_applications (
      application_number, ver_type, subject_user_id, subject_display_name,
      status, submitted_by, submission_notes, metadata
    ) VALUES (
      'VR-' || to_char(r.created_at, 'YYYY') || '-' || replace(r.id::text,'-','')::text,
      v_ver_type, r.user_id, r.full_name, 'pending', r.user_id, r.reason,
      jsonb_build_object('source','verification_requests','source_id',r.id,'backfilled',true)
    ) RETURNING id INTO v_app_id;

    IF r.id_doc_url IS NOT NULL THEN
      INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
      VALUES (v_app_id, 'id_document', r.id_doc_url, r.user_id);
    END IF;
    IF r.supporting_doc_url IS NOT NULL THEN
      INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
      VALUES (v_app_id, 'supporting_document', r.supporting_doc_url, r.user_id);
    END IF;

    INSERT INTO public.ver_history (application_id, event_type, actor_id, details)
    VALUES (v_app_id, 'submitted', r.user_id,
      jsonb_build_object('source','verification_requests','source_id',r.id,'backfilled',true));

    UPDATE public.verification_requests SET ver_application_id = v_app_id WHERE id = r.id;
  END LOOP;
END $$;

-- KYC submissions without a linked ver_application
DO $$
DECLARE r record; v_app_id uuid;
BEGIN
  FOR r IN SELECT * FROM public.kyc_submissions WHERE ver_application_id IS NULL LOOP
    INSERT INTO public.ver_applications (
      application_number, ver_type, subject_user_id, subject_display_name,
      status, submitted_by, metadata
    ) VALUES (
      'KYC-' || to_char(r.created_at,'YYYY') || '-' || replace(r.id::text,'-','')::text,
      'individual', r.user_id, r.full_name, 'pending', r.user_id,
      jsonb_build_object('source','kyc_submissions','source_id',r.id,'backfilled',true,
        'pan_number',r.pan_number,'bank_name',r.bank_name,'bank_ifsc',r.bank_ifsc,
        'bank_account_last4', right(coalesce(r.bank_account_number,''), 4))
    ) RETURNING id INTO v_app_id;

    IF r.id_photo_url IS NOT NULL THEN
      INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
      VALUES (v_app_id, 'kyc_id_photo', r.id_photo_url, r.user_id);
    END IF;
    IF r.passbook_photo_url IS NOT NULL THEN
      INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
      VALUES (v_app_id, 'kyc_passbook_photo', r.passbook_photo_url, r.user_id);
    END IF;

    INSERT INTO public.ver_history (application_id, event_type, actor_id, details)
    VALUES (v_app_id, 'submitted', r.user_id,
      jsonb_build_object('source','kyc_submissions','source_id',r.id,'backfilled',true));

    UPDATE public.kyc_submissions SET ver_application_id = v_app_id WHERE id = r.id;
  END LOOP;
END $$;

-- Reports without a linked ts_case
DO $$
DECLARE r record; v_case_id uuid; v_subject uuid; v_sev text; v_pri text;
  v_high constant text[] := ARRAY['violence','hate','nudity'];
BEGIN
  FOR r IN SELECT * FROM public.reports WHERE ts_case_id IS NULL LOOP
    v_subject := NULL;
    IF r.target_kind = 'profile' THEN v_subject := r.target_id;
    ELSIF r.target_kind = 'post' THEN SELECT user_id INTO v_subject FROM public.posts WHERE id = r.target_id;
    ELSIF r.target_kind = 'comment' THEN SELECT user_id INTO v_subject FROM public.comments WHERE id = r.target_id;
    ELSIF r.target_kind = 'message' THEN SELECT sender_id INTO v_subject FROM public.messages WHERE id = r.target_id;
    END IF;
    v_sev := CASE WHEN r.reason = ANY(v_high) THEN 'high' ELSE 'medium' END;
    v_pri := CASE WHEN r.reason = ANY(v_high) THEN 'high' ELSE 'normal' END;

    INSERT INTO public.ts_cases (
      category, severity, status, source, reporter_id, subject_user_id,
      subject_content_type, subject_content_id, title, description, priority, created_by
    ) VALUES (
      r.reason, v_sev, 'new', 'user_report', r.reporter_id, v_subject,
      CASE WHEN r.target_kind='profile' THEN NULL ELSE r.target_kind END,
      CASE WHEN r.target_kind='profile' THEN NULL ELSE r.target_id END,
      'Report: ' || r.reason || ' on ' || r.target_kind,
      r.details, v_pri, r.reporter_id
    ) RETURNING id INTO v_case_id;

    INSERT INTO public.ts_case_timeline (case_id, event_type, actor_id, description, metadata)
    VALUES (v_case_id, 'case_opened', r.reporter_id, 'Reported by user',
      jsonb_build_object('source','reports','source_id',r.id,'backfilled',true));

    UPDATE public.reports SET ts_case_id = v_case_id WHERE id = r.id;
  END LOOP;
END $$;
