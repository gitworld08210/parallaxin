
-- ADMIN OS SELECT policies
DROP POLICY IF EXISTS "auth read ai recs" ON public.executive_ai_recommendations;
CREATE POLICY "employees read ai recs" ON public.executive_ai_recommendations FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "auth read ai predictions" ON public.executive_ai_predictions;
CREATE POLICY "employees read ai predictions" ON public.executive_ai_predictions FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "auth read knowledge cache" ON public.executive_ai_knowledge_cache;
CREATE POLICY "employees read knowledge cache" ON public.executive_ai_knowledge_cache FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "auth read automations" ON public.executive_automations;
CREATE POLICY "employees read automations" ON public.executive_automations FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "auth read schedules" ON public.executive_automation_schedules;
CREATE POLICY "employees read schedules" ON public.executive_automation_schedules FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "auth read templates" ON public.executive_automation_templates;
CREATE POLICY "employees read automation templates" ON public.executive_automation_templates FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "exec_kpi_read_all" ON public.executive_kpi_configs;
CREATE POLICY "exec_kpi_read_employees" ON public.executive_kpi_configs FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "exec_snapshot_read_all" ON public.executive_analytics_snapshots;
CREATE POLICY "exec_snapshot_read_employees" ON public.executive_analytics_snapshots FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "exec_emerg_read_all" ON public.executive_emergency_events;
CREATE POLICY "exec_emerg_read_employees" ON public.executive_emergency_events FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "exec_maint_read_all" ON public.executive_maintenance_windows;
CREATE POLICY "exec_maint_read_employees" ON public.executive_maintenance_windows FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "exec_sys_read_all" ON public.executive_system_status;
CREATE POLICY "exec_sys_read_employees" ON public.executive_system_status FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));

DROP POLICY IF EXISTS "cfg_read_all" ON public.company_configurations;
CREATE POLICY "cfg_read_employees" ON public.company_configurations FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "meta_read_all" ON public.company_metadata;
CREATE POLICY "meta_read_employees" ON public.company_metadata FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "mod_read_all" ON public.company_modules;
CREATE POLICY "mod_read_employees" ON public.company_modules FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "flag_read_all" ON public.company_feature_flags;
CREATE POLICY "flag_read_employees" ON public.company_feature_flags FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "cal_read_all" ON public.company_calendar_events;
CREATE POLICY "cal_read_employees" ON public.company_calendar_events FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "loc_read_all" ON public.company_localization;
CREATE POLICY "loc_read_employees" ON public.company_localization FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "brand_read_all" ON public.company_brand_assets;
CREATE POLICY "brand_read_employees" ON public.company_brand_assets FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));

DROP POLICY IF EXISTS "templates readable by employees" ON public.platform_notification_templates;
CREATE POLICY "templates readable by employees" ON public.platform_notification_templates FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));
DROP POLICY IF EXISTS "Employees read policies" ON public.ts_policy_references;
CREATE POLICY "Employees read policies" ON public.ts_policy_references FOR SELECT TO authenticated USING (public.is_active_employee(auth.uid()));

DROP POLICY IF EXISTS "Authenticated view active policies" ON public.sec_policies;
CREATE POLICY "Employees view active policies" ON public.sec_policies FOR SELECT TO authenticated
  USING (public.is_security_staff(auth.uid()) OR (status = 'active' AND public.is_active_employee(auth.uid())));

-- Engineering tables
DROP POLICY IF EXISTS "eng_products view" ON public.eng_products;
CREATE POLICY "eng_products view" ON public.eng_products FOR SELECT TO authenticated USING (public.is_engineering_staff(auth.uid()));
DROP POLICY IF EXISTS "eng_deployments view" ON public.eng_deployments;
CREATE POLICY "eng_deployments view" ON public.eng_deployments FOR SELECT TO authenticated USING (public.is_engineering_staff(auth.uid()));
DROP POLICY IF EXISTS "eng_documents view" ON public.eng_documents;
CREATE POLICY "eng_documents view" ON public.eng_documents FOR SELECT TO authenticated USING (public.is_engineering_staff(auth.uid()));
DROP POLICY IF EXISTS "eng_epics view" ON public.eng_epics;
CREATE POLICY "eng_epics view" ON public.eng_epics FOR SELECT TO authenticated USING (public.is_engineering_staff(auth.uid()));
DROP POLICY IF EXISTS "eng_features view" ON public.eng_features;
CREATE POLICY "eng_features view" ON public.eng_features FOR SELECT TO authenticated USING (public.is_engineering_staff(auth.uid()));
DROP POLICY IF EXISTS "eng_sprints view" ON public.eng_sprints;
CREATE POLICY "eng_sprints view" ON public.eng_sprints FOR SELECT TO authenticated USING (public.is_engineering_staff(auth.uid()));
DROP POLICY IF EXISTS "eng_bugs view" ON public.eng_bugs;
CREATE POLICY "eng_bugs view" ON public.eng_bugs FOR SELECT TO authenticated USING (public.is_engineering_staff(auth.uid()));
DROP POLICY IF EXISTS "eng_releases view" ON public.eng_releases;
CREATE POLICY "eng_releases view" ON public.eng_releases FOR SELECT TO authenticated USING (public.is_engineering_staff(auth.uid()));
DROP POLICY IF EXISTS "eng_tasks view" ON public.eng_tasks;
CREATE POLICY "eng_tasks view" ON public.eng_tasks FOR SELECT TO authenticated USING (public.is_engineering_staff(auth.uid()));

