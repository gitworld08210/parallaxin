
-- 1. Pacing + frequency cap columns on ad groups
ALTER TABLE public.aap_ad_groups
  ADD COLUMN IF NOT EXISTS pacing_type text NOT NULL DEFAULT 'standard' CHECK (pacing_type IN ('standard','accelerated')),
  ADD COLUMN IF NOT EXISTS daily_impression_cap integer,
  ADD COLUMN IF NOT EXISTS frequency_cap_per_user integer,
  ADD COLUMN IF NOT EXISTS frequency_cap_window_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS auto_paused_reason text,
  ADD COLUMN IF NOT EXISTS auto_paused_at timestamptz;

-- 2. Lookalike seed on audiences
ALTER TABLE public.aap_audiences
  ADD COLUMN IF NOT EXISTS lookalike_seed_audience_id uuid REFERENCES public.aap_audiences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lookalike_similarity numeric CHECK (lookalike_similarity IS NULL OR (lookalike_similarity > 0 AND lookalike_similarity <= 1)),
  ADD COLUMN IF NOT EXISTS audience_type text NOT NULL DEFAULT 'custom' CHECK (audience_type IN ('custom','lookalike','retargeting','saved'));

-- 3. Reach estimator (rough heuristic on profiles + targeting json)
CREATE OR REPLACE FUNCTION public.aap_estimate_reach(_targeting jsonb)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base bigint;
  min_age int := COALESCE((_targeting->>'min_age')::int, 13);
  max_age int := COALESCE((_targeting->>'max_age')::int, 65);
  genders text[] := CASE WHEN jsonb_typeof(_targeting->'genders') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(_targeting->'genders')) ELSE ARRAY[]::text[] END;
  interests text[] := CASE WHEN jsonb_typeof(_targeting->'interests') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(_targeting->'interests')) ELSE ARRAY[]::text[] END;
  locations text[] := CASE WHEN jsonb_typeof(_targeting->'locations') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(_targeting->'locations')) ELSE ARRAY[]::text[] END;
  factor numeric := 1.0;
BEGIN
  SELECT count(*) INTO base FROM public.profiles;
  -- Age band factor: proportion of ~60yr window covered
  factor := factor * GREATEST(0.1, LEAST(1.0, (max_age - min_age + 1)::numeric / 60));
  IF array_length(genders,1) IS NOT NULL AND array_length(genders,1) < 3 THEN
    factor := factor * (array_length(genders,1)::numeric / 3);
  END IF;
  IF array_length(interests,1) IS NOT NULL THEN
    factor := factor * GREATEST(0.05, LEAST(0.9, 1.0 / (1 + array_length(interests,1))));
  END IF;
  IF array_length(locations,1) IS NOT NULL THEN
    factor := factor * GREATEST(0.05, LEAST(0.9, array_length(locations,1)::numeric / 20));
  END IF;
  RETURN GREATEST(50, (COALESCE(base,0) * factor)::bigint);
END;
$$;

REVOKE ALL ON FUNCTION public.aap_estimate_reach(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_estimate_reach(jsonb) TO authenticated, service_role;

-- 4. Frequency + daily cap check (used by ad-serving layer)
CREATE OR REPLACE FUNCTION public.aap_can_serve_ad(_ad_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g record;
  ad_status text;
  user_impressions int;
  window_impressions int;
BEGIN
  SELECT ag.*, a.status::text AS ad_status
    INTO g
    FROM public.aap_ads a
    JOIN public.aap_ad_groups ag ON ag.id = a.ad_group_id
   WHERE a.id = _ad_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF g.status::text <> 'active' OR g.ad_status <> 'active' THEN RETURN false; END IF;

  IF g.daily_impression_cap IS NOT NULL THEN
    SELECT COALESCE(sum(impressions),0) INTO window_impressions
      FROM public.aap_pacing_state
     WHERE ad_id IN (SELECT id FROM public.aap_ads WHERE ad_group_id = g.id)
       AND window_start >= date_trunc('day', now());
    IF window_impressions >= g.daily_impression_cap THEN RETURN false; END IF;
  END IF;

  IF g.frequency_cap_per_user IS NOT NULL AND _user_id IS NOT NULL THEN
    SELECT count(*) INTO user_impressions
      FROM public.aap_events
     WHERE ad_id = _ad_id
       AND user_id = _user_id
       AND event_type = 'impression'
       AND created_at >= now() - make_interval(hours => g.frequency_cap_window_hours);
    IF user_impressions >= g.frequency_cap_per_user THEN RETURN false; END IF;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.aap_can_serve_ad(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_can_serve_ad(uuid, uuid) TO authenticated, service_role, anon;

-- 5. Auto-pause ad groups when daily caps are hit (extends rollup path)
CREATE OR REPLACE FUNCTION public.aap_enforce_ad_group_caps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g record;
  today_spend numeric;
  today_impr bigint;
BEGIN
  SELECT ag.* INTO g FROM public.aap_ad_groups ag WHERE ag.id = NEW.ad_group_id;
  IF NOT FOUND OR g.status::text <> 'active' THEN RETURN NEW; END IF;

  SELECT COALESCE(sum(spend),0), COALESCE(sum(impressions),0)
    INTO today_spend, today_impr
    FROM public.aap_daily_rollups
   WHERE ad_group_id = g.id AND date = current_date;

  IF g.daily_budget IS NOT NULL AND today_spend >= g.daily_budget THEN
    UPDATE public.aap_ad_groups
       SET status = 'paused', auto_paused_reason = 'daily_budget_reached', auto_paused_at = now()
     WHERE id = g.id;
  ELSIF g.daily_impression_cap IS NOT NULL AND today_impr >= g.daily_impression_cap THEN
    UPDATE public.aap_ad_groups
       SET status = 'paused', auto_paused_reason = 'daily_impression_cap_reached', auto_paused_at = now()
     WHERE id = g.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aap_enforce_ad_group_caps_trg ON public.aap_daily_rollups;
CREATE TRIGGER aap_enforce_ad_group_caps_trg
AFTER INSERT OR UPDATE ON public.aap_daily_rollups
FOR EACH ROW EXECUTE FUNCTION public.aap_enforce_ad_group_caps();
