
-- =========================================================================
-- Aurelix Ads Platform (AAP) — Phase 1 foundation schema
-- =========================================================================

-- ENUMS
CREATE TYPE public.aap_advertiser_type   AS ENUM ('organization','creator');
CREATE TYPE public.aap_advertiser_status AS ENUM ('active','suspended','frozen','blacklisted','pending_verification');
CREATE TYPE public.aap_billing_mode      AS ENUM ('prepaid_wallet','postpaid_invoice');
CREATE TYPE public.aap_campaign_objective AS ENUM ('awareness','reach','engagement','traffic','app_promotion','video_views','conversions');
CREATE TYPE public.aap_campaign_status   AS ENUM ('draft','pending_review','approved','rejected','running','paused','completed','archived');
CREATE TYPE public.aap_ad_format         AS ENUM ('image','video','carousel','story','feed','reels','search','sponsored_profile','sponsored_organization');
CREATE TYPE public.aap_ad_status         AS ENUM ('draft','pending_review','approved','rejected','running','paused','archived');
CREATE TYPE public.aap_placement_surface AS ENUM ('feed','reels','stories','explore','search','profile','organization');
CREATE TYPE public.aap_review_state      AS ENUM ('pending','approved','rejected','appealed','need_changes');
CREATE TYPE public.aap_invoice_status    AS ENUM ('draft','issued','paid','overdue','void','refunded');
CREATE TYPE public.aap_payment_status    AS ENUM ('pending','verified','failed','refunded');
CREATE TYPE public.aap_event_kind        AS ENUM ('impression','click','view','conversion','skip');
CREATE TYPE public.aap_role_key          AS ENUM ('advertiser_admin','advertiser_editor','advertiser_viewer');

-- Staff helpers (no aap_ table refs)
CREATE OR REPLACE FUNCTION public.aap_is_staff(_dept_keys text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.admin_departments d ON d.id = e.department_id
    WHERE e.user_id = auth.uid()
      AND e.employment_status = 'active'
      AND d.key = ANY(_dept_keys)
  );
$$;

CREATE OR REPLACE FUNCTION public.aap_is_founder()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.founder_seats fs WHERE fs.user_id = auth.uid() AND fs.is_active = true);
$$;

CREATE OR REPLACE FUNCTION public.aap_is_reviewer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.aap_is_staff(ARRAY['trust_safety','moderation','founder_office']) OR public.aap_is_founder();
$$;

CREATE OR REPLACE FUNCTION public.aap_is_finance()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.aap_is_staff(ARRAY['finance','finance_legal']) OR public.aap_is_founder();
$$;

CREATE OR REPLACE FUNCTION public.aap_is_engineering()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.aap_is_staff(ARRAY['engineering']) OR public.aap_is_founder();
$$;

CREATE OR REPLACE FUNCTION public.aap_is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.aap_is_founder() OR public.aap_is_finance() OR public.aap_is_engineering() OR public.aap_is_reviewer();
$$;

-- Core advertiser + members (create tables BEFORE the helper functions that reference them)
CREATE TABLE public.aap_advertisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type aap_advertiser_type NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  legal_name text,
  country text,
  timezone text DEFAULT 'Asia/Kolkata',
  currency text DEFAULT 'INR',
  status aap_advertiser_status NOT NULL DEFAULT 'pending_verification',
  billing_mode aap_billing_mode NOT NULL DEFAULT 'prepaid_wallet',
  daily_spend_limit numeric(18,4),
  health_score numeric(5,2) DEFAULT 100,
  verification_level int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aap_advertisers_owner_idx ON public.aap_advertisers(owner_user_id);
CREATE INDEX aap_advertisers_org_idx   ON public.aap_advertisers(organization_id);
CREATE INDEX aap_advertisers_status_idx ON public.aap_advertisers(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_advertisers TO authenticated;
GRANT ALL ON public.aap_advertisers TO service_role;
ALTER TABLE public.aap_advertisers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.aap_advertiser_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role aap_role_key NOT NULL DEFAULT 'advertiser_viewer',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(advertiser_id, user_id)
);
CREATE INDEX aap_am_advertiser_idx ON public.aap_advertiser_members(advertiser_id);
CREATE INDEX aap_am_user_idx ON public.aap_advertiser_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_advertiser_members TO authenticated;
GRANT ALL ON public.aap_advertiser_members TO service_role;
ALTER TABLE public.aap_advertiser_members ENABLE ROW LEVEL SECURITY;

-- Advertiser helper functions (now safe — tables exist)
CREATE OR REPLACE FUNCTION public.aap_advertiser_role(_advertiser_id uuid)
RETURNS aap_role_key LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT role FROM public.aap_advertiser_members
   WHERE advertiser_id = _advertiser_id AND user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.aap_is_advertiser_member(_advertiser_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.aap_advertiser_members
                 WHERE advertiser_id = _advertiser_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.aap_can_edit_advertiser(_advertiser_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.aap_advertiser_members
                 WHERE advertiser_id = _advertiser_id AND user_id = auth.uid()
                   AND role IN ('advertiser_admin','advertiser_editor'));
$$;

-- Advertiser + member policies
CREATE POLICY "adv view by member or admin" ON public.aap_advertisers
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.aap_is_advertiser_member(id) OR public.aap_is_platform_admin());
CREATE POLICY "adv insert authed" ON public.aap_advertisers
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid() OR public.aap_is_platform_admin());
CREATE POLICY "adv update admin or platform" ON public.aap_advertisers
  FOR UPDATE TO authenticated
  USING (public.aap_advertiser_role(id) = 'advertiser_admin' OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_advertiser_role(id) = 'advertiser_admin' OR public.aap_is_platform_admin());
