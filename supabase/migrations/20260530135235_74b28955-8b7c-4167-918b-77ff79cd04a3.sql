
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_verification_kind_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_verification_kind_check
  CHECK (verification_kind IS NULL OR verification_kind = ANY (ARRAY[
    'verified','creator','gov','brand','founder',
    'public_figure','government','business','media'
  ]));
