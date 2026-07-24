
DO $$ BEGIN
  ALTER TABLE public.aap_experiments
    ADD CONSTRAINT aap_experiments_winner_fk
    FOREIGN KEY (winner_variant_id) REFERENCES public.aap_experiment_variants(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.aap_assign_variant(_experiment_id uuid, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  h numeric; cum numeric := 0; total numeric := 0; v RECORD; last_id uuid;
BEGIN
  h := (('x' || substr(md5(_experiment_id::text || ':' || coalesce(_user_id::text,'anon')),1,8))::bit(32)::bigint)::numeric / 4294967295.0;
  SELECT COALESCE(SUM(allocation),0) INTO total FROM public.aap_experiment_variants WHERE experiment_id = _experiment_id;
  IF total <= 0 THEN RETURN NULL; END IF;
  FOR v IN SELECT id, allocation FROM public.aap_experiment_variants WHERE experiment_id = _experiment_id ORDER BY created_at ASC LOOP
    cum := cum + (v.allocation / total);
    last_id := v.id;
    IF h <= cum THEN RETURN v.id; END IF;
  END LOOP;
  RETURN last_id;
END $$;
REVOKE ALL ON FUNCTION public.aap_assign_variant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_assign_variant(uuid, uuid) TO authenticated, service_role, anon;

CREATE OR REPLACE FUNCTION public.aap_experiment_summary(_experiment_id uuid)
RETURNS TABLE(variant_id uuid, variant_name text, metric text, total_value numeric, sample_size bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id, v.name, r.metric,
         COALESCE(SUM(r.value),0)::numeric AS total_value,
         COUNT(r.id)::bigint AS sample_size
  FROM public.aap_experiment_variants v
  LEFT JOIN public.aap_experiment_results r ON r.variant_id = v.id
  WHERE v.experiment_id = _experiment_id
  GROUP BY v.id, v.name, r.metric
  ORDER BY total_value DESC NULLS LAST
$$;
REVOKE ALL ON FUNCTION public.aap_experiment_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_experiment_summary(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.aap_promote_experiment_winner(_experiment_id uuid, _metric text DEFAULT 'conversions')
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE adv uuid; win uuid;
BEGIN
  SELECT advertiser_id INTO adv FROM public.aap_experiments WHERE id = _experiment_id;
  IF adv IS NULL THEN RAISE EXCEPTION 'experiment not found'; END IF;
  IF NOT (public.aap_can_edit_advertiser(adv) OR public.aap_is_platform_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT v.id INTO win
  FROM public.aap_experiment_variants v
  LEFT JOIN public.aap_experiment_results r ON r.variant_id = v.id AND r.metric = _metric
  WHERE v.experiment_id = _experiment_id
  GROUP BY v.id
  ORDER BY COALESCE(SUM(r.value),0) DESC, v.created_at ASC
  LIMIT 1;
  UPDATE public.aap_experiments
     SET winner_variant_id = win, status = 'completed', ended_at = now(), updated_at = now()
   WHERE id = _experiment_id;
  RETURN win;
END $$;
REVOKE ALL ON FUNCTION public.aap_promote_experiment_winner(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_promote_experiment_winner(uuid, text) TO authenticated, service_role;

ALTER TABLE public.aap_ad_groups ADD COLUMN IF NOT EXISTS blocked_categories text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.aap_ad_groups ADD COLUMN IF NOT EXISTS blocked_keywords   text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.aap_ad_groups ADD COLUMN IF NOT EXISTS min_content_rating text;

CREATE OR REPLACE FUNCTION public.aap_brand_safety_check(_ad_id uuid, _context jsonb)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  adv_id uuid; ag_cats text[]; ag_kws text[]; cats text[];
  ctx_cat text; ctx_txt text; bad text;
BEGIN
  SELECT c.advertiser_id, ag.blocked_categories, ag.blocked_keywords
    INTO adv_id, ag_cats, ag_kws
  FROM public.aap_ads a
  JOIN public.aap_ad_groups ag ON ag.id = a.ad_group_id
  JOIN public.aap_campaigns c ON c.id = ag.campaign_id
  WHERE a.id = _ad_id;
  IF adv_id IS NULL THEN RETURN false; END IF;

  SELECT COALESCE(array_agg(DISTINCT category), '{}') INTO cats
  FROM (
    SELECT unnest(COALESCE(ag_cats,'{}'::text[])) AS category
    UNION
    SELECT category FROM public.aap_blocked_categories WHERE advertiser_id = adv_id
  ) s;

  ctx_cat := lower(coalesce(_context->>'category',''));
  ctx_txt := lower(coalesce(_context->>'text',''));

  IF ctx_cat <> '' AND EXISTS (SELECT 1 FROM unnest(cats) c WHERE lower(c) = ctx_cat) THEN
    RETURN false;
  END IF;

  IF ctx_txt <> '' AND ag_kws IS NOT NULL THEN
    FOREACH bad IN ARRAY ag_kws LOOP
      IF bad IS NOT NULL AND bad <> '' AND position(lower(bad) in ctx_txt) > 0 THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.aap_brand_safety_check(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_brand_safety_check(uuid, jsonb) TO authenticated, service_role, anon;

CREATE OR REPLACE FUNCTION public.aap_can_serve_ad_ctx(_ad_id uuid, _user_id uuid, _context jsonb)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.aap_can_serve_ad(_ad_id, _user_id)
     AND public.aap_brand_safety_check(_ad_id, _context)
$$;
REVOKE ALL ON FUNCTION public.aap_can_serve_ad_ctx(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_can_serve_ad_ctx(uuid, uuid, jsonb) TO authenticated, service_role, anon;