CREATE POLICY "adv delete platform" ON public.aap_advertisers
  FOR DELETE TO authenticated USING (public.aap_is_platform_admin());

CREATE POLICY "am view own" ON public.aap_advertiser_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR public.aap_advertiser_role(advertiser_id) = 'advertiser_admin'
         OR public.aap_is_platform_admin());
CREATE POLICY "am self insert" ON public.aap_advertiser_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "am admin manage" ON public.aap_advertiser_members
  FOR ALL TO authenticated
  USING (public.aap_advertiser_role(advertiser_id) = 'advertiser_admin' OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_advertiser_role(advertiser_id) = 'advertiser_admin' OR public.aap_is_platform_admin());

-- BILLING
CREATE TABLE public.aap_billing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  billing_email text NOT NULL,
  billing_name text,
  address_line1 text, address_line2 text, city text, state text, postal_code text, country text,
  tax_id text, gstin text,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_billing_profiles TO authenticated;
GRANT ALL ON public.aap_billing_profiles TO service_role;
ALTER TABLE public.aap_billing_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp adv scoped" ON public.aap_billing_profiles FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_finance() OR public.aap_is_founder())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_finance() OR public.aap_is_founder());

CREATE TABLE public.aap_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL UNIQUE REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'INR',
  balance numeric(18,4) NOT NULL DEFAULT 0,
  reserved numeric(18,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_wallets TO authenticated;
GRANT ALL ON public.aap_wallets TO service_role;
ALTER TABLE public.aap_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet view adv" ON public.aap_wallets FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_finance() OR public.aap_is_founder());
CREATE POLICY "wallet manage finance" ON public.aap_wallets FOR ALL TO authenticated
  USING (public.aap_is_finance() OR public.aap_is_founder())
  WITH CHECK (public.aap_is_finance() OR public.aap_is_founder());

CREATE TABLE public.aap_wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.aap_wallets(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  amount numeric(18,4) NOT NULL,
  reason text NOT NULL,
  reference_type text, reference_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aap_ledger_wallet_idx ON public.aap_wallet_ledger(wallet_id, created_at DESC);
GRANT SELECT ON public.aap_wallet_ledger TO authenticated;
GRANT ALL ON public.aap_wallet_ledger TO service_role;
ALTER TABLE public.aap_wallet_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger view" ON public.aap_wallet_ledger FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_finance() OR public.aap_is_founder());

CREATE TABLE public.aap_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  period_start date NOT NULL, period_end date NOT NULL,
  subtotal numeric(18,4) NOT NULL DEFAULT 0,
  tax numeric(18,4) NOT NULL DEFAULT 0,
  total numeric(18,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status aap_invoice_status NOT NULL DEFAULT 'draft',
  issued_at timestamptz, due_at timestamptz, paid_at timestamptz,
  marked_paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.aap_invoices TO authenticated;
GRANT ALL ON public.aap_invoices TO service_role;
ALTER TABLE public.aap_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv view" ON public.aap_invoices FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_finance() OR public.aap_is_founder());
CREATE POLICY "inv manage finance" ON public.aap_invoices FOR ALL TO authenticated
  USING (public.aap_is_finance() OR public.aap_is_founder())
  WITH CHECK (public.aap_is_finance() OR public.aap_is_founder());

CREATE TABLE public.aap_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.aap_invoices(id) ON DELETE CASCADE,
  campaign_id uuid,
  description text NOT NULL,
  quantity numeric(18,4) NOT NULL DEFAULT 1,
  unit_price numeric(18,4) NOT NULL DEFAULT 0,
  amount numeric(18,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_invoice_lines TO authenticated;
GRANT ALL ON public.aap_invoice_lines TO service_role;
ALTER TABLE public.aap_invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "il view via invoice" ON public.aap_invoice_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aap_invoices i
                 WHERE i.id = invoice_id
                   AND (public.aap_is_advertiser_member(i.advertiser_id) OR public.aap_is_finance() OR public.aap_is_founder())));
CREATE POLICY "il manage finance" ON public.aap_invoice_lines FOR ALL TO authenticated
  USING (public.aap_is_finance() OR public.aap_is_founder())
  WITH CHECK (public.aap_is_finance() OR public.aap_is_founder());

CREATE TABLE public.aap_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.aap_invoices(id) ON DELETE SET NULL,
  amount numeric(18,4) NOT NULL,
  method text NOT NULL DEFAULT 'upi',
  utr text,
  status aap_payment_status NOT NULL DEFAULT 'pending',
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.aap_payments TO authenticated;
GRANT ALL ON public.aap_payments TO service_role;
ALTER TABLE public.aap_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay view" ON public.aap_payments FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_finance() OR public.aap_is_founder());
CREATE POLICY "pay insert adv" ON public.aap_payments FOR INSERT TO authenticated
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_finance());
CREATE POLICY "pay update finance" ON public.aap_payments FOR UPDATE TO authenticated
  USING (public.aap_is_finance() OR public.aap_is_founder())
  WITH CHECK (public.aap_is_finance() OR public.aap_is_founder());

CREATE TABLE public.aap_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  amount numeric(18,4) NOT NULL,
  reason text NOT NULL,
  expires_at timestamptz,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.aap_credits TO authenticated;
GRANT ALL ON public.aap_credits TO service_role;
ALTER TABLE public.aap_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credits view" ON public.aap_credits FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_finance() OR public.aap_is_founder());
CREATE POLICY "credits manage finance" ON public.aap_credits FOR ALL TO authenticated
  USING (public.aap_is_finance() OR public.aap_is_founder())
  WITH CHECK (public.aap_is_finance() OR public.aap_is_founder());

CREATE TABLE public.aap_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric(18,4) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  max_uses int, uses int NOT NULL DEFAULT 0,
  valid_from timestamptz, valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_coupons TO authenticated;
GRANT ALL ON public.aap_coupons TO service_role;
ALTER TABLE public.aap_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons read" ON public.aap_coupons FOR SELECT TO authenticated USING (is_active OR public.aap_is_finance());
CREATE POLICY "coupons manage finance" ON public.aap_coupons FOR ALL TO authenticated
  USING (public.aap_is_finance() OR public.aap_is_founder())
  WITH CHECK (public.aap_is_finance() OR public.aap_is_founder());

CREATE TABLE public.aap_tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  country text NOT NULL,
  tax_type text NOT NULL DEFAULT 'GST',
  tax_number text,
  rate numeric(6,4) NOT NULL DEFAULT 0.18,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_tax_profiles TO authenticated;
GRANT ALL ON public.aap_tax_profiles TO service_role;
ALTER TABLE public.aap_tax_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax adv" ON public.aap_tax_profiles FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_finance())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_finance());

-- ASSETS & CREATIVES
CREATE TABLE public.aap_asset_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.aap_asset_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_asset_folders TO authenticated;
GRANT ALL ON public.aap_asset_folders TO service_role;
ALTER TABLE public.aap_asset_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "folders adv" ON public.aap_asset_folders FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());

