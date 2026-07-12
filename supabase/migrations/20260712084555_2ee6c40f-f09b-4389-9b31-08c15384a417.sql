
CREATE OR REPLACE FUNCTION public.guard_employee_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_hr_or_founder boolean;
BEGIN
  -- Service-role / server-side context (no authenticated end-user): allow.
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  is_hr_or_founder := public.is_admin_department_member(uid, 'people_ops')
    OR public.is_admin_department_member(uid, 'founder_office');

  IF is_hr_or_founder THEN
    RETURN NEW;
  END IF;

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
    RAISE EXCEPTION 'Employees can only update their own first-login flags. Privileged fields must be changed by HR or the Founder Office.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
