CREATE OR REPLACE FUNCTION public.sup_ticket_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dept_key text;
  dept_id uuid;
BEGIN
  -- Auto ticket number
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'TKT-' || to_char(now(),'YYYY') || '-' ||
      lpad((floor(random()*900000)::int + 100000)::text, 6, '0');
  END IF;

  -- Route to owning department by category
  IF NEW.owning_department_id IS NULL THEN
    dept_key := CASE NEW.category::text
      WHEN 'verification'    THEN 'verification'
      WHEN 'trust_safety'    THEN 'trust_safety'
      WHEN 'appeal'          THEN 'trust_safety'
      WHEN 'hr'              THEN 'people_ops'
      WHEN 'billing'         THEN 'finance'
      WHEN 'bug'             THEN 'engineering'
      WHEN 'technical'       THEN 'engineering'
      WHEN 'it'              THEN 'engineering'
      WHEN 'feature_request' THEN 'engineering'
      WHEN 'organization'    THEN 'organizations'
      WHEN 'creator'         THEN 'creator_success'
      ELSE                        'support'
    END;

    SELECT id INTO dept_id FROM public.admin_departments WHERE key = dept_key LIMIT 1;
    IF dept_id IS NULL THEN
      SELECT id INTO dept_id FROM public.admin_departments WHERE key = 'support' LIMIT 1;
    END IF;
    NEW.owning_department_id := dept_id;
  END IF;

  -- SLA windows
  IF NEW.first_response_due_at IS NULL THEN
    NEW.first_response_due_at := now() + CASE NEW.priority
      WHEN 'critical' THEN interval '1 hour'
      WHEN 'high'     THEN interval '4 hours'
      WHEN 'medium'   THEN interval '12 hours'
      ELSE                 interval '24 hours' END;
  END IF;
  IF NEW.resolution_due_at IS NULL THEN
    NEW.resolution_due_at := now() + CASE NEW.priority
      WHEN 'critical' THEN interval '4 hours'
      WHEN 'high'     THEN interval '1 day'
      WHEN 'medium'   THEN interval '3 days'
      ELSE                 interval '7 days' END;
  END IF;
  RETURN NEW;
END;
$$;