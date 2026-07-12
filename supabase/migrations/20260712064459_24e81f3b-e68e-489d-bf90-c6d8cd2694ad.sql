
-- ============ company_configurations ============
CREATE TABLE public.company_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  is_critical boolean NOT NULL DEFAULT false,
  requires_dual_approval boolean NOT NULL DEFAULT false,
  current_version integer NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_configurations TO authenticated;
GRANT ALL ON public.company_configurations TO service_role;
ALTER TABLE public.company_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfg_read_all" ON public.company_configurations FOR SELECT TO authenticated USING (true);
CREATE POLICY "cfg_write" ON public.company_configurations FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ company_configuration_versions ============
CREATE TABLE public.company_configuration_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.company_configurations(id) ON DELETE CASCADE,
  version integer NOT NULL,
  value jsonb NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (config_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_configuration_versions TO authenticated;
GRANT ALL ON public.company_configuration_versions TO service_role;
ALTER TABLE public.company_configuration_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfg_ver_read" ON public.company_configuration_versions FOR SELECT TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'));
CREATE POLICY "cfg_ver_write" ON public.company_configuration_versions FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ company_brand_assets ============
CREATE TABLE public.company_brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type text NOT NULL,
  name text NOT NULL,
  url text,
  value text,
  is_dark_mode boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_brand_assets TO authenticated;
GRANT ALL ON public.company_brand_assets TO service_role;
ALTER TABLE public.company_brand_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_read_all" ON public.company_brand_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "brand_write" ON public.company_brand_assets FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ company_feature_flags ============
CREATE TABLE public.company_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  rollout_percentage integer NOT NULL DEFAULT 0,
  target_departments text[] NOT NULL DEFAULT '{}',
  is_beta boolean NOT NULL DEFAULT false,
  is_internal boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_feature_flags TO authenticated;
GRANT ALL ON public.company_feature_flags TO service_role;
ALTER TABLE public.company_feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flag_read_all" ON public.company_feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "flag_write" ON public.company_feature_flags FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ company_modules ============
CREATE TABLE public.company_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  is_visible boolean NOT NULL DEFAULT true,
  dependencies text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_modules TO authenticated;
GRANT ALL ON public.company_modules TO service_role;
ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mod_read_all" ON public.company_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "mod_write" ON public.company_modules FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ company_metadata ============
CREATE TABLE public.company_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  prefix text,
  format_pattern text,
  current_sequence integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_metadata TO authenticated;
GRANT ALL ON public.company_metadata TO service_role;
ALTER TABLE public.company_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meta_read_all" ON public.company_metadata FOR SELECT TO authenticated USING (true);
CREATE POLICY "meta_write" ON public.company_metadata FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ company_calendar_events ============
CREATE TABLE public.company_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_type text NOT NULL,
  description text,
  starts_at date NOT NULL,
  ends_at date,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_pattern text,
  is_working_day boolean,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_calendar_events TO authenticated;
GRANT ALL ON public.company_calendar_events TO service_role;
ALTER TABLE public.company_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cal_read_all" ON public.company_calendar_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "cal_write" ON public.company_calendar_events FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ company_localization ============
CREATE TABLE public.company_localization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  region_code text,
  display_name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  date_format text NOT NULL DEFAULT 'YYYY-MM-DD',
  time_format text NOT NULL DEFAULT '24h',
  currency text NOT NULL DEFAULT 'INR',
  measurement_units text NOT NULL DEFAULT 'metric',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (language_code, region_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_localization TO authenticated;
GRANT ALL ON public.company_localization TO service_role;
ALTER TABLE public.company_localization ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loc_read_all" ON public.company_localization FOR SELECT TO authenticated USING (true);
CREATE POLICY "loc_write" ON public.company_localization FOR ALL TO authenticated
  USING (public.is_admin_department_member(auth.uid(),'founder_office'))
  WITH CHECK (public.is_admin_department_member(auth.uid(),'founder_office'));

-- ============ triggers ============
CREATE TRIGGER trg_cfg_updated_at BEFORE UPDATE ON public.company_configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_brand_updated_at BEFORE UPDATE ON public.company_brand_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_flag_updated_at BEFORE UPDATE ON public.company_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mod_updated_at BEFORE UPDATE ON public.company_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meta_updated_at BEFORE UPDATE ON public.company_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cal_updated_at BEFORE UPDATE ON public.company_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_loc_updated_at BEFORE UPDATE ON public.company_localization
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ auto-version configuration changes ============
CREATE OR REPLACE FUNCTION public.snapshot_company_configuration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.value IS DISTINCT FROM OLD.value) THEN
    NEW.current_version := COALESCE(OLD.current_version, 1) + 1;
    INSERT INTO public.company_configuration_versions (config_id, version, value, changed_by)
    VALUES (NEW.id, NEW.current_version, NEW.value, NEW.updated_by);
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.company_configuration_versions (config_id, version, value, changed_by)
    VALUES (NEW.id, NEW.current_version, NEW.value, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cfg_snapshot_ins AFTER INSERT ON public.company_configurations
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_company_configuration();
CREATE TRIGGER trg_cfg_snapshot_upd BEFORE UPDATE ON public.company_configurations
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_company_configuration();