CREATE TABLE public.aap_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.aap_asset_folders(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('image','video','logo','font','template','other')),
  storage_path text NOT NULL,
  mime_type text,
  width int, height int, duration_ms int, bytes bigint,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aap_assets_adv_idx ON public.aap_assets(advertiser_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_assets TO authenticated;
GRANT ALL ON public.aap_assets TO service_role;
ALTER TABLE public.aap_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets adv" ON public.aap_assets FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());

CREATE TABLE public.aap_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL,
  format aap_ad_format NOT NULL,
  primary_asset_id uuid REFERENCES public.aap_assets(id) ON DELETE SET NULL,
  headline text, description text, cta text, destination_url text,
  payload jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_creatives TO authenticated;
GRANT ALL ON public.aap_creatives TO service_role;
ALTER TABLE public.aap_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creatives adv" ON public.aap_creatives FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());

CREATE TABLE public.aap_creative_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid NOT NULL REFERENCES public.aap_creatives(id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creative_id, version)
);
GRANT SELECT, INSERT ON public.aap_creative_versions TO authenticated;
GRANT ALL ON public.aap_creative_versions TO service_role;
ALTER TABLE public.aap_creative_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cv via creative" ON public.aap_creative_versions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aap_creatives c WHERE c.id = creative_id
                 AND (public.aap_is_advertiser_member(c.advertiser_id) OR public.aap_is_platform_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aap_creatives c WHERE c.id = creative_id
                 AND (public.aap_can_edit_advertiser(c.advertiser_id) OR public.aap_is_platform_admin())));

-- AUDIENCES
CREATE TABLE public.aap_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  targeting jsonb NOT NULL DEFAULT '{}',
  estimated_reach bigint,
  is_saved boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aap_aud_targeting_idx ON public.aap_audiences USING GIN (targeting);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_audiences TO authenticated;
GRANT ALL ON public.aap_audiences TO service_role;
ALTER TABLE public.aap_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audiences adv" ON public.aap_audiences FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());

-- PLACEMENTS
CREATE TABLE public.aap_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface aap_placement_surface NOT NULL UNIQUE,
  display_name text NOT NULL,
  supported_formats aap_ad_format[] NOT NULL DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_placements TO authenticated;
GRANT ALL ON public.aap_placements TO service_role;
ALTER TABLE public.aap_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "placements read" ON public.aap_placements FOR SELECT TO authenticated USING (true);
CREATE POLICY "placements manage eng" ON public.aap_placements FOR ALL TO authenticated
  USING (public.aap_is_engineering() OR public.aap_is_founder())
  WITH CHECK (public.aap_is_engineering() OR public.aap_is_founder());

