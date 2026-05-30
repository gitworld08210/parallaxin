-- Prevent the same user from holding two active founder seats simultaneously.
CREATE UNIQUE INDEX IF NOT EXISTS founder_seats_active_user_unique
  ON public.founder_seats (user_id)
  WHERE is_active = true AND user_id IS NOT NULL;