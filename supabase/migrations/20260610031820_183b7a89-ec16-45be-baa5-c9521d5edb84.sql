
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'like','comment','follow','message','mention',
  'verification_approved','verification_revoked',
  'founder_inducted','founder_revoked',
  'tip','collab_invite','collab_accepted'
]));

-- Clean double-encoded values: if the jsonb is a string that itself parses as JSON, replace with the inner value.
UPDATE public.app_config
SET value = to_jsonb((value #>> '{}')::jsonb #>> '{}')
WHERE key IN ('platform_upi_id','platform_qr_url','platform_payee_name')
  AND jsonb_typeof(value) = 'string'
  AND left(value #>> '{}', 1) = '"';