CREATE TABLE public.aap_placement_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'organization' CHECK (scope IN ('global','organization')),
  surface aap_placement_surface NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  frequency int NOT NULL DEFAULT 5,
  max_per_session int NOT NULL DEFAULT 20,
  notes text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, surface)
);
GRANT SELECT ON public.aap_placement_configs TO authenticated;
GRANT ALL ON public.aap_placement_configs TO service_role;
ALTER TABLE public.aap_placement_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc read" ON public.aap_placement_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "pc manage" ON public.aap_placement_configs FOR ALL TO authenticated
  USING (public.aap_is_finance() OR public.aap_is_engineering() OR public.aap_is_founder())
  WITH CHECK (public.aap_is_finance() OR public.aap_is_engineering() OR public.aap_is_founder());

-- CAMPAIGNS / AD GROUPS / ADS
CREATE TABLE public.aap_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL,
  objective aap_campaign_objective NOT NULL,
  status aap_campaign_status NOT NULL DEFAULT 'draft',
  total_budget numeric(18,4), daily_budget numeric(18,4),
  spent numeric(18,4) NOT NULL DEFAULT 0,
  start_at timestamptz, end_at timestamptz,
  bid_strategy text DEFAULT 'auto', notes text, archived_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aap_camp_adv_idx ON public.aap_campaigns(advertiser_id, created_at DESC);
