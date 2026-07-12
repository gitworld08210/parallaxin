
-- 1. Add 'executive' to admin_user_type enum
ALTER TYPE public.admin_user_type ADD VALUE IF NOT EXISTS 'executive';

-- 2. Employee ID sequence + generator
CREATE SEQUENCE IF NOT EXISTS public.employees_hire_seq START 1;

CREATE OR REPLACE FUNCTION public.gen_employee_number()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'AURE' || lpad(nextval('public.employees_hire_seq')::text, 3, '0');
$$;

-- 3. Backfill existing rows to new scheme (deterministic by created_at)
DO $$
DECLARE
  r RECORD;
  n int := 1;
BEGIN
  -- Founder → AURE-F01
  UPDATE public.employees
  SET employee_number = 'AURE-F01'
  WHERE employee_number = 'AUR-FND-177051';

  -- Reset sequence, renumber remaining rows in creation order
  PERFORM setval('public.employees_hire_seq', 1, false);
  FOR r IN
    SELECT id
    FROM public.employees
    WHERE employee_number LIKE 'AUR-______' OR employee_number LIKE 'AUR-000%'
    ORDER BY created_at
  LOOP
    UPDATE public.employees
    SET employee_number = 'AURE' || lpad(n::text, 3, '0')
    WHERE id = r.id;
    n := n + 1;
  END LOOP;
  PERFORM setval('public.employees_hire_seq', GREATEST(n, 1), false);
END $$;

-- 4. executive_appointments table
CREATE TABLE IF NOT EXISTS public.executive_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key text NOT NULL,
  slot_label text NOT NULL,
  department_id uuid REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  appointed_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  personal_email text NOT NULL,
  appointed_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_reason text,
  gmail_message_id text,
  pdf_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS executive_appointments_active_slot_idx
  ON public.executive_appointments(slot_key) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS executive_appointments_employee_idx
  ON public.executive_appointments(employee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_appointments TO authenticated;
GRANT ALL ON public.executive_appointments TO service_role;

ALTER TABLE public.executive_appointments ENABLE ROW LEVEL SECURITY;

-- Founders can read/write everything; appointees can read their own row
CREATE POLICY "founders_manage_appointments"
  ON public.executive_appointments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.admin_roles r ON r.id = e.role_id
      WHERE e.user_id = auth.uid()
        AND e.employment_status = 'active'
        AND r.key IN ('founder', 'co_founder')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.admin_roles r ON r.id = e.role_id
      WHERE e.user_id = auth.uid()
        AND e.employment_status = 'active'
        AND r.key IN ('founder', 'co_founder')
    )
  );

CREATE POLICY "appointee_reads_own_appointment"
  ON public.executive_appointments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = executive_appointments.employee_id
        AND e.user_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_executive_appointments_updated_at ON public.executive_appointments;
CREATE TRIGGER trg_executive_appointments_updated_at
  BEFORE UPDATE ON public.executive_appointments
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 5. Storage RLS on joining-letters bucket
CREATE POLICY "founders_read_joining_letters"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'joining-letters'
    AND EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.admin_roles r ON r.id = e.role_id
      WHERE e.user_id = auth.uid()
        AND e.employment_status = 'active'
        AND r.key IN ('founder', 'co_founder')
    )
  );

CREATE POLICY "appointee_reads_own_letter"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'joining-letters'
    AND EXISTS (
      SELECT 1 FROM public.executive_appointments a
      JOIN public.employees e ON e.id = a.employee_id
      WHERE a.pdf_path = storage.objects.name
        AND e.user_id = auth.uid()
    )
  );
