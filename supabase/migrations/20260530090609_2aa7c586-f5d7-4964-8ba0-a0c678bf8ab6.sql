
-- ============ VERIFICATION: boolean-driven approval ============
ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- Allow notifications inserts from triggers (currently no insert policy exists; triggers run as definer so RLS does not apply, but be explicit)
-- (No policy change needed; security definer triggers bypass RLS.)

CREATE OR REPLACE FUNCTION public.on_verification_approved_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approved IS DISTINCT FROM OLD.approved THEN
    IF NEW.approved = true THEN
      UPDATE public.profiles
        SET verified = true,
            verification_kind = NEW.category
        WHERE user_id = NEW.user_id;
      NEW.status := 'approved';
      NEW.reviewed_at := now();
      INSERT INTO public.notifications (user_id, type)
      VALUES (NEW.user_id, 'verification_approved');
    ELSE
      UPDATE public.profiles
        SET verified = false,
            verification_kind = NULL
        WHERE user_id = NEW.user_id;
      NEW.status := 'pending';
      INSERT INTO public.notifications (user_id, type)
      VALUES (NEW.user_id, 'verification_revoked');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS verification_approved_trigger ON public.verification_requests;
CREATE TRIGGER verification_approved_trigger
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_verification_approved_trg();

-- ============ FOUNDER HALL: drop applications, add seats ============
DROP TABLE IF EXISTS public.founder_applications CASCADE;

CREATE TABLE public.founder_seats (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_number   int  NOT NULL UNIQUE,
  user_id       uuid UNIQUE,
  council_role  council_role,
  founder_title text,
  is_active     boolean NOT NULL DEFAULT false,
  revoke_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.founder_seats TO anon, authenticated;
GRANT ALL    ON public.founder_seats TO service_role;

ALTER TABLE public.founder_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY founder_seats_select_all ON public.founder_seats
  FOR SELECT USING (true);

CREATE POLICY founder_seats_admin_write ON public.founder_seats
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed 50 empty seats
INSERT INTO public.founder_seats (seat_number)
SELECT g FROM generate_series(1, 50) g
ON CONFLICT (seat_number) DO NOTHING;

-- Trigger: react to seat changes
CREATE OR REPLACE FUNCTION public.on_founder_seat_change_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_founder boolean := (OLD.user_id IS NOT NULL AND OLD.is_active = true);
  is_founder_now boolean := (NEW.user_id IS NOT NULL AND NEW.is_active = true);
  msg text;
BEGIN
  NEW.updated_at := now();

  -- Inducted: previously not a founder, now is
  IF is_founder_now AND NOT was_founder THEN
    UPDATE public.profiles
      SET is_founder = true,
          founder_level = GREATEST(founder_level, 1),
          join_era = 'founder',
          council_role = COALESCE(NEW.council_role, council_role),
          founder_title = COALESCE(NEW.founder_title, founder_title)
      WHERE user_id = NEW.user_id;
    INSERT INTO public.notifications (user_id, type)
    VALUES (NEW.user_id, 'founder_inducted');
  END IF;

  -- Revoked: previously a founder, now is not
  IF was_founder AND NOT is_founder_now THEN
    UPDATE public.profiles
      SET is_founder = false,
          founder_title = NULL,
          council_role = NULL
      WHERE user_id = OLD.user_id;
    -- Use admin-provided reason as notification body via comment_id? notifications has no body column.
    -- We store the reason on the seat row; client renders the latest reason for the revoked notif if present.
    INSERT INTO public.notifications (user_id, type)
    VALUES (OLD.user_id, 'founder_revoked');
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS founder_seat_change_trigger ON public.founder_seats;
CREATE TRIGGER founder_seat_change_trigger
  BEFORE UPDATE ON public.founder_seats
  FOR EACH ROW EXECUTE FUNCTION public.on_founder_seat_change_trg();

-- Also handle direct INSERT with a user already assigned (rare, but possible)
CREATE OR REPLACE FUNCTION public.on_founder_seat_insert_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.is_active = true THEN
    UPDATE public.profiles
      SET is_founder = true,
          founder_level = GREATEST(founder_level, 1),
          join_era = 'founder',
          council_role = COALESCE(NEW.council_role, council_role),
          founder_title = COALESCE(NEW.founder_title, founder_title)
      WHERE user_id = NEW.user_id;
    INSERT INTO public.notifications (user_id, type)
    VALUES (NEW.user_id, 'founder_inducted');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS founder_seat_insert_trigger ON public.founder_seats;
CREATE TRIGGER founder_seat_insert_trigger
  AFTER INSERT ON public.founder_seats
  FOR EACH ROW EXECUTE FUNCTION public.on_founder_seat_insert_trg();