CREATE INDEX aap_camp_status_idx ON public.aap_campaigns(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_campaigns TO authenticated;
GRANT ALL ON public.aap_campaigns TO service_role;
ALTER TABLE public.aap_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camp view" ON public.aap_campaigns FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin());
CREATE POLICY "camp write" ON public.aap_campaigns FOR ALL TO authenticated
  USING (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());

CREATE TABLE public.aap_ad_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.aap_campaigns(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL,
  audience_id uuid REFERENCES public.aap_audiences(id) ON DELETE SET NULL,
  placements aap_placement_surface[] NOT NULL DEFAULT '{}',
  budget numeric(18,4), daily_budget numeric(18,4),
  optimization_goal text,
  bid_strategy text DEFAULT 'auto', bid_amount numeric(18,4),
  schedule jsonb NOT NULL DEFAULT '{}',
  status aap_ad_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aap_ag_camp_idx ON public.aap_ad_groups(campaign_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_ad_groups TO authenticated;
GRANT ALL ON public.aap_ad_groups TO service_role;
ALTER TABLE public.aap_ad_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ag view" ON public.aap_ad_groups FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin());
CREATE POLICY "ag write" ON public.aap_ad_groups FOR ALL TO authenticated
  USING (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());

CREATE TABLE public.aap_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_group_id uuid NOT NULL REFERENCES public.aap_ad_groups(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.aap_campaigns(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  creative_id uuid REFERENCES public.aap_creatives(id) ON DELETE SET NULL,
  name text NOT NULL, format aap_ad_format NOT NULL,
  headline text, description text, cta text, destination_url text,
  status aap_ad_status NOT NULL DEFAULT 'draft',
  review_state aap_review_state NOT NULL DEFAULT 'pending',
  submitted_at timestamptz, approved_at timestamptz, rejected_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aap_ads_camp_idx ON public.aap_ads(campaign_id);
CREATE INDEX aap_ads_status_idx ON public.aap_ads(status, review_state);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_ads TO authenticated;
GRANT ALL ON public.aap_ads TO service_role;
ALTER TABLE public.aap_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads view" ON public.aap_ads FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin());
CREATE POLICY "ads write" ON public.aap_ads FOR ALL TO authenticated
  USING (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());

-- REVIEW
CREATE TABLE public.aap_policy_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, title text NOT NULL, description text,
  severity text NOT NULL DEFAULT 'medium',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_policy_refs TO authenticated;
GRANT ALL ON public.aap_policy_refs TO service_role;
ALTER TABLE public.aap_policy_refs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policy read" ON public.aap_policy_refs FOR SELECT TO authenticated USING (true);
CREATE POLICY "policy manage" ON public.aap_policy_refs FOR ALL TO authenticated
  USING (public.aap_is_reviewer()) WITH CHECK (public.aap_is_reviewer());

CREATE TABLE public.aap_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.aap_ads(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  state aap_review_state NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  priority int NOT NULL DEFAULT 5,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aap_rq_state_idx ON public.aap_review_queue(state, priority DESC, submitted_at);
GRANT SELECT, INSERT, UPDATE ON public.aap_review_queue TO authenticated;
GRANT ALL ON public.aap_review_queue TO service_role;
ALTER TABLE public.aap_review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rq view" ON public.aap_review_queue FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_reviewer());
CREATE POLICY "rq adv insert" ON public.aap_review_queue FOR INSERT TO authenticated
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id));
CREATE POLICY "rq reviewer manage" ON public.aap_review_queue FOR ALL TO authenticated
  USING (public.aap_is_reviewer()) WITH CHECK (public.aap_is_reviewer());

CREATE TABLE public.aap_review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.aap_review_queue(id) ON DELETE CASCADE,
  ad_id uuid NOT NULL REFERENCES public.aap_ads(id) ON DELETE CASCADE,
  decision aap_review_state NOT NULL,
  reason_code text, notes text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.aap_review_decisions TO authenticated;
GRANT ALL ON public.aap_review_decisions TO service_role;
ALTER TABLE public.aap_review_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rd view via ad" ON public.aap_review_decisions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aap_ads a WHERE a.id = ad_id
                 AND (public.aap_is_advertiser_member(a.advertiser_id) OR public.aap_is_reviewer())));
CREATE POLICY "rd insert reviewer" ON public.aap_review_decisions FOR INSERT TO authenticated
  WITH CHECK (public.aap_is_reviewer());

CREATE TABLE public.aap_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.aap_ads(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  reason text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','approved','denied')),
  decision_notes text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.aap_appeals TO authenticated;
GRANT ALL ON public.aap_appeals TO service_role;
ALTER TABLE public.aap_appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appeal view" ON public.aap_appeals FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_reviewer());
CREATE POLICY "appeal create" ON public.aap_appeals FOR INSERT TO authenticated
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id));
CREATE POLICY "appeal update reviewer" ON public.aap_appeals FOR UPDATE TO authenticated
  USING (public.aap_is_reviewer()) WITH CHECK (public.aap_is_reviewer());

-- EVENTS / ROLLUPS
CREATE TABLE public.aap_events (
  id bigserial PRIMARY KEY,
  ad_id uuid NOT NULL REFERENCES public.aap_ads(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.aap_campaigns(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  surface aap_placement_surface,
  kind aap_event_kind NOT NULL,
  device text, country text,
  amount numeric(18,4),
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aap_events_ad_time ON public.aap_events(ad_id, created_at DESC);
CREATE INDEX aap_events_camp_time ON public.aap_events(campaign_id, created_at DESC);
GRANT SELECT, INSERT ON public.aap_events TO authenticated;
GRANT ALL ON public.aap_events TO service_role;
ALTER TABLE public.aap_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events insert" ON public.aap_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "events read" ON public.aap_events FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin());

CREATE TABLE public.aap_daily_rollups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL,
  ad_id uuid NOT NULL REFERENCES public.aap_ads(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.aap_campaigns(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  surface aap_placement_surface,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  conversions bigint NOT NULL DEFAULT 0,
  spend numeric(18,4) NOT NULL DEFAULT 0,
  revenue numeric(18,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day, ad_id, surface)
);
CREATE INDEX aap_rollup_camp_day ON public.aap_daily_rollups(campaign_id, day);
CREATE INDEX aap_rollup_adv_day ON public.aap_daily_rollups(advertiser_id, day);
GRANT SELECT ON public.aap_daily_rollups TO authenticated;
GRANT ALL ON public.aap_daily_rollups TO service_role;
ALTER TABLE public.aap_daily_rollups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rollup read" ON public.aap_daily_rollups FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin());

CREATE TABLE public.aap_conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL, kind text NOT NULL DEFAULT 'standard',
  spec jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_conversion_events TO authenticated;
GRANT ALL ON public.aap_conversion_events TO service_role;
ALTER TABLE public.aap_conversion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv adv" ON public.aap_conversion_events FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());

-- NOTIFICATIONS + AUDIT
CREATE TABLE public.aap_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL, title text NOT NULL, body text,
  data jsonb NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.aap_notifications TO authenticated;
GRANT ALL ON public.aap_notifications TO service_role;
ALTER TABLE public.aap_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif view own" ON public.aap_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (advertiser_id IS NOT NULL AND public.aap_is_advertiser_member(advertiser_id))
         OR public.aap_is_platform_admin());
CREATE POLICY "notif mark read" ON public.aap_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.aap_audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  advertiser_id uuid REFERENCES public.aap_advertisers(id) ON DELETE SET NULL,
  entity_type text NOT NULL, entity_id uuid,
  action text NOT NULL,
  before jsonb, after jsonb,
  ip inet, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aap_audit_entity_idx ON public.aap_audit_logs(entity_type, entity_id, created_at DESC);
GRANT SELECT, INSERT ON public.aap_audit_logs TO authenticated;
GRANT ALL ON public.aap_audit_logs TO service_role;
ALTER TABLE public.aap_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit view" ON public.aap_audit_logs FOR SELECT TO authenticated
  USING ((advertiser_id IS NOT NULL AND public.aap_is_advertiser_member(advertiser_id))
         OR public.aap_is_platform_admin());
CREATE POLICY "audit insert" ON public.aap_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- FUTURE-READY TABLES

CREATE TABLE public.aap_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.aap_campaigns(id) ON DELETE SET NULL,
  name text NOT NULL, hypothesis text,
  kind text NOT NULL DEFAULT 'ab',
  status text NOT NULL DEFAULT 'draft',
  started_at timestamptz, ended_at timestamptz,
  winner_variant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_experiment_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.aap_experiments(id) ON DELETE CASCADE,
  name text NOT NULL, allocation numeric(5,4) NOT NULL DEFAULT 0.5,
  spec jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_experiment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.aap_experiments(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.aap_experiment_variants(id) ON DELETE CASCADE,
  metric text NOT NULL, value numeric(18,4) NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_experiments, public.aap_experiment_variants, public.aap_experiment_results TO authenticated;
GRANT ALL ON public.aap_experiments, public.aap_experiment_variants, public.aap_experiment_results TO service_role;
ALTER TABLE public.aap_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_experiment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exp adv" ON public.aap_experiments FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());
CREATE POLICY "expv via exp" ON public.aap_experiment_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aap_experiments e WHERE e.id = experiment_id
                 AND (public.aap_is_advertiser_member(e.advertiser_id) OR public.aap_is_platform_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aap_experiments e WHERE e.id = experiment_id
                 AND (public.aap_can_edit_advertiser(e.advertiser_id) OR public.aap_is_platform_admin())));
CREATE POLICY "expr via exp" ON public.aap_experiment_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aap_experiments e WHERE e.id = experiment_id
                 AND (public.aap_is_advertiser_member(e.advertiser_id) OR public.aap_is_platform_admin())))
  WITH CHECK (public.aap_is_platform_admin());

CREATE TABLE public.aap_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL, trigger jsonb NOT NULL DEFAULT '{}',
  action jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.aap_automations(id) ON DELETE CASCADE,
  status text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz, output jsonb
);
CREATE TABLE public.aap_scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL, cron text, next_run_at timestamptz,
  advertiser_id uuid REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_automations, public.aap_automation_runs, public.aap_scheduled_jobs TO authenticated;
GRANT ALL ON public.aap_automations, public.aap_automation_runs, public.aap_scheduled_jobs TO service_role;
ALTER TABLE public.aap_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_scheduled_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autom adv" ON public.aap_automations FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());
CREATE POLICY "autom runs via" ON public.aap_automation_runs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aap_automations a WHERE a.id = automation_id
                 AND (public.aap_is_advertiser_member(a.advertiser_id) OR public.aap_is_platform_admin())));
