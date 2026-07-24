CREATE TABLE IF NOT EXISTS public.aap_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL,
  domain text,
  secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_event_at timestamptz
);
CREATE INDEX IF NOT EXISTS aap_pixels_adv ON public.aap_pixels(advertiser_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aap_pixels TO authenticated;
GRANT ALL ON public.aap_pixels TO service_role;
ALTER TABLE public.aap_pixels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pixel read" ON public.aap_pixels FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin());
CREATE POLICY "pixel manage" ON public.aap_pixels FOR ALL TO authenticated
  USING (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin())
  WITH CHECK (public.aap_can_edit_advertiser(advertiser_id) OR public.aap_is_platform_admin());

CREATE OR REPLACE FUNCTION public.aap_lock_pixel_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.advertiser_id := OLD.advertiser_id;
  NEW.secret := OLD.secret;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_aap_lock_pixel ON public.aap_pixels;
CREATE TRIGGER trg_aap_lock_pixel BEFORE UPDATE ON public.aap_pixels
FOR EACH ROW EXECUTE FUNCTION public.aap_lock_pixel_fields();

ALTER TABLE public.aap_conversion_events
  ADD COLUMN IF NOT EXISTS pixel_id uuid REFERENCES public.aap_pixels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_code text,
  ADD COLUMN IF NOT EXISTS default_value numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';

ALTER TABLE public.aap_ad_groups
  ADD COLUMN IF NOT EXISTS attribution_click_days smallint NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS attribution_view_days  smallint NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.aap_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  pixel_id uuid REFERENCES public.aap_pixels(id) ON DELETE SET NULL,
  conversion_event_id uuid REFERENCES public.aap_conversion_events(id) ON DELETE SET NULL,
  event_code text NOT NULL,
  external_event_id text,
  campaign_id uuid REFERENCES public.aap_campaigns(id) ON DELETE SET NULL,
  ad_group_id uuid REFERENCES public.aap_ad_groups(id) ON DELETE SET NULL,
  ad_id uuid REFERENCES public.aap_ads(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  touch_kind text,
  touch_event_id bigint,
  value numeric(18,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  meta jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pixel_id, external_event_id)
);
CREATE INDEX IF NOT EXISTS aap_attr_adv_time ON public.aap_attributions(advertiser_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS aap_attr_camp_time ON public.aap_attributions(campaign_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS aap_attr_ad_time ON public.aap_attributions(ad_id, occurred_at DESC);
GRANT SELECT ON public.aap_attributions TO authenticated;
GRANT ALL ON public.aap_attributions TO service_role;
ALTER TABLE public.aap_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attr read" ON public.aap_attributions FOR SELECT TO authenticated
  USING (public.aap_is_advertiser_member(advertiser_id) OR public.aap_is_platform_admin());

CREATE OR REPLACE FUNCTION public.aap_ingest_conversion(
  p_pixel_id uuid,
  p_secret text,
  p_event_code text,
  p_external_event_id text,
  p_user_id uuid,
  p_value numeric,
  p_currency text,
  p_meta jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pixel public.aap_pixels%ROWTYPE;
  v_conv public.aap_conversion_events%ROWTYPE;
  v_touch record;
  v_touch_kind text := 'unattributed';
  v_value numeric(18,4) := COALESCE(p_value, 0);
  v_attr_id uuid;
  v_dedup uuid;
BEGIN
  SELECT * INTO v_pixel FROM public.aap_pixels WHERE id = p_pixel_id;
  IF NOT FOUND OR NOT v_pixel.is_active OR v_pixel.secret <> p_secret THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_pixel');
  END IF;

  IF p_external_event_id IS NOT NULL THEN
    SELECT id INTO v_dedup FROM public.aap_attributions
      WHERE pixel_id = p_pixel_id AND external_event_id = p_external_event_id;
    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'deduped', true, 'attribution_id', v_dedup);
    END IF;
  END IF;

  SELECT * INTO v_conv FROM public.aap_conversion_events
    WHERE advertiser_id = v_pixel.advertiser_id
      AND (event_code = p_event_code OR name = p_event_code)
      AND is_active
    ORDER BY (event_code = p_event_code) DESC
    LIMIT 1;

  IF v_conv.default_value > 0 AND v_value = 0 THEN
    v_value := v_conv.default_value;
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT e.id, e.ad_id, e.campaign_id, e.created_at, ad.ad_group_id
      INTO v_touch
      FROM public.aap_events e
      JOIN public.aap_ads ad ON ad.id = e.ad_id
      LEFT JOIN public.aap_ad_groups ag ON ag.id = ad.ad_group_id
      WHERE e.advertiser_id = v_pixel.advertiser_id
        AND e.user_id = p_user_id
        AND e.kind = 'click'
        AND e.created_at >= now() - (COALESCE(ag.attribution_click_days, 7) || ' days')::interval
      ORDER BY e.created_at DESC
      LIMIT 1;

    IF FOUND THEN
      v_touch_kind := 'click';
    ELSE
      SELECT e.id, e.ad_id, e.campaign_id, e.created_at, ad.ad_group_id
        INTO v_touch
        FROM public.aap_events e
        JOIN public.aap_ads ad ON ad.id = e.ad_id
        LEFT JOIN public.aap_ad_groups ag ON ag.id = ad.ad_group_id
        WHERE e.advertiser_id = v_pixel.advertiser_id
          AND e.user_id = p_user_id
          AND e.kind IN ('impression','view')
          AND e.created_at >= now() - (COALESCE(ag.attribution_view_days, 1) || ' days')::interval
        ORDER BY e.created_at DESC
        LIMIT 1;
      IF FOUND THEN v_touch_kind := 'view'; END IF;
    END IF;
  END IF;

  IF v_touch_kind <> 'unattributed' THEN
    INSERT INTO public.aap_events (ad_id, campaign_id, advertiser_id, user_id, kind, amount, meta)
    VALUES (v_touch.ad_id, v_touch.campaign_id, v_pixel.advertiser_id, p_user_id, 'conversion', v_value,
            jsonb_build_object('pixel_id', p_pixel_id, 'event_code', p_event_code, 'touch', v_touch_kind));
  END IF;

  INSERT INTO public.aap_attributions (
    advertiser_id, pixel_id, conversion_event_id, event_code, external_event_id,
    campaign_id, ad_group_id, ad_id, user_id, touch_kind, touch_event_id,
    value, currency, meta
  ) VALUES (
    v_pixel.advertiser_id, p_pixel_id, v_conv.id, p_event_code, p_external_event_id,
    v_touch.campaign_id, v_touch.ad_group_id, v_touch.ad_id, p_user_id,
    v_touch_kind, v_touch.id, v_value, COALESCE(p_currency, 'INR'), COALESCE(p_meta, '{}'::jsonb)
  ) RETURNING id INTO v_attr_id;

  UPDATE public.aap_pixels SET last_event_at = now() WHERE id = p_pixel_id;

  RETURN jsonb_build_object(
    'ok', true,
    'attribution_id', v_attr_id,
    'touch_kind', v_touch_kind,
    'value', v_value
  );
END $$;

REVOKE ALL ON FUNCTION public.aap_ingest_conversion(uuid, text, text, text, uuid, numeric, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_ingest_conversion(uuid, text, text, text, uuid, numeric, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.aap_attribution_summary(p_advertiser_id uuid, p_days int DEFAULT 30)
RETURNS TABLE (
  event_code text,
  total_conversions bigint,
  click_conversions bigint,
  view_conversions bigint,
  unattributed bigint,
  total_value numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    event_code,
    COUNT(*) FILTER (WHERE touch_kind <> 'unattributed')::bigint,
    COUNT(*) FILTER (WHERE touch_kind = 'click')::bigint,
    COUNT(*) FILTER (WHERE touch_kind = 'view')::bigint,
    COUNT(*) FILTER (WHERE touch_kind = 'unattributed')::bigint,
    COALESCE(SUM(value), 0)
  FROM public.aap_attributions
  WHERE advertiser_id = p_advertiser_id
    AND (public.aap_is_advertiser_member(p_advertiser_id) OR public.aap_is_platform_admin())
    AND occurred_at >= now() - (p_days || ' days')::interval
  GROUP BY event_code
  ORDER BY 2 DESC;
$$;
GRANT EXECUTE ON FUNCTION public.aap_attribution_summary(uuid, int) TO authenticated;