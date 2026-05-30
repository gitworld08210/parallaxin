
DO $$
DECLARE
  new_uid uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'adit080210@gmail.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_uid,
      'authenticated',
      'authenticated',
      'adit080210@gmail.com',
      crypt('admin@9756', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"admin","display_name":"Admin"}'::jsonb,
      '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), new_uid,
      jsonb_build_object('sub', new_uid::text, 'email', 'adit080210@gmail.com', 'email_verified', true),
      'email', new_uid::text, now(), now(), now()
    );
  END IF;
END $$;

-- Ensure admin role exists for this account
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'adit080210@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