CREATE POLICY "jobs eng" ON public.aap_scheduled_jobs FOR ALL TO authenticated
  USING (public.aap_is_engineering() OR public.aap_is_founder())
  WITH CHECK (public.aap_is_engineering() OR public.aap_is_founder());

CREATE TABLE public.aap_crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL, email text, phone text, source text,
  stage text NOT NULL DEFAULT 'new',
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL, email text, phone text, role text,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.aap_crm_leads(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.aap_crm_contacts(id) ON DELETE CASCADE,
  kind text NOT NULL, note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_crm_leads, public.aap_crm_contacts, public.aap_crm_activities TO authenticated;
GRANT ALL ON public.aap_crm_leads, public.aap_crm_contacts, public.aap_crm_activities TO service_role;
ALTER TABLE public.aap_crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm leads" ON public.aap_crm_leads FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());
CREATE POLICY "crm contacts" ON public.aap_crm_contacts FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());
CREATE POLICY "crm acts" ON public.aap_crm_activities FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());

CREATE TABLE public.aap_brand_safety_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'advertiser',
  rule jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_blocked_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_brand_safety_rules, public.aap_blocked_categories TO authenticated;
GRANT ALL ON public.aap_brand_safety_rules, public.aap_blocked_categories TO service_role;
ALTER TABLE public.aap_brand_safety_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_blocked_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bs" ON public.aap_brand_safety_rules FOR ALL TO authenticated
  USING (public.aap_is_platform_admin()
         OR (advertiser_id IS NOT NULL AND public.aap_is_advertiser_member(advertiser_id)))
  WITH CHECK (public.aap_is_platform_admin()
              OR (advertiser_id IS NOT NULL AND public.aap_can_edit_advertiser(advertiser_id)));
CREATE POLICY "bc" ON public.aap_blocked_categories FOR ALL TO authenticated
  USING (public.aap_is_platform_admin()
         OR (advertiser_id IS NOT NULL AND public.aap_is_advertiser_member(advertiser_id)))
  WITH CHECK (public.aap_is_platform_admin()
              OR (advertiser_id IS NOT NULL AND public.aap_can_edit_advertiser(advertiser_id)));

CREATE TABLE public.aap_fraud_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.aap_campaigns(id) ON DELETE CASCADE,
  kind text NOT NULL, severity text NOT NULL DEFAULT 'low',
  details jsonb NOT NULL DEFAULT '{}',
  detected_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  score numeric(5,2) NOT NULL,
  factors jsonb NOT NULL DEFAULT '{}',
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_fraud_events, public.aap_risk_scores TO authenticated;
GRANT ALL ON public.aap_fraud_events, public.aap_risk_scores TO service_role;
ALTER TABLE public.aap_fraud_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fraud admin" ON public.aap_fraud_events FOR SELECT TO authenticated USING (public.aap_is_platform_admin());
CREATE POLICY "risk admin" ON public.aap_risk_scores FOR SELECT TO authenticated USING (public.aap_is_platform_admin());

