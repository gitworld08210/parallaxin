-- Protect founders and co-founders from HR-driven lifecycle changes.
-- Only members of the Founder Office (or the service role) can suspend,
-- exit, change role/department, or otherwise mutate founder / co_founder
-- employee records.

CREATE OR REPLACE FUNCTION public.protect_founder_records()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  is_founder_office boolean := false;
BEGIN
  -- Service role / internal calls (no auth.uid()) are allowed through.
  IF actor IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Only guard rows whose target is a founder or co_founder.
  IF TG_OP = 'DELETE' THEN
    IF OLD.user_type NOT IN ('founder','co_founder') THEN
      RETURN OLD;
    END IF;
  ELSE
    IF COALESCE(NEW.user_type, OLD.user_type) NOT IN ('founder','co_founder')
       AND (OLD IS NULL OR OLD.user_type NOT IN ('founder','co_founder')) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Founder Office members bypass the guard.
  SELECT public.is_admin_department_member(actor, 'founder_office')
    INTO is_founder_office;

  IF is_founder_office THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- A founder / co_founder is always allowed to edit their own record
  -- (e.g. photo, contact fields) but NOT their own employment_status.
  IF TG_OP = 'UPDATE'
     AND OLD.user_id IS NOT NULL
     AND OLD.user_id = actor
     AND NEW.employment_status IS NOT DISTINCT FROM OLD.employment_status
     AND NEW.user_type IS NOT DISTINCT FROM OLD.user_type THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only the Founder Office can modify founder or co-founder records'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_founder_records ON public.employees;
CREATE TRIGGER trg_protect_founder_records
BEFORE UPDATE OR DELETE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.protect_founder_records();