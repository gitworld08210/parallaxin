
-- =========================================================
-- Phase 2.9 — Attendance, Leave, Shifts, Holidays
-- =========================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM (
    'present','absent','late','half_day','wfh','business_travel',
    'training','holiday','weekend','leave'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shift_kind AS ENUM (
    'general','morning','evening','night','flexible','remote'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.holiday_kind AS ENUM ('national','company','department','regional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.leave_type AS ENUM (
    'annual','medical','emergency','maternity','paternity',
    'bereavement','compensatory','unpaid'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.leave_request_status AS ENUM (
    'draft','pending_lead','pending_dept_head','pending_hr','approved','rejected','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.correction_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_source AS ENUM ('self','manager','system','import','correction');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------
-- Shifts catalog
-- ---------------------------------------------------------
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind public.shift_kind NOT NULL DEFAULT 'general',
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  days_of_week INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shifts_view" ON public.shifts FOR SELECT TO authenticated
  USING (public.is_active_employee(auth.uid()));
CREATE POLICY "shifts_manage" ON public.shifts FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.shift.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.shift.manage'));
CREATE TRIGGER trg_shifts_updated BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.employee_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_es_emp ON public.employee_shifts(employee_id, effective_from DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_shifts TO authenticated;
GRANT ALL ON public.employee_shifts TO service_role;
ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "es_view" ON public.employee_shifts FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.attendance.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.shift.manage')
);
CREATE POLICY "es_manage" ON public.employee_shifts FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.shift.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.shift.manage'));

-- ---------------------------------------------------------
-- Holidays
-- ---------------------------------------------------------
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  kind public.holiday_kind NOT NULL DEFAULT 'company',
  department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_holidays_date ON public.holidays(holiday_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO authenticated;
GRANT ALL ON public.holidays TO service_role;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hol_view" ON public.holidays FOR SELECT TO authenticated
  USING (public.is_active_employee(auth.uid()));
CREATE POLICY "hol_manage" ON public.holidays FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.holiday.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.holiday.manage'));
CREATE TRIGGER trg_hol_updated BEFORE UPDATE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- Attendance records
-- ---------------------------------------------------------
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'present',
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  hours_worked NUMERIC(5,2),
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  source public.attendance_source NOT NULL DEFAULT 'self',
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, work_date)
);
CREATE INDEX idx_att_emp_date ON public.attendance_records(employee_id, work_date DESC);
CREATE INDEX idx_att_date ON public.attendance_records(work_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_view" ON public.attendance_records FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.attendance.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.attendance.manage')
);
CREATE POLICY "att_ins_self" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (
  (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
  OR public.has_admin_permission(auth.uid(),'people_ops.attendance.manage')
);
CREATE POLICY "att_upd_self" ON public.attendance_records FOR UPDATE TO authenticated USING (
  (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
  OR public.has_admin_permission(auth.uid(),'people_ops.attendance.manage')
) WITH CHECK (
  (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
  OR public.has_admin_permission(auth.uid(),'people_ops.attendance.manage')
);
CREATE TRIGGER trg_att_updated BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- Attendance corrections
-- ---------------------------------------------------------
CREATE TABLE public.attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  current_status public.attendance_status,
  requested_status public.attendance_status NOT NULL,
  requested_check_in TIMESTAMPTZ,
  requested_check_out TIMESTAMPTZ,
  reason TEXT NOT NULL,
  status public.correction_status NOT NULL DEFAULT 'pending',
  requested_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_corr_emp ON public.attendance_corrections(employee_id, work_date DESC);
GRANT SELECT, INSERT, UPDATE ON public.attendance_corrections TO authenticated;
GRANT ALL ON public.attendance_corrections TO service_role;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corr_view" ON public.attendance_corrections FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.attendance.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.attendance.manage')
);
CREATE POLICY "corr_ins_self" ON public.attendance_corrections FOR INSERT TO authenticated WITH CHECK (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);
CREATE POLICY "corr_upd_manage" ON public.attendance_corrections FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.attendance.manage'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.attendance.manage'));
CREATE TRIGGER trg_corr_updated BEFORE UPDATE ON public.attendance_corrections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Apply approved correction to attendance ledger
CREATE OR REPLACE FUNCTION public.apply_attendance_correction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.attendance_records
      (employee_id, work_date, status, check_in_at, check_out_at, source, notes, recorded_by)
    VALUES
      (NEW.employee_id, NEW.work_date, NEW.requested_status,
       NEW.requested_check_in, NEW.requested_check_out, 'correction',
       'Correction #' || NEW.id, NEW.reviewed_by)
    ON CONFLICT (employee_id, work_date) DO UPDATE
      SET status = EXCLUDED.status,
          check_in_at = EXCLUDED.check_in_at,
          check_out_at = EXCLUDED.check_out_at,
          source = 'correction',
          notes = EXCLUDED.notes,
          recorded_by = EXCLUDED.recorded_by,
          updated_at = now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_apply_correction
AFTER UPDATE ON public.attendance_corrections
FOR EACH ROW EXECUTE FUNCTION public.apply_attendance_correction();

-- ---------------------------------------------------------
-- Leave policies
-- ---------------------------------------------------------
CREATE TABLE public.leave_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_type public.leave_type NOT NULL UNIQUE,
  annual_allowance INTEGER NOT NULL DEFAULT 0,
  carryover_days INTEGER NOT NULL DEFAULT 0,
  requires_medical BOOLEAN NOT NULL DEFAULT false,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_policies TO authenticated;
GRANT ALL ON public.leave_policies TO service_role;
ALTER TABLE public.leave_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_view" ON public.leave_policies FOR SELECT TO authenticated
  USING (public.is_active_employee(auth.uid()));
CREATE POLICY "lp_manage" ON public.leave_policies FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.leave.approve'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.leave.approve'));
CREATE TRIGGER trg_lp_updated BEFORE UPDATE ON public.leave_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default policies
INSERT INTO public.leave_policies (leave_type, annual_allowance, carryover_days, requires_medical, is_paid) VALUES
  ('annual', 21, 5, false, true),
  ('medical', 12, 0, true, true),
  ('emergency', 5, 0, false, true),
  ('maternity', 90, 0, false, true),
  ('paternity', 14, 0, false, true),
  ('bereavement', 5, 0, false, true),
  ('compensatory', 0, 0, false, true),
  ('unpaid', 0, 0, false, false)
ON CONFLICT (leave_type) DO NOTHING;

-- ---------------------------------------------------------
-- Leave balances
-- ---------------------------------------------------------
CREATE TABLE public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type public.leave_type NOT NULL,
  year INTEGER NOT NULL,
  allocated NUMERIC(6,2) NOT NULL DEFAULT 0,
  used NUMERIC(6,2) NOT NULL DEFAULT 0,
  pending NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, leave_type, year)
);
CREATE INDEX idx_lb_emp ON public.leave_balances(employee_id, year);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_balances TO authenticated;
GRANT ALL ON public.leave_balances TO service_role;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lb_view" ON public.leave_balances FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.attendance.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.leave.approve')
);
CREATE POLICY "lb_manage" ON public.leave_balances FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'people_ops.leave.approve'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'people_ops.leave.approve'));
CREATE TRIGGER trg_lb_updated BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- Leave requests
-- ---------------------------------------------------------
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE DEFAULT ('LR-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type public.leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC(5,2) NOT NULL,
  reason TEXT NOT NULL,
  status public.leave_request_status NOT NULL DEFAULT 'pending_lead',
  handover_notes TEXT,
  medical_doc_url TEXT,
  lead_reviewer UUID,
  lead_reviewed_at TIMESTAMPTZ,
  dept_reviewer UUID,
  dept_reviewed_at TIMESTAMPTZ,
  hr_reviewer UUID,
  hr_reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (days > 0)
);
CREATE INDEX idx_lr_emp ON public.leave_requests(employee_id, start_date DESC);
CREATE INDEX idx_lr_status ON public.leave_requests(status);
GRANT SELECT, INSERT, UPDATE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lr_view" ON public.leave_requests FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_admin_permission(auth.uid(),'people_ops.attendance.view')
  OR public.has_admin_permission(auth.uid(),'people_ops.leave.approve')
);
CREATE POLICY "lr_ins_self" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);
CREATE POLICY "lr_upd" ON public.leave_requests FOR UPDATE TO authenticated USING (
  (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND status IN ('draft','pending_lead'))
  OR public.has_admin_permission(auth.uid(),'people_ops.leave.approve')
) WITH CHECK (
  (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
  OR public.has_admin_permission(auth.uid(),'people_ops.leave.approve')
);
CREATE TRIGGER trg_lr_updated BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync balances + attendance ledger when leave transitions
CREATE OR REPLACE FUNCTION public.sync_leave_effects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year INTEGER; v_day DATE;
BEGIN
  v_year := EXTRACT(YEAR FROM NEW.start_date)::INTEGER;

  IF TG_OP = 'INSERT' THEN
    -- Reserve pending balance
    INSERT INTO public.leave_balances (employee_id, leave_type, year, allocated, pending)
    VALUES (NEW.employee_id, NEW.leave_type, v_year, 0, NEW.days)
    ON CONFLICT (employee_id, leave_type, year)
      DO UPDATE SET pending = public.leave_balances.pending + NEW.days, updated_at = now();
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.leave_balances
        SET pending = GREATEST(0, pending - NEW.days),
            used = used + NEW.days,
            updated_at = now()
        WHERE employee_id = NEW.employee_id AND leave_type = NEW.leave_type AND year = v_year;
      -- Mark attendance ledger for each day
      v_day := NEW.start_date;
      WHILE v_day <= NEW.end_date LOOP
        INSERT INTO public.attendance_records
          (employee_id, work_date, status, source, notes, recorded_by)
        VALUES
          (NEW.employee_id, v_day, 'leave', 'system',
           'Leave: ' || NEW.leave_type || ' (' || NEW.request_number || ')',
           NEW.hr_reviewer)
        ON CONFLICT (employee_id, work_date) DO UPDATE
          SET status = 'leave', source = 'system',
              notes = EXCLUDED.notes, updated_at = now();
        v_day := v_day + INTERVAL '1 day';
      END LOOP;
    ELSIF NEW.status IN ('rejected','cancelled') THEN
      UPDATE public.leave_balances
        SET pending = GREATEST(0, pending - NEW.days), updated_at = now()
        WHERE employee_id = NEW.employee_id AND leave_type = NEW.leave_type AND year = v_year;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sync_leave
AFTER INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_leave_effects();

-- ---------------------------------------------------------
-- Permission registry + auto-grant to People Ops roles
-- ---------------------------------------------------------
INSERT INTO public.admin_permissions (permission_key, name, description, module) VALUES
  ('people_ops.attendance.view',   'View attendance',   'View attendance records across the organization', 'people_ops'),
  ('people_ops.attendance.manage', 'Manage attendance', 'Edit attendance, approve corrections',            'people_ops'),
  ('people_ops.leave.approve',     'Approve leave',     'Approve or reject leave requests, manage policies and balances', 'people_ops'),
  ('people_ops.shift.manage',      'Manage shifts',     'Create shifts and assign employees to schedules', 'people_ops'),
  ('people_ops.holiday.manage',    'Manage holidays',   'Add and edit organization / department holidays', 'people_ops')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE p.permission_key IN (
  'people_ops.attendance.view',
  'people_ops.attendance.manage',
  'people_ops.leave.approve',
  'people_ops.shift.manage',
  'people_ops.holiday.manage'
)
AND r.id IN (
  SELECT DISTINCT rp.role_id FROM public.admin_role_permissions rp
  JOIN public.admin_permissions p2 ON p2.id = rp.permission_id
  WHERE p2.permission_key = 'people_ops.employees.manage'
)
ON CONFLICT DO NOTHING;