CREATE TABLE public.aap_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES public.aap_verifications(id) ON DELETE CASCADE,
  storage_path text NOT NULL, kind text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.aap_verifications, public.aap_verification_documents TO authenticated;
GRANT ALL ON public.aap_verifications, public.aap_verification_documents TO service_role;
ALTER TABLE public.aap_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_verification_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver" ON public.aap_verifications FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_reviewer())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_reviewer());
CREATE POLICY "verdoc" ON public.aap_verification_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aap_verifications v WHERE v.id = verification_id
                 AND (public.aap_is_advertiser_member(v.advertiser_id) OR public.aap_is_reviewer())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aap_verifications v WHERE v.id = verification_id
                 AND (public.aap_can_edit_advertiser(v.advertiser_id) OR public.aap_is_reviewer())));

CREATE TABLE public.aap_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL, hashed_key text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz, revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  url text NOT NULL, events text[] NOT NULL DEFAULT '{}',
  secret text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.aap_webhooks(id) ON DELETE CASCADE,
  event text NOT NULL, status int, response text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_api_keys, public.aap_webhooks, public.aap_webhook_deliveries TO authenticated;
GRANT ALL ON public.aap_api_keys, public.aap_webhooks, public.aap_webhook_deliveries TO service_role;
ALTER TABLE public.aap_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "keys adv" ON public.aap_api_keys FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_advertiser_role(advertiser_id) = 'advertiser_admin' OR public.aap_is_platform_admin());
CREATE POLICY "hooks adv" ON public.aap_webhooks FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());
CREATE POLICY "hook del" ON public.aap_webhook_deliveries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aap_webhooks w WHERE w.id = webhook_id
                 AND (public.aap_is_advertiser_member(w.advertiser_id) OR public.aap_is_platform_admin())));

CREATE TABLE public.aap_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE, is_enabled boolean NOT NULL DEFAULT false,
  rollout jsonb NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global',
  key text NOT NULL, value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scope, key)
);
CREATE TABLE public.aap_localization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL, namespace text NOT NULL, key text NOT NULL, value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(locale, namespace, key)
);
GRANT SELECT ON public.aap_feature_flags, public.aap_config, public.aap_localization TO authenticated;
GRANT ALL ON public.aap_feature_flags, public.aap_config, public.aap_localization TO service_role;
ALTER TABLE public.aap_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_localization ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ff read" ON public.aap_feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "ff write" ON public.aap_feature_flags FOR ALL TO authenticated
  USING (public.aap_is_engineering() OR public.aap_is_founder())
  WITH CHECK (public.aap_is_engineering() OR public.aap_is_founder());
CREATE POLICY "cfg read" ON public.aap_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "cfg write" ON public.aap_config FOR ALL TO authenticated
  USING (public.aap_is_finance() OR public.aap_is_engineering() OR public.aap_is_founder())
  WITH CHECK (public.aap_is_finance() OR public.aap_is_engineering() OR public.aap_is_founder());
CREATE POLICY "loc read" ON public.aap_localization FOR SELECT TO authenticated USING (true);
CREATE POLICY "loc write" ON public.aap_localization FOR ALL TO authenticated
  USING (public.aap_is_engineering() OR public.aap_is_founder())
  WITH CHECK (public.aap_is_engineering() OR public.aap_is_founder());

CREATE TABLE public.aap_kb_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, title text NOT NULL,
  content text NOT NULL, category text,
  is_public boolean NOT NULL DEFAULT true,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_kb_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id uuid NOT NULL REFERENCES public.aap_kb_docs(id) ON DELETE CASCADE,
  version int NOT NULL, content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_kb_docs, public.aap_kb_versions TO authenticated;
GRANT ALL ON public.aap_kb_docs, public.aap_kb_versions TO service_role;
ALTER TABLE public.aap_kb_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_kb_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb read" ON public.aap_kb_docs FOR SELECT TO authenticated USING (is_public OR public.aap_is_platform_admin());
CREATE POLICY "kb write" ON public.aap_kb_docs FOR ALL TO authenticated
  USING (public.aap_is_platform_admin()) WITH CHECK (public.aap_is_platform_admin());
CREATE POLICY "kbv read" ON public.aap_kb_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "kbv write" ON public.aap_kb_versions FOR ALL TO authenticated
  USING (public.aap_is_platform_admin()) WITH CHECK (public.aap_is_platform_admin());

CREATE TABLE public.aap_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  plan text NOT NULL, seats int NOT NULL DEFAULT 5,
  starts_at date NOT NULL, ends_at date,
  amount numeric(18,4) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.aap_licenses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  resource text NOT NULL, used bigint NOT NULL DEFAULT 0,
  quota bigint NOT NULL DEFAULT 0,
  period_start date, period_end date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(advertiser_id, resource, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_licenses, public.aap_seats, public.aap_quotas TO authenticated;
GRANT ALL ON public.aap_licenses, public.aap_seats, public.aap_quotas TO service_role;
ALTER TABLE public.aap_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lic" ON public.aap_licenses FOR ALL TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_finance())
  WITH CHECK (public.aap_is_finance() OR public.aap_is_founder());
CREATE POLICY "seats" ON public.aap_seats FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aap_licenses l WHERE l.id = license_id
                 AND (public.aap_is_advertiser_member(l.advertiser_id) OR public.aap_is_finance())))
  WITH CHECK (public.aap_is_finance() OR public.aap_is_founder());
