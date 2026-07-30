-- ============ Saved views ============
CREATE TABLE public.aap_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  level text NOT NULL DEFAULT 'campaign',
  is_shared boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_saved_views TO authenticated;
GRANT ALL ON public.aap_saved_views TO service_role;
ALTER TABLE public.aap_saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved views read" ON public.aap_saved_views FOR SELECT TO authenticated
  USING ((public.aap_is_advertiser_member(advertiser_id) AND (is_shared OR user_id = auth.uid())) OR public.aap_is_platform_admin());
CREATE POLICY "saved views write" ON public.aap_saved_views FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.aap_is_advertiser_member(advertiser_id))
  WITH CHECK (user_id = auth.uid() AND public.aap_is_advertiser_member(advertiser_id));
CREATE INDEX aap_saved_views_adv_idx ON public.aap_saved_views (advertiser_id, level);
CREATE TRIGGER trg_aap_saved_views_updated BEFORE UPDATE ON public.aap_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Column presets ============
CREATE TABLE public.aap_column_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_column_presets TO authenticated;
GRANT ALL ON public.aap_column_presets TO service_role;
ALTER TABLE public.aap_column_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "column presets own" ON public.aap_column_presets FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.aap_is_advertiser_member(advertiser_id))
  WITH CHECK (user_id = auth.uid() AND public.aap_is_advertiser_member(advertiser_id));
CREATE TRIGGER trg_aap_column_presets_updated BEFORE UPDATE ON public.aap_column_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Automated rules ============
CREATE TABLE public.aap_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'ad_group',
  scope_ids uuid[] NOT NULL DEFAULT '{}',
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  action text NOT NULL DEFAULT 'pause',
  action_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  lookback_days integer NOT NULL DEFAULT 3,
  frequency text NOT NULL DEFAULT 'daily',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_rules TO authenticated;
GRANT ALL ON public.aap_rules TO service_role;
ALTER TABLE public.aap_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules read" ON public.aap_rules FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin());
CREATE POLICY "rules write" ON public.aap_rules FOR ALL TO authenticated
  USING (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());
CREATE TRIGGER trg_aap_rules_updated BEFORE UPDATE ON public.aap_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.aap_rule_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.aap_rules(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  matched_count integer NOT NULL DEFAULT 0,
  affected jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'ok',
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_rule_runs TO authenticated;
GRANT ALL ON public.aap_rule_runs TO service_role;
ALTER TABLE public.aap_rule_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rule runs read" ON public.aap_rule_runs FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin());
CREATE INDEX aap_rule_runs_rule_idx ON public.aap_rule_runs (rule_id, created_at DESC);

-- ============ Recommendations ============
CREATE TABLE public.aap_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  entity_level text NOT NULL DEFAULT 'campaign',
  entity_id uuid,
  kind text NOT NULL,
  title text NOT NULL,
  detail text,
  impact_score numeric(6,2) NOT NULL DEFAULT 0,
  suggested_action jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'new',
  model text,
  applied_by uuid,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.aap_recommendations TO authenticated;
GRANT ALL ON public.aap_recommendations TO service_role;
ALTER TABLE public.aap_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recs read" ON public.aap_recommendations FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin());
CREATE POLICY "recs update" ON public.aap_recommendations FOR UPDATE TO authenticated
  USING (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());
CREATE INDEX aap_recs_adv_idx ON public.aap_recommendations (advertiser_id, state, impact_score DESC);
CREATE TRIGGER trg_aap_recs_updated BEFORE UPDATE ON public.aap_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Reporting aggregate ============
CREATE OR REPLACE FUNCTION public.aap_report_rows(
  _advertiser_id uuid,
  _level text,
  _from date,
  _to date,
  _parent_id uuid DEFAULT NULL
)
RETURNS TABLE (
  entity_id uuid,
  impressions bigint,
  clicks bigint,
  conversions bigint,
  spend numeric,
  revenue numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE _level
      WHEN 'campaign' THEN r.campaign_id
      WHEN 'ad_group' THEN a.ad_group_id
      ELSE r.ad_id
    END AS entity_id,
    SUM(r.impressions)::bigint,
    SUM(r.clicks)::bigint,
    SUM(r.conversions)::bigint,
    SUM(r.spend)::numeric,
    SUM(r.revenue)::numeric
  FROM public.aap_daily_rollups r
  JOIN public.aap_ads a ON a.id = r.ad_id
  WHERE r.advertiser_id = _advertiser_id
    AND r.day >= _from AND r.day <= _to
    AND (public.aap_is_advertiser_member(_advertiser_id) OR public.aap_is_platform_admin())
    AND (
      _parent_id IS NULL
      OR (_level = 'ad_group' AND r.campaign_id = _parent_id)
      OR (_level = 'ad' AND a.ad_group_id = _parent_id)
    )
  GROUP BY 1
$$;
GRANT EXECUTE ON FUNCTION public.aap_report_rows(uuid, text, date, date, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.aap_report_timeseries(
  _advertiser_id uuid,
  _from date,
  _to date,
  _entity_level text DEFAULT 'account',
  _entity_id uuid DEFAULT NULL
)
RETURNS TABLE (
  day date,
  impressions bigint,
  clicks bigint,
  conversions bigint,
  spend numeric,
  revenue numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.day,
    SUM(r.impressions)::bigint,
    SUM(r.clicks)::bigint,
    SUM(r.conversions)::bigint,
    SUM(r.spend)::numeric,
    SUM(r.revenue)::numeric
  FROM public.aap_daily_rollups r
  JOIN public.aap_ads a ON a.id = r.ad_id
  WHERE r.advertiser_id = _advertiser_id
    AND r.day >= _from AND r.day <= _to
    AND (public.aap_is_advertiser_member(_advertiser_id) OR public.aap_is_platform_admin())
    AND (
      _entity_id IS NULL
      OR (_entity_level = 'campaign' AND r.campaign_id = _entity_id)
      OR (_entity_level = 'ad_group' AND a.ad_group_id = _entity_id)
      OR (_entity_level = 'ad' AND r.ad_id = _entity_id)
    )
  GROUP BY r.day
  ORDER BY r.day
$$;
GRANT EXECUTE ON FUNCTION public.aap_report_timeseries(uuid, date, date, text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.aap_report_breakdown(
  _advertiser_id uuid,
  _from date,
  _to date,
  _entity_level text DEFAULT 'account',
  _entity_id uuid DEFAULT NULL
)
RETURNS TABLE (
  surface text,
  impressions bigint,
  clicks bigint,
  conversions bigint,
  spend numeric,
  revenue numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(r.surface::text, 'unknown'),
    SUM(r.impressions)::bigint,
    SUM(r.clicks)::bigint,
    SUM(r.conversions)::bigint,
    SUM(r.spend)::numeric,
    SUM(r.revenue)::numeric
  FROM public.aap_daily_rollups r
  JOIN public.aap_ads a ON a.id = r.ad_id
  WHERE r.advertiser_id = _advertiser_id
    AND r.day >= _from AND r.day <= _to
    AND (public.aap_is_advertiser_member(_advertiser_id) OR public.aap_is_platform_admin())
    AND (
      _entity_id IS NULL
      OR (_entity_level = 'campaign' AND r.campaign_id = _entity_id)
      OR (_entity_level = 'ad_group' AND a.ad_group_id = _entity_id)
      OR (_entity_level = 'ad' AND r.ad_id = _entity_id)
    )
  GROUP BY 1
  ORDER BY 5 DESC
$$;
GRANT EXECUTE ON FUNCTION public.aap_report_breakdown(uuid, date, date, text, uuid) TO authenticated, service_role;