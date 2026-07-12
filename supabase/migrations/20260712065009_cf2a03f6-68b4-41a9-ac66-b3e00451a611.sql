
-- ============ singleton security policy ============
CREATE TABLE public.executive_security_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password_min_length integer NOT NULL DEFAULT 12,
  password_require_uppercase boolean NOT NULL DEFAULT true,
  password_require_lowercase boolean NOT NULL DEFAULT true,
  password_require_number boolean NOT NULL DEFAULT true,
  password_require_symbol boolean NOT NULL DEFAULT true,
  password_expiry_days integer NOT NULL DEFAULT 90,
  password_history_depth integer NOT NULL DEFAULT 5,
  mfa_required boolean NOT NULL DEFAULT true,
  session_timeout_minutes integer NOT NULL DEFAULT 60,
  max_concurrent_sessions integer NOT NULL DEFAULT 3,
  failed_login_threshold integer NOT NULL DEFAULT 5,
  device_approval_required boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_security_policies TO authenticated;
GRANT ALL ON public.executive_security_policies TO service_role;
ALTER TABLE public.executive_security_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "esp_read" ON public.executive_security_policies FOR SELECT TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "esp_write" ON public.executive_security_policies FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

INSERT INTO public.executive_security_policies (password_min_length) VALUES (12);

-- ============ password history ============
CREATE TABLE public.executive_password_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.executive_password_history TO authenticated;
GRANT ALL ON public.executive_password_history TO service_role;
ALTER TABLE public.executive_password_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eph_read_self_or_founder" ON public.executive_password_history FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "eph_insert_self_or_founder" ON public.executive_password_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ trusted devices ============
CREATE TABLE public.executive_trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  device_fingerprint text,
  browser text,
  os text,
  last_ip inet,
  last_used_at timestamptz DEFAULT now(),
  is_approved boolean NOT NULL DEFAULT true,
  risk_level text NOT NULL DEFAULT 'low',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_trusted_devices TO authenticated;
GRANT ALL ON public.executive_trusted_devices TO service_role;
ALTER TABLE public.executive_trusted_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "etd_read" ON public.executive_trusted_devices FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "etd_insert" ON public.executive_trusted_devices FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "etd_update" ON public.executive_trusted_devices FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "etd_delete" ON public.executive_trusted_devices FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ recovery methods ============
CREATE TABLE public.executive_recovery_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type text NOT NULL,
  label text,
  value text,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_recovery_methods TO authenticated;
GRANT ALL ON public.executive_recovery_methods TO service_role;
ALTER TABLE public.executive_recovery_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erm_read" ON public.executive_recovery_methods FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "erm_write" ON public.executive_recovery_methods FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ recovery codes ============
CREATE TABLE public.executive_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_recovery_codes TO authenticated;
GRANT ALL ON public.executive_recovery_codes TO service_role;
ALTER TABLE public.executive_recovery_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erc_read" ON public.executive_recovery_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "erc_write" ON public.executive_recovery_codes FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ security alerts ============
CREATE TABLE public.executive_security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.executive_security_alerts TO authenticated;
GRANT ALL ON public.executive_security_alerts TO service_role;
ALTER TABLE public.executive_security_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "esa_read" ON public.executive_security_alerts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "esa_insert" ON public.executive_security_alerts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "esa_update" ON public.executive_security_alerts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ append-only login events ============
CREATE TABLE public.executive_login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  outcome text NOT NULL DEFAULT 'success',
  ip inet,
  user_agent text,
  device_id uuid REFERENCES public.executive_trusted_devices(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.executive_login_events TO authenticated;
GRANT ALL ON public.executive_login_events TO service_role;
ALTER TABLE public.executive_login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ele_read" ON public.executive_login_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "ele_insert" ON public.executive_login_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ MFA settings ============
CREATE TABLE public.executive_mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL,
  secret_ref text,
  is_enabled boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, method)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_mfa_settings TO authenticated;
GRANT ALL ON public.executive_mfa_settings TO service_role;
ALTER TABLE public.executive_mfa_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ems_read" ON public.executive_mfa_settings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "ems_write" ON public.executive_mfa_settings FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (user_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ triggers ============
CREATE TRIGGER trg_esp_upd BEFORE UPDATE ON public.executive_security_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_etd_upd BEFORE UPDATE ON public.executive_trusted_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_erm_upd BEFORE UPDATE ON public.executive_recovery_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ems_upd BEFORE UPDATE ON public.executive_mfa_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
