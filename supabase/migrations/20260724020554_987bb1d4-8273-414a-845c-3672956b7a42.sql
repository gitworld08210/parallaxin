-- API key hardening
ALTER TABLE public.aap_api_keys
  ADD COLUMN IF NOT EXISTS rate_limit_per_min int NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS hash_algo text NOT NULL DEFAULT 'sha256';

CREATE OR REPLACE FUNCTION public.aap_lock_api_key_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.advertiser_id := OLD.advertiser_id;
  NEW.key_prefix := OLD.key_prefix;
  NEW.hashed_key := OLD.hashed_key;
  NEW.hash_algo := OLD.hash_algo;
  NEW.created_at := OLD.created_at;
  NEW.created_by := OLD.created_by;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_aap_lock_api_key ON public.aap_api_keys;
CREATE TRIGGER trg_aap_lock_api_key BEFORE UPDATE ON public.aap_api_keys
FOR EACH ROW EXECUTE FUNCTION public.aap_lock_api_key_fields();

-- Webhook enrichments
ALTER TABLE public.aap_webhooks
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_failure_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_count int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.aap_default_webhook_secret()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.secret IS NULL OR NEW.secret = '' THEN
    NEW.secret := 'whsec_' || encode(gen_random_bytes(24), 'hex');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_aap_default_webhook_secret ON public.aap_webhooks;
CREATE TRIGGER trg_aap_default_webhook_secret BEFORE INSERT ON public.aap_webhooks
FOR EACH ROW EXECUTE FUNCTION public.aap_default_webhook_secret();

ALTER TABLE public.aap_webhook_deliveries
  ADD COLUMN IF NOT EXISTS attempt int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS duration_ms int,
  ADD COLUMN IF NOT EXISTS payload jsonb;

