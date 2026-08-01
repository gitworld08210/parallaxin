-- ============ ADS PLATFORM v2 ============

CREATE TABLE public.ads_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  business_type text NOT NULL DEFAULT 'individual',
  website text,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ads_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.ads_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'analyst' CHECK (role IN ('owner','admin','analyst')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, user_id)
);

CREATE TABLE public.ads_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.ads_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  objective text NOT NULL DEFAULT 'traffic'
    CHECK (objective IN ('awareness','traffic','engagement','leads','app_installs','conversions')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','archived')),
  budget_type text NOT NULL DEFAULT 'daily' CHECK (budget_type IN ('daily','lifetime')),
  budget_coins integer NOT NULL DEFAULT 0 CHECK (budget_coins >= 0),
  start_at timestamptz,
  end_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ads_adsets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.ads_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  daily_budget_coins integer NOT NULL DEFAULT 0 CHECK (daily_budget_coins >= 0),
  optimization_goal text NOT NULL DEFAULT 'reach'
    CHECK (optimization_goal IN ('reach','impressions','link_clicks','video_views','conversions')),
  bid_strategy text NOT NULL DEFAULT 'lowest_cost'
    CHECK (bid_strategy IN ('lowest_cost','cost_cap','bid_cap')),
  bid_cap_coins integer,
  placement_mode text NOT NULL DEFAULT 'auto' CHECK (placement_mode IN ('auto','manual')),
  placements text[] NOT NULL DEFAULT ARRAY['reels','stories','feed','explore']::text[],
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_reach bigint NOT NULL DEFAULT 0,
  schedule_start timestamptz,
  schedule_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ads_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.ads_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  storage_path text NOT NULL,
  aspect_ratio text NOT NULL DEFAULT '9:16',
  width integer,
  height integer,
  duration_seconds numeric,
  file_size_bytes bigint,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ads_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adset_id uuid NOT NULL REFERENCES public.ads_adsets(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.ads_accounts(id) ON DELETE CASCADE,
  creative_id uuid REFERENCES public.ads_creatives(id) ON DELETE SET NULL,
  name text NOT NULL,
  headline text,
  primary_text text,
  cta text NOT NULL DEFAULT 'learn_more',
  destination_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  review_state text NOT NULL DEFAULT 'pending' CHECK (review_state IN ('pending','in_review','approved','rejected')),
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ads_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ads_ads(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('approved','rejected')),
  reason text,
  reviewer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ads_daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.ads_accounts(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
  adset_id uuid REFERENCES public.ads_adsets(id) ON DELETE CASCADE,
  ad_id uuid REFERENCES public.ads_ads(id) ON DELETE CASCADE,
  stat_date date NOT NULL,
  placement text NOT NULL,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  conversions bigint NOT NULL DEFAULT 0,
  spend_coins bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ad_id, stat_date, placement)
);

CREATE TABLE public.ads_invoice_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.ads_accounts(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','rejected')),
  requested_by uuid,
  handled_by uuid,
  sent_to_email text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ads_payment_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  upi_id text,
  payee_name text,
  qr_storage_path text,
  instructions text,
  coins_per_inr numeric NOT NULL DEFAULT 1,
  min_topup_inr integer NOT NULL DEFAULT 500,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ads_payment_settings (id) VALUES (true);

-- indexes
CREATE INDEX idx_ads_members_user ON public.ads_members(user_id);
CREATE INDEX idx_ads_campaigns_account ON public.ads_campaigns(account_id);
CREATE INDEX idx_ads_adsets_campaign ON public.ads_adsets(campaign_id);
CREATE INDEX idx_ads_ads_adset ON public.ads_ads(adset_id);
CREATE INDEX idx_ads_ads_review ON public.ads_ads(review_state);
CREATE INDEX idx_ads_stats_account_date ON public.ads_daily_stats(account_id, stat_date);
CREATE INDEX idx_ads_creatives_account ON public.ads_creatives(account_id);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_adsets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_creatives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_ads TO authenticated;
GRANT SELECT, INSERT ON public.ads_reviews TO authenticated;
GRANT SELECT ON public.ads_daily_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ads_invoice_requests TO authenticated;
GRANT SELECT, UPDATE ON public.ads_payment_settings TO authenticated;
GRANT ALL ON public.ads_accounts, public.ads_members, public.ads_campaigns, public.ads_adsets,
  public.ads_creatives, public.ads_ads, public.ads_reviews, public.ads_daily_stats,
  public.ads_invoice_requests, public.ads_payment_settings TO service_role;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.ads_is_member(_account_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ads_members m
    WHERE m.account_id = _account_id AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.ads_can_manage(_account_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ads_members m
    WHERE m.account_id = _account_id AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.ads_is_reviewer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_trust_safety_staff(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.ads_is_finance()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_finance_staff(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.ads_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_ads_accounts_touch BEFORE UPDATE ON public.ads_accounts
  FOR EACH ROW EXECUTE FUNCTION public.ads_touch_updated_at();
CREATE TRIGGER trg_ads_campaigns_touch BEFORE UPDATE ON public.ads_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.ads_touch_updated_at();
CREATE TRIGGER trg_ads_adsets_touch BEFORE UPDATE ON public.ads_adsets
  FOR EACH ROW EXECUTE FUNCTION public.ads_touch_updated_at();
CREATE TRIGGER trg_ads_ads_touch BEFORE UPDATE ON public.ads_ads
  FOR EACH ROW EXECUTE FUNCTION public.ads_touch_updated_at();
CREATE TRIGGER trg_ads_invreq_touch BEFORE UPDATE ON public.ads_invoice_requests
  FOR EACH ROW EXECUTE FUNCTION public.ads_touch_updated_at();

-- owner auto-membership
CREATE OR REPLACE FUNCTION public.ads_seed_owner_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ads_members (account_id, user_id, role)
  VALUES (NEW.id, NEW.owner_user_id, 'owner')
  ON CONFLICT (account_id, user_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_ads_seed_owner AFTER INSERT ON public.ads_accounts
  FOR EACH ROW EXECUTE FUNCTION public.ads_seed_owner_member();

-- ============ RLS ============
ALTER TABLE public.ads_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_adsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_invoice_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_payment_settings ENABLE ROW LEVEL SECURITY;

-- accounts
CREATE POLICY ads_accounts_select ON public.ads_accounts FOR SELECT TO authenticated
  USING (public.ads_is_member(id) OR public.ads_is_finance() OR public.ads_is_reviewer());
CREATE POLICY ads_accounts_insert ON public.ads_accounts FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY ads_accounts_update ON public.ads_accounts FOR UPDATE TO authenticated
  USING (public.ads_can_manage(id) OR public.ads_is_finance())
  WITH CHECK (public.ads_can_manage(id) OR public.ads_is_finance());

-- members
CREATE POLICY ads_members_select ON public.ads_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.ads_can_manage(account_id) OR public.ads_is_finance());
CREATE POLICY ads_members_write ON public.ads_members FOR INSERT TO authenticated
  WITH CHECK (public.ads_can_manage(account_id));
CREATE POLICY ads_members_update ON public.ads_members FOR UPDATE TO authenticated
  USING (public.ads_can_manage(account_id)) WITH CHECK (public.ads_can_manage(account_id));
CREATE POLICY ads_members_delete ON public.ads_members FOR DELETE TO authenticated
  USING (public.ads_can_manage(account_id));

-- campaigns
CREATE POLICY ads_campaigns_select ON public.ads_campaigns FOR SELECT TO authenticated
  USING (public.ads_is_member(account_id) OR public.ads_is_finance() OR public.ads_is_reviewer());
CREATE POLICY ads_campaigns_insert ON public.ads_campaigns FOR INSERT TO authenticated
  WITH CHECK (public.ads_can_manage(account_id));
CREATE POLICY ads_campaigns_update ON public.ads_campaigns FOR UPDATE TO authenticated
  USING (public.ads_can_manage(account_id)) WITH CHECK (public.ads_can_manage(account_id));
CREATE POLICY ads_campaigns_delete ON public.ads_campaigns FOR DELETE TO authenticated
  USING (public.ads_can_manage(account_id));

-- adsets
CREATE POLICY ads_adsets_select ON public.ads_adsets FOR SELECT TO authenticated
  USING (public.ads_is_member(account_id) OR public.ads_is_finance() OR public.ads_is_reviewer());
CREATE POLICY ads_adsets_insert ON public.ads_adsets FOR INSERT TO authenticated
  WITH CHECK (public.ads_can_manage(account_id));
CREATE POLICY ads_adsets_update ON public.ads_adsets FOR UPDATE TO authenticated
  USING (public.ads_can_manage(account_id)) WITH CHECK (public.ads_can_manage(account_id));
CREATE POLICY ads_adsets_delete ON public.ads_adsets FOR DELETE TO authenticated
  USING (public.ads_can_manage(account_id));

-- creatives
CREATE POLICY ads_creatives_select ON public.ads_creatives FOR SELECT TO authenticated
  USING (public.ads_is_member(account_id) OR public.ads_is_reviewer());
CREATE POLICY ads_creatives_insert ON public.ads_creatives FOR INSERT TO authenticated
  WITH CHECK (public.ads_can_manage(account_id));
CREATE POLICY ads_creatives_update ON public.ads_creatives FOR UPDATE TO authenticated
  USING (public.ads_can_manage(account_id)) WITH CHECK (public.ads_can_manage(account_id));
CREATE POLICY ads_creatives_delete ON public.ads_creatives FOR DELETE TO authenticated
  USING (public.ads_can_manage(account_id));

-- ads
CREATE POLICY ads_ads_select ON public.ads_ads FOR SELECT TO authenticated
  USING (public.ads_is_member(account_id) OR public.ads_is_finance() OR public.ads_is_reviewer());
CREATE POLICY ads_ads_insert ON public.ads_ads FOR INSERT TO authenticated
  WITH CHECK (public.ads_can_manage(account_id));
CREATE POLICY ads_ads_update ON public.ads_ads FOR UPDATE TO authenticated
  USING (public.ads_can_manage(account_id) OR public.ads_is_reviewer())
  WITH CHECK (public.ads_can_manage(account_id) OR public.ads_is_reviewer());
CREATE POLICY ads_ads_delete ON public.ads_ads FOR DELETE TO authenticated
  USING (public.ads_can_manage(account_id));

-- reviews
CREATE POLICY ads_reviews_select ON public.ads_reviews FOR SELECT TO authenticated
  USING (public.ads_is_reviewer() OR EXISTS (
    SELECT 1 FROM public.ads_ads a WHERE a.id = ad_id AND public.ads_is_member(a.account_id)));
CREATE POLICY ads_reviews_insert ON public.ads_reviews FOR INSERT TO authenticated
  WITH CHECK (public.ads_is_reviewer());

-- stats
CREATE POLICY ads_stats_select ON public.ads_daily_stats FOR SELECT TO authenticated
  USING (public.ads_is_member(account_id) OR public.ads_is_finance());

-- invoice requests
CREATE POLICY ads_invreq_select ON public.ads_invoice_requests FOR SELECT TO authenticated
  USING (public.ads_is_member(account_id) OR public.ads_is_finance());
CREATE POLICY ads_invreq_insert ON public.ads_invoice_requests FOR INSERT TO authenticated
  WITH CHECK (public.ads_can_manage(account_id) AND requested_by = auth.uid());
CREATE POLICY ads_invreq_update ON public.ads_invoice_requests FOR UPDATE TO authenticated
  USING (public.ads_is_finance()) WITH CHECK (public.ads_is_finance());

-- payment settings
CREATE POLICY ads_paysettings_select ON public.ads_payment_settings FOR SELECT TO authenticated
  USING (true);
CREATE POLICY ads_paysettings_update ON public.ads_payment_settings FOR UPDATE TO authenticated
  USING (public.ads_is_finance()) WITH CHECK (public.ads_is_finance());