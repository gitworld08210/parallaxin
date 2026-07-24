
-- Auto-enqueue ads into review queue when submitted
CREATE OR REPLACE FUNCTION public.aap_enqueue_ad_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending_review' AND (OLD.status IS DISTINCT FROM 'pending_review') THEN
    INSERT INTO public.aap_review_queue (ad_id, advertiser_id, state, priority, submitted_at)
    VALUES (NEW.id, NEW.advertiser_id, 'pending', 5, now())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_aap_enqueue_ad_review ON public.aap_ads;
CREATE TRIGGER trg_aap_enqueue_ad_review
AFTER INSERT OR UPDATE OF status ON public.aap_ads
FOR EACH ROW EXECUTE FUNCTION public.aap_enqueue_ad_review();

-- Apply review decision back to ad + rollups
CREATE OR REPLACE FUNCTION public.aap_apply_review_decision()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.decision = 'approved' THEN
    UPDATE public.aap_ads
       SET status = 'approved', review_state = 'approved', approved_at = now()
     WHERE id = NEW.ad_id;
  ELSIF NEW.decision = 'rejected' THEN
    UPDATE public.aap_ads
       SET status = 'rejected', review_state = 'rejected', rejected_at = now()
     WHERE id = NEW.ad_id;
  ELSIF NEW.decision = 'need_changes' THEN
    UPDATE public.aap_ads
       SET status = 'draft', review_state = 'need_changes'
     WHERE id = NEW.ad_id;
  END IF;

  UPDATE public.aap_review_queue
     SET state = NEW.decision, resolved_at = now(), updated_at = now()
   WHERE id = NEW.review_id;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_aap_apply_review_decision ON public.aap_review_decisions;
CREATE TRIGGER trg_aap_apply_review_decision
AFTER INSERT ON public.aap_review_decisions
FOR EACH ROW EXECUTE FUNCTION public.aap_apply_review_decision();

-- Roll each event into daily aggregates + wallet spend
CREATE OR REPLACE FUNCTION public.aap_apply_event_rollup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d date := (NEW.created_at AT TIME ZONE 'UTC')::date;
  amt numeric := COALESCE(NEW.amount, 0);
BEGIN
  INSERT INTO public.aap_daily_rollups
    (day, ad_id, campaign_id, advertiser_id, surface,
     impressions, clicks, conversions, spend, revenue)
  VALUES
    (d, NEW.ad_id, NEW.campaign_id, NEW.advertiser_id, NEW.surface,
     CASE WHEN NEW.kind = 'impression' THEN 1 ELSE 0 END,
     CASE WHEN NEW.kind = 'click' THEN 1 ELSE 0 END,
     CASE WHEN NEW.kind = 'conversion' THEN 1 ELSE 0 END,
     amt, 0)
  ON CONFLICT (day, ad_id, surface) DO UPDATE SET
     impressions = aap_daily_rollups.impressions + EXCLUDED.impressions,
     clicks      = aap_daily_rollups.clicks      + EXCLUDED.clicks,
     conversions = aap_daily_rollups.conversions + EXCLUDED.conversions,
     spend       = aap_daily_rollups.spend       + EXCLUDED.spend,
     updated_at  = now();

  IF amt > 0 THEN
    UPDATE public.aap_campaigns
       SET spent = COALESCE(spent, 0) + amt, updated_at = now()
     WHERE id = NEW.campaign_id;

    UPDATE public.aap_wallets
       SET balance = balance - amt, updated_at = now()
     WHERE advertiser_id = NEW.advertiser_id;

    INSERT INTO public.aap_wallet_ledger
      (wallet_id, advertiser_id, direction, amount, reason, reference_type, reference_id)
    SELECT w.id, NEW.advertiser_id, 'debit', amt, NEW.kind::text, 'aap_ad', NEW.ad_id
      FROM public.aap_wallets w WHERE w.advertiser_id = NEW.advertiser_id;
  END IF;

  RETURN NEW;
END; $$;

CREATE UNIQUE INDEX IF NOT EXISTS aap_daily_rollups_unique
  ON public.aap_daily_rollups (day, ad_id, surface);

DROP TRIGGER IF EXISTS trg_aap_apply_event_rollup ON public.aap_events;
CREATE TRIGGER trg_aap_apply_event_rollup
AFTER INSERT ON public.aap_events
FOR EACH ROW EXECUTE FUNCTION public.aap_apply_event_rollup();