-- Outbox queue for events awaiting webhook dispatch
CREATE TABLE IF NOT EXISTS public.aap_events_outbox (
  id bigserial PRIMARY KEY,
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aap_outbox_pending ON public.aap_events_outbox(next_attempt_at) WHERE delivered_at IS NULL;
GRANT ALL ON public.aap_events_outbox TO service_role;
GRANT USAGE, SELECT ON SEQUENCE aap_events_outbox_id_seq TO service_role;
ALTER TABLE public.aap_events_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outbox admin read" ON public.aap_events_outbox FOR SELECT TO authenticated
  USING (public.aap_is_platform_admin());

-- Enqueue helper
CREATE OR REPLACE FUNCTION public.aap_enqueue_event(p_advertiser_id uuid, p_event text, p_payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id bigint;
BEGIN
  INSERT INTO public.aap_events_outbox (advertiser_id, event, payload)
  VALUES (p_advertiser_id, p_event, COALESCE(p_payload, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.aap_enqueue_event(uuid, text, jsonb) TO service_role;

-- Emit outbox events on key domain changes
CREATE OR REPLACE FUNCTION public.aap_emit_campaign_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.aap_enqueue_event(NEW.advertiser_id, 'campaign.created',
      jsonb_build_object('campaign_id', NEW.id, 'status', NEW.status, 'name', NEW.name));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.aap_enqueue_event(NEW.advertiser_id, 'campaign.status_changed',
      jsonb_build_object('campaign_id', NEW.id, 'from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_aap_emit_campaign ON public.aap_campaigns;
CREATE TRIGGER trg_aap_emit_campaign AFTER INSERT OR UPDATE ON public.aap_campaigns
FOR EACH ROW EXECUTE FUNCTION public.aap_emit_campaign_event();

CREATE OR REPLACE FUNCTION public.aap_emit_ad_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.aap_enqueue_event(NEW.advertiser_id, 'ad.created',
      jsonb_build_object('ad_id', NEW.id, 'ad_group_id', NEW.ad_group_id, 'status', NEW.status));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.aap_enqueue_event(NEW.advertiser_id, 'ad.status_changed',
      jsonb_build_object('ad_id', NEW.id, 'from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_aap_emit_ad ON public.aap_ads;
CREATE TRIGGER trg_aap_emit_ad AFTER INSERT OR UPDATE ON public.aap_ads
FOR EACH ROW EXECUTE FUNCTION public.aap_emit_ad_event();

CREATE OR REPLACE FUNCTION public.aap_emit_attribution_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.touch_kind <> 'unattributed' THEN
    PERFORM public.aap_enqueue_event(NEW.advertiser_id, 'conversion.attributed',
      jsonb_build_object(
        'attribution_id', NEW.id, 'event_code', NEW.event_code,
        'campaign_id', NEW.campaign_id, 'ad_id', NEW.ad_id,
        'value', NEW.value, 'currency', NEW.currency, 'touch', NEW.touch_kind
      ));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_aap_emit_attribution ON public.aap_attributions;
CREATE TRIGGER trg_aap_emit_attribution AFTER INSERT ON public.aap_attributions
FOR EACH ROW EXECUTE FUNCTION public.aap_emit_attribution_event();

-- API key issuance (SECURITY DEFINER; caller must be advertiser admin)
CREATE OR REPLACE FUNCTION public.aap_issue_api_key(
  p_advertiser_id uuid, p_name text, p_scopes text[], p_expires_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_raw text;
  v_prefix text;
  v_hash text;
  v_id uuid;
BEGIN
  IF NOT (public.aap_advertiser_role(p_advertiser_id) = 'advertiser_admin' OR public.aap_is_platform_admin()) THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  v_raw := 'aak_live_' || encode(gen_random_bytes(24), 'hex');
  v_prefix := substring(v_raw from 1 for 14);
  v_hash := encode(extensions.digest(v_raw, 'sha256'), 'hex');
  INSERT INTO public.aap_api_keys (advertiser_id, name, key_prefix, hashed_key, scopes, expires_at, created_by)
  VALUES (p_advertiser_id, p_name, v_prefix, v_hash, COALESCE(p_scopes, ARRAY['read']), p_expires_at, auth.uid())
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'key_prefix', v_prefix, 'secret', v_raw);
END $$;
GRANT EXECUTE ON FUNCTION public.aap_issue_api_key(uuid, text, text[], timestamptz) TO authenticated;

-- Verify raw API key at gateway (service_role only)
CREATE OR REPLACE FUNCTION public.aap_verify_api_key(p_raw text)
RETURNS TABLE(api_key_id uuid, advertiser_id uuid, scopes text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_hash text;
BEGIN
  v_hash := encode(extensions.digest(p_raw, 'sha256'), 'hex');
  RETURN QUERY
  UPDATE public.aap_api_keys
     SET last_used_at = now()
   WHERE hashed_key = v_hash
     AND revoked_at IS NULL
     AND (expires_at IS NULL OR expires_at > now())
  RETURNING id, aap_api_keys.advertiser_id, aap_api_keys.scopes;
END $$;
REVOKE ALL ON FUNCTION public.aap_verify_api_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_verify_api_key(text) TO service_role;

-- Batch fetch for webhook worker (service_role only)
CREATE OR REPLACE FUNCTION public.aap_claim_outbox_batch(p_limit int DEFAULT 50)
RETURNS SETOF public.aap_events_outbox
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.aap_events_outbox
     SET attempts = attempts + 1,
         next_attempt_at = now() + interval '5 minutes'
   WHERE id IN (
     SELECT id FROM public.aap_events_outbox
      WHERE delivered_at IS NULL
        AND next_attempt_at <= now()
        AND attempts < 8
      ORDER BY id
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
   )
   RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.aap_claim_outbox_batch(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_claim_outbox_batch(int) TO service_role;

CREATE OR REPLACE FUNCTION public.aap_mark_outbox_delivered(p_id bigint)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.aap_events_outbox SET delivered_at = now() WHERE id = p_id;
$$;
GRANT EXECUTE ON FUNCTION public.aap_mark_outbox_delivered(bigint) TO service_role;

-- Ensure pgcrypto's digest is available
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;