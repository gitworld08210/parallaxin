
ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS ver_application_id uuid REFERENCES public.ver_applications(id) ON DELETE SET NULL;
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS ts_case_id uuid REFERENCES public.ts_cases(id) ON DELETE SET NULL;
ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS ver_application_id uuid REFERENCES public.ver_applications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS verification_requests_ver_app_idx ON public.verification_requests(ver_application_id);
CREATE INDEX IF NOT EXISTS reports_ts_case_idx ON public.reports(ts_case_id);
CREATE INDEX IF NOT EXISTS kyc_submissions_ver_app_idx ON public.kyc_submissions(ver_application_id);

DO $$
DECLARE r record; new_app_id uuid;
BEGIN
  FOR r IN
    SELECT vr.* FROM public.verification_requests vr
    JOIN auth.users u ON u.id = vr.user_id
    WHERE vr.ver_application_id IS NULL
  LOOP
    INSERT INTO public.ver_applications (
      application_number, ver_type, subject_user_id, subject_display_name,
      status, submitted_by, submission_notes, metadata, submitted_at, created_at
    ) VALUES (
      'VR-' || to_char(r.created_at, 'YYYY') || '-' || substr(replace(r.id::text,'-',''), 1, 10),
      CASE r.category
        WHEN 'public_figure' THEN 'public_figure'::ver_type
        WHEN 'government' THEN 'government'::ver_type
        WHEN 'business' THEN 'business'::ver_type
        WHEN 'founder' THEN 'creator'::ver_type
        WHEN 'media' THEN 'individual'::ver_type
        ELSE 'individual'::ver_type
      END,
      r.user_id, r.full_name,
      CASE WHEN r.approved THEN 'approved'::ver_status
           WHEN r.status = 'rejected' THEN 'rejected'::ver_status
           ELSE 'pending'::ver_status END,
      r.user_id, r.reason,
      jsonb_build_object('source','verification_requests','source_id',r.id,'organization',r.organization,'official_email',r.official_email,'country',r.country,'dob',r.dob,'links',r.links),
      r.created_at, r.created_at
    ) RETURNING id INTO new_app_id;

    IF r.id_doc_url IS NOT NULL THEN
      INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
      VALUES (new_app_id, 'id_document', r.id_doc_url, r.user_id);
    END IF;
    IF r.supporting_doc_url IS NOT NULL THEN
      INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
      VALUES (new_app_id, 'supporting_document', r.supporting_doc_url, r.user_id);
    END IF;

    INSERT INTO public.ver_history (application_id, event_type, actor_id, details)
    VALUES (new_app_id, 'submitted', r.user_id, jsonb_build_object('backfilled',true));

    UPDATE public.verification_requests SET ver_application_id = new_app_id WHERE id = r.id;
  END LOOP;
END $$;

DO $$
DECLARE r record; new_case_id uuid; subject_uid uuid;
BEGIN
  FOR r IN
    SELECT rp.* FROM public.reports rp
    JOIN auth.users u ON u.id = rp.reporter_id
    WHERE rp.ts_case_id IS NULL
  LOOP
    subject_uid := NULL;
    IF r.target_kind = 'profile' THEN subject_uid := r.target_id;
    ELSIF r.target_kind = 'post' THEN SELECT user_id INTO subject_uid FROM public.posts WHERE id = r.target_id;
    ELSIF r.target_kind = 'comment' THEN SELECT user_id INTO subject_uid FROM public.comments WHERE id = r.target_id;
    ELSIF r.target_kind = 'message' THEN SELECT sender_id INTO subject_uid FROM public.messages WHERE id = r.target_id;
    END IF;

    IF subject_uid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = subject_uid) THEN
      subject_uid := NULL;
    END IF;

    INSERT INTO public.ts_cases (
      category, severity, status, source, reporter_id,
      subject_user_id, subject_content_type, subject_content_id,
      title, description, priority, created_by, created_at, updated_at
    ) VALUES (
      r.reason,
      CASE r.reason WHEN 'violence' THEN 'high' WHEN 'hate' THEN 'high' WHEN 'nudity' THEN 'high' ELSE 'medium' END,
      'new', 'user_report', r.reporter_id,
      subject_uid,
      CASE WHEN r.target_kind = 'profile' THEN NULL ELSE r.target_kind END,
      CASE WHEN r.target_kind = 'profile' THEN NULL ELSE r.target_id END,
      'Report: ' || r.reason || ' on ' || r.target_kind,
      r.details,
      CASE r.reason WHEN 'violence' THEN 'high' WHEN 'hate' THEN 'high' ELSE 'normal' END,
      r.reporter_id, r.created_at, r.created_at
    ) RETURNING id INTO new_case_id;

    INSERT INTO public.ts_case_timeline (case_id, event_type, actor_id, description, metadata)
    VALUES (new_case_id, 'case_opened', r.reporter_id, 'Reported by user', jsonb_build_object('backfilled',true,'source_id',r.id));

    UPDATE public.reports SET ts_case_id = new_case_id WHERE id = r.id;
  END LOOP;
END $$;

DO $$
DECLARE r record; new_app_id uuid;
BEGIN
  FOR r IN
    SELECT k.* FROM public.kyc_submissions k
    JOIN auth.users u ON u.id = k.user_id
    WHERE k.ver_application_id IS NULL
  LOOP
    INSERT INTO public.ver_applications (
      application_number, ver_type, subject_user_id, subject_display_name,
      status, submitted_by, submission_notes, metadata, submitted_at, created_at
    ) VALUES (
      'KYC-' || to_char(r.created_at, 'YYYY') || '-' || substr(replace(r.id::text,'-',''), 1, 10),
      'individual'::ver_type,
      r.user_id, r.full_name,
      CASE r.status WHEN 'approved' THEN 'approved'::ver_status WHEN 'rejected' THEN 'rejected'::ver_status ELSE 'pending'::ver_status END,
      r.user_id, NULL,
      jsonb_build_object('source','kyc_submissions','source_id',r.id,'pan_number',r.pan_number,'bank_name',r.bank_name,'bank_ifsc',r.bank_ifsc,'bank_account_last4', right(r.bank_account_number,4)),
      r.created_at, r.created_at
    ) RETURNING id INTO new_app_id;

    INSERT INTO public.ver_documents (application_id, doc_type, file_url, uploaded_by)
    VALUES (new_app_id, 'kyc_id_photo', r.id_photo_url, r.user_id),
           (new_app_id, 'kyc_passbook_photo', r.passbook_photo_url, r.user_id);

    INSERT INTO public.ver_history (application_id, event_type, actor_id, details)
    VALUES (new_app_id, 'submitted', r.user_id, jsonb_build_object('backfilled',true,'kind','kyc'));

    UPDATE public.kyc_submissions SET ver_application_id = new_app_id WHERE id = r.id;
  END LOOP;
END $$;
