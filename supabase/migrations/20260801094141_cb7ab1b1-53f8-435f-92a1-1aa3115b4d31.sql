-- storage: ads-creatives
CREATE POLICY "ads_creatives_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ads-creatives' AND (
    public.ads_is_reviewer()
    OR public.ads_is_member(NULLIF(split_part(name, '/', 1), '')::uuid)
  )
);

CREATE POLICY "ads_creatives_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ads-creatives'
  AND public.ads_can_manage(NULLIF(split_part(name, '/', 1), '')::uuid)
);

CREATE POLICY "ads_creatives_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ads-creatives'
  AND public.ads_can_manage(NULLIF(split_part(name, '/', 1), '')::uuid)
);

-- storage: ads-payments (QR)
CREATE POLICY "ads_payments_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ads-payments');

CREATE POLICY "ads_payments_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ads-payments' AND public.ads_is_finance());

CREATE POLICY "ads_payments_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ads-payments' AND public.ads_is_finance())
WITH CHECK (bucket_id = 'ads-payments' AND public.ads_is_finance());

CREATE POLICY "ads_payments_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ads-payments' AND public.ads_is_finance());

-- reach estimator
CREATE OR REPLACE FUNCTION public.ads_estimate_reach(_targeting jsonb, _placements text[])
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base bigint;
  factor numeric := 1.0;
  age_min int := COALESCE((_targeting->>'age_min')::int, 13);
  age_max int := COALESCE((_targeting->>'age_max')::int, 65);
  genders text[] := COALESCE(ARRAY(SELECT jsonb_array_elements_text(_targeting->'genders')), ARRAY[]::text[]);
  locations text[] := COALESCE(ARRAY(SELECT jsonb_array_elements_text(_targeting->'locations')), ARRAY[]::text[]);
  interests text[] := COALESCE(ARRAY(SELECT jsonb_array_elements_text(_targeting->'interests')), ARRAY[]::text[]);
BEGIN
  SELECT GREATEST(COUNT(*), 1000) INTO base FROM public.profiles;

  factor := factor * LEAST(1.0, GREATEST(0.08, (age_max - age_min)::numeric / 52.0));
  IF array_length(genders, 1) IS NOT NULL AND array_length(genders, 1) < 3 THEN
    factor := factor * (0.34 * array_length(genders, 1));
  END IF;
  IF array_length(locations, 1) IS NOT NULL AND array_length(locations, 1) > 0 THEN
    factor := factor * LEAST(1.0, 0.12 * array_length(locations, 1));
  END IF;
  IF array_length(interests, 1) IS NOT NULL AND array_length(interests, 1) > 0 THEN
    factor := factor * LEAST(1.0, 0.18 * array_length(interests, 1) + 0.1);
  END IF;
  IF _placements IS NOT NULL AND array_length(_placements, 1) IS NOT NULL THEN
    factor := factor * LEAST(1.0, 0.3 * array_length(_placements, 1));
  END IF;

  RETURN GREATEST(500, (base * factor * 12)::bigint);
END $$;

REVOKE EXECUTE ON FUNCTION public.ads_estimate_reach(jsonb, text[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ads_estimate_reach(jsonb, text[]) TO authenticated, service_role;

-- account summary
CREATE OR REPLACE FUNCTION public.ads_account_summary(_account_id uuid, _from date, _to date)
RETURNS TABLE (
  impressions bigint, clicks bigint, conversions bigint, spend_coins bigint,
  ctr numeric, cpm numeric, cpc numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.ads_is_member(_account_id) OR public.ads_is_finance()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH t AS (
    SELECT COALESCE(SUM(s.impressions),0)::bigint imp,
           COALESCE(SUM(s.clicks),0)::bigint clk,
           COALESCE(SUM(s.conversions),0)::bigint conv,
           COALESCE(SUM(s.spend_coins),0)::bigint sp
    FROM public.ads_daily_stats s
    WHERE s.account_id = _account_id AND s.stat_date BETWEEN _from AND _to
  )
  SELECT t.imp, t.clk, t.conv, t.sp,
    CASE WHEN t.imp > 0 THEN ROUND(t.clk::numeric * 100 / t.imp, 2) ELSE 0 END,
    CASE WHEN t.imp > 0 THEN ROUND(t.sp::numeric * 1000 / t.imp, 2) ELSE 0 END,
    CASE WHEN t.clk > 0 THEN ROUND(t.sp::numeric / t.clk, 2) ELSE 0 END
  FROM t;
END $$;

REVOKE EXECUTE ON FUNCTION public.ads_account_summary(uuid, date, date) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ads_account_summary(uuid, date, date) TO authenticated, service_role;