-- Employees self-update guard
CREATE OR REPLACE FUNCTION public.guard_employee_self_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_hr_or_founder boolean;
BEGIN
  is_hr_or_founder := public.is_admin_department_member(auth.uid(), 'people_ops')
    OR public.is_admin_department_member(auth.uid(), 'founder_office');
  IF is_hr_or_founder THEN RETURN NEW; END IF;
  IF NEW.role_id IS DISTINCT FROM OLD.role_id
     OR NEW.department_id IS DISTINCT FROM OLD.department_id
     OR NEW.employment_status IS DISTINCT FROM OLD.employment_status
     OR NEW.user_type IS DISTINCT FROM OLD.user_type
     OR NEW.reporting_manager_id IS DISTINCT FROM OLD.reporting_manager_id
     OR NEW.employee_number IS DISTINCT FROM OLD.employee_number
     OR NEW.company_email IS DISTINCT FROM OLD.company_email
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.joining_date IS DISTINCT FROM OLD.joining_date
     OR NEW.full_name IS DISTINCT FROM OLD.full_name
  THEN
    RAISE EXCEPTION 'Employees can only update their own first-login flags. Privileged fields must be changed by HR or the Founder Office.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_employee_self_update ON public.employees;
CREATE TRIGGER trg_guard_employee_self_update BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.guard_employee_self_update();

-- Leave requests self-insert restricted
DROP POLICY IF EXISTS "lr_ins_self" ON public.leave_requests;
CREATE POLICY "lr_ins_self" ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    AND status IN ('draft'::leave_request_status, 'pending_lead'::leave_request_status)
  );

-- Performance reviews self-insert restricted
DROP POLICY IF EXISTS "prv_ins" ON public.performance_reviews;
CREATE POLICY "prv_ins" ON public.performance_reviews FOR INSERT TO authenticated
  WITH CHECK (
    has_admin_permission(auth.uid(), 'people_ops.performance.manage')
    OR has_admin_permission(auth.uid(), 'people_ops.performance.review')
    OR (
      employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND finalized = false AND overall_rating IS NULL AND finalized_by IS NULL
      AND current_stage = 'self'::perf_review_stage
    )
  );

-- Performance goals: employees can't mark completed
DROP POLICY IF EXISTS "goal_upd" ON public.performance_goals;
CREATE POLICY "goal_upd" ON public.performance_goals FOR UPDATE TO authenticated
  USING (
    has_admin_permission(auth.uid(), 'people_ops.performance.manage')
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
  WITH CHECK (
    has_admin_permission(auth.uid(), 'people_ops.performance.manage')
    OR (
      employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND status <> 'completed' AND COALESCE(progress, 0) < 100
    )
  );

-- Course enrollments: employees can't mark completed
DROP POLICY IF EXISTS "en_upd" ON public.course_enrollments;
CREATE POLICY "en_upd" ON public.course_enrollments FOR UPDATE TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR has_admin_permission(auth.uid(), 'people_ops.learning.enroll')
    OR has_admin_permission(auth.uid(), 'people_ops.learning.manage')
  )
  WITH CHECK (
    has_admin_permission(auth.uid(), 'people_ops.learning.enroll')
    OR has_admin_permission(auth.uid(), 'people_ops.learning.manage')
    OR (
      employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND status <> 'completed' AND COALESCE(progress, 0) < 100
    )
  );

-- Skill verifications self-insert restricted
DROP POLICY IF EXISTS "sv_ins" ON public.skill_verifications;
CREATE POLICY "sv_ins" ON public.skill_verifications FOR INSERT TO authenticated
  WITH CHECK (
    has_admin_permission(auth.uid(), 'people_ops.learning.verify_skill')
    OR has_admin_permission(auth.uid(), 'people_ops.learning.manage')
    OR (
      employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND status = 'pending'
      AND assessor_id IS NULL
      AND dept_head_id IS NULL
      AND decided_at IS NULL
    )
  );

-- KIP storage: scope writes to editable documents or personal folder
DROP POLICY IF EXISTS "kip_storage_upload" ON storage.objects;
CREATE POLICY "kip_storage_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kip-documents' AND auth.uid() IS NOT NULL
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.kip_documents d
        WHERE d.file_path = storage.objects.name
          AND public.kip_can_edit_collection(d.collection_id, auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "kip_storage_update" ON storage.objects;
CREATE POLICY "kip_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'kip-documents' AND EXISTS (
      SELECT 1 FROM public.kip_documents d
      WHERE d.file_path = storage.objects.name
        AND public.kip_can_edit_collection(d.collection_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "kip_storage_delete" ON storage.objects;
CREATE POLICY "kip_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'kip-documents' AND EXISTS (
      SELECT 1 FROM public.kip_documents d
      WHERE d.file_path = storage.objects.name
        AND public.kip_can_edit_collection(d.collection_id, auth.uid())
    )
  );