CREATE POLICY "quotas read" ON public.aap_quotas FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin());
CREATE POLICY "quotas write" ON public.aap_quotas FOR ALL TO authenticated
  USING (public.aap_is_platform_admin()) WITH CHECK (public.aap_is_platform_admin());

CREATE TABLE public.aap_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL, spec jsonb NOT NULL,
  schedule text, last_run_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.aap_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.aap_reports(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  output_url text, started_at timestamptz DEFAULT now(), finished_at timestamptz
);
CREATE TABLE public.aap_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL, layout jsonb NOT NULL DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_reports, public.aap_report_runs, public.aap_dashboards TO authenticated;
GRANT ALL ON public.aap_reports, public.aap_report_runs, public.aap_dashboards TO service_role;
ALTER TABLE public.aap_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aap_dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rep" ON public.aap_reports FOR ALL TO authenticated
  USING (public.aap_is_platform_admin()
         OR (advertiser_id IS NOT NULL AND public.aap_is_advertiser_member(advertiser_id)))
  WITH CHECK (public.aap_is_platform_admin()
              OR (advertiser_id IS NOT NULL AND public.aap_can_edit_advertiser(advertiser_id)));
CREATE POLICY "rep runs" ON public.aap_report_runs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aap_reports r WHERE r.id = report_id
                 AND (public.aap_is_platform_admin()
                      OR (r.advertiser_id IS NOT NULL AND public.aap_is_advertiser_member(r.advertiser_id)))));
CREATE POLICY "dash" ON public.aap_dashboards FOR ALL TO authenticated
  USING (public.aap_is_platform_admin()
         OR (advertiser_id IS NOT NULL AND public.aap_is_advertiser_member(advertiser_id)))
  WITH CHECK (public.aap_is_platform_admin()
              OR (advertiser_id IS NOT NULL AND public.aap_can_edit_advertiser(advertiser_id)));

CREATE TABLE public.aap_backups_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL, status text NOT NULL, details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_backups_log TO authenticated;
GRANT ALL ON public.aap_backups_log TO service_role;
ALTER TABLE public.aap_backups_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bk admin" ON public.aap_backups_log FOR SELECT TO authenticated USING (public.aap_is_platform_admin());

CREATE TABLE public.aap_pacing_state (
  ad_id uuid PRIMARY KEY REFERENCES public.aap_ads(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_spend numeric(18,4) NOT NULL DEFAULT 0,
  window_impressions bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_pacing_state TO authenticated;
GRANT ALL ON public.aap_pacing_state TO service_role;
ALTER TABLE public.aap_pacing_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pacing admin" ON public.aap_pacing_state FOR SELECT TO authenticated USING (public.aap_is_platform_admin());

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'aap_advertisers','aap_advertiser_members','aap_billing_profiles','aap_wallets',
      'aap_invoices','aap_payments','aap_coupons','aap_tax_profiles',
      'aap_asset_folders','aap_assets','aap_creatives','aap_audiences','aap_placements','aap_placement_configs',
      'aap_campaigns','aap_ad_groups','aap_ads','aap_review_queue','aap_appeals','aap_policy_refs',
      'aap_daily_rollups','aap_conversion_events','aap_experiments','aap_automations','aap_scheduled_jobs',
      'aap_crm_leads','aap_crm_contacts','aap_brand_safety_rules','aap_verifications',
      'aap_webhooks','aap_feature_flags','aap_config','aap_localization','aap_kb_docs',
      'aap_licenses','aap_reports','aap_dashboards'
    ])
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

-- Seed placements & policies
INSERT INTO public.aap_placements (surface, display_name, supported_formats) VALUES
  ('feed','Feed', ARRAY['image','video','carousel','feed']::aap_ad_format[]),
  ('reels','Reels', ARRAY['video','reels']::aap_ad_format[]),
  ('stories','Stories', ARRAY['image','video','story']::aap_ad_format[]),
  ('explore','Explore', ARRAY['image','video']::aap_ad_format[]),
  ('profile','Profile', ARRAY['image','sponsored_profile']::aap_ad_format[]),
  ('organization','Organization pages', ARRAY['image','sponsored_organization']::aap_ad_format[])
ON CONFLICT (surface) DO NOTHING;

INSERT INTO public.aap_policy_refs (code, title, severity) VALUES
  ('POLICY_HATE','Hate speech','high'),
  ('POLICY_ADULT','Adult / sexual content','high'),
  ('POLICY_VIOLENCE','Violence or gore','high'),
  ('POLICY_MISLEADING','Misleading or deceptive claims','medium'),
  ('POLICY_TRADEMARK','Trademark violation','medium'),
  ('POLICY_LOW_QUALITY','Low-quality creative','low')
ON CONFLICT (code) DO NOTHING;
