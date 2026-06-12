
ALTER TABLE public.ownership_certificates
  ADD CONSTRAINT ownership_certificates_creator_id_fkey
  FOREIGN KEY (creator_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
