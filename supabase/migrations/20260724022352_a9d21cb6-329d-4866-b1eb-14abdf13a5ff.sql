
INSERT INTO public.admin_permissions(permission_key, name, module, description) VALUES
  ('aap.credit.review',  'Credit review',   'ads-finance', 'Review advertiser credit applications (L1)'),
  ('aap.credit.approve', 'Credit approve',  'ads-finance', 'Approve advertiser credit and set credit limit (L2)'),
  ('aap.credit.manage',  'Credit manage',   'ads-finance', 'Manage postpaid accounts, deposits, dunning, collections'),
  ('aap.ledger.read',    'Ledger read',     'ads-finance', 'Read the immutable financial ledger')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.admin_role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
  ('finance_l1','aap.credit.review'),
  ('finance_l1','aap.credit.manage'),
  ('finance_l1','aap.ledger.read'),
  ('finance_l2','aap.credit.review'),
  ('finance_l2','aap.credit.approve'),
  ('finance_l2','aap.credit.manage'),
  ('finance_l2','aap.ledger.read'),
  ('founder','aap.credit.approve'),
  ('founder','aap.ledger.read'),
  ('co_founder','aap.ledger.read')
) AS x(role_key, permission_key)
JOIN public.admin_roles r ON r.key = x.role_key
JOIN public.admin_permissions p ON p.permission_key = x.permission_key
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.aap_postpaid_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL UNIQUE REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','suspended','closed')),
  credit_limit numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  currency text NOT NULL DEFAULT 'INR',
  billing_cycle text NOT NULL DEFAULT '30d' CHECK (billing_cycle IN ('weekly','15d','30d','custom')),
  custom_cycle_days integer,
  tax_rate numeric(5,2) NOT NULL DEFAULT 18.00,
  tax_id text,
  payment_method text NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer','upi','wire','cheque','autopay')),
  autopay_enabled boolean NOT NULL DEFAULT false,
  security_deposit numeric(14,2) NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  terms_accepted_at timestamptz,
  billing_agreement_ref text,
  approved_by uuid,
  approved_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_postpaid_accounts TO authenticated;
GRANT ALL ON public.aap_postpaid_accounts TO service_role;
ALTER TABLE public.aap_postpaid_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "postpaid_member_read" ON public.aap_postpaid_accounts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.aap_advertiser_members m WHERE m.advertiser_id = aap_postpaid_accounts.advertiser_id AND m.user_id = auth.uid())
    OR public.has_admin_permission(auth.uid(),'aap.credit.manage')
  );
CREATE POLICY "postpaid_finance_write" ON public.aap_postpaid_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_admin_permission(auth.uid(),'aap.credit.manage'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_admin_permission(auth.uid(),'aap.credit.manage'));

CREATE TABLE IF NOT EXISTS public.aap_credit_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  requested_limit numeric(14,2) NOT NULL CHECK (requested_limit > 0),
  requested_cycle text NOT NULL DEFAULT '30d',
  currency text NOT NULL DEFAULT 'INR',
  reason text,
  supporting_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected','withdrawn')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_limit numeric(14,2),
  approved_cycle text,
  risk_level text,
  security_deposit numeric(14,2) DEFAULT 0,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.aap_credit_applications TO authenticated;
GRANT ALL ON public.aap_credit_applications TO service_role;
ALTER TABLE public.aap_credit_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_app_read" ON public.aap_credit_applications FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.aap_advertiser_members m WHERE m.advertiser_id = aap_credit_applications.advertiser_id AND m.user_id = auth.uid() AND m.role = 'advertiser_admin')
    OR public.has_admin_permission(auth.uid(),'aap.credit.review')
    OR public.has_admin_permission(auth.uid(),'aap.credit.approve')
  );
CREATE POLICY "credit_app_owner_insert" ON public.aap_credit_applications FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.aap_advertiser_members m WHERE m.advertiser_id = aap_credit_applications.advertiser_id AND m.user_id = auth.uid() AND m.role = 'advertiser_admin')
  );
CREATE POLICY "credit_app_finance_write" ON public.aap_credit_applications FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(),'aap.credit.review') OR public.has_admin_permission(auth.uid(),'aap.credit.approve'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'aap.credit.review') OR public.has_admin_permission(auth.uid(),'aap.credit.approve'));

CREATE TABLE IF NOT EXISTS public.aap_security_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('hold','release','recover','refund')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  reason text,
  invoice_id uuid REFERENCES public.aap_invoices(id),
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_security_deposits TO authenticated;
GRANT ALL ON public.aap_security_deposits TO service_role;
ALTER TABLE public.aap_security_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deposits_read" ON public.aap_security_deposits FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.aap_advertiser_members m WHERE m.advertiser_id = aap_security_deposits.advertiser_id AND m.user_id = auth.uid())
    OR public.has_admin_permission(auth.uid(),'aap.credit.manage')
  );
CREATE POLICY "deposits_finance_write" ON public.aap_security_deposits FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'aap.credit.approve') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'aap.credit.approve') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.aap_credit_scores (
  advertiser_id uuid PRIMARY KEY REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 500 CHECK (score BETWEEN 0 AND 1000),
  band text NOT NULL DEFAULT 'medium' CHECK (band IN ('excellent','good','medium','poor','blocked')),
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendation text CHECK (recommendation IN ('increase','decrease','freeze','manual_review','no_change')),
  recommended_limit numeric(14,2),
  recomputed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_credit_scores TO authenticated;
GRANT ALL ON public.aap_credit_scores TO service_role;
ALTER TABLE public.aap_credit_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "score_read" ON public.aap_credit_scores FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.aap_advertiser_members m WHERE m.advertiser_id = aap_credit_scores.advertiser_id AND m.user_id = auth.uid())
    OR public.has_admin_permission(auth.uid(),'aap.credit.review')
    OR public.has_admin_permission(auth.uid(),'aap.credit.approve')
  );
CREATE POLICY "score_finance_write" ON public.aap_credit_scores FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'aap.credit.manage') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'aap.credit.manage') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.aap_risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','low','medium','high','critical')),
  probability numeric(5,4),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_risk_events TO authenticated;
GRANT ALL ON public.aap_risk_events TO service_role;
ALTER TABLE public.aap_risk_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_finance_all" ON public.aap_risk_events FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'aap.credit.manage') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'aap.credit.manage') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.aap_dunning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.aap_invoices(id) ON DELETE CASCADE,
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('reminder_1','reminder_2','warning','pause','suspend','credit_block','legal_review')),
  scheduled_at timestamptz NOT NULL,
  executed_at timestamptz,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_dunning_events TO authenticated;
GRANT ALL ON public.aap_dunning_events TO service_role;
ALTER TABLE public.aap_dunning_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dunning_finance_all" ON public.aap_dunning_events FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'aap.credit.manage') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'aap.credit.manage') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.aap_collections_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.aap_advertisers(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.aap_invoices(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','settled','bad_debt','legal','closed')),
  outstanding_amount numeric(14,2) NOT NULL DEFAULT 0,
  recovery_amount numeric(14,2) NOT NULL DEFAULT 0,
  settlement_offer numeric(14,2),
  assigned_to uuid,
  notes text,
  legal_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_collections_cases TO authenticated;
GRANT ALL ON public.aap_collections_cases TO service_role;
ALTER TABLE public.aap_collections_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections_finance_all" ON public.aap_collections_cases FOR ALL TO authenticated
  USING (public.has_admin_permission(auth.uid(),'aap.credit.manage') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_admin_permission(auth.uid(),'aap.credit.manage') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.aap_financial_ledger (
  id bigserial PRIMARY KEY,
  advertiser_id uuid REFERENCES public.aap_advertisers(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  amount numeric(14,2),
  currency text DEFAULT 'INR',
  reference_type text,
  reference_id uuid,
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aap_financial_ledger TO authenticated;
GRANT ALL ON public.aap_financial_ledger TO service_role;
ALTER TABLE public.aap_financial_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_read" ON public.aap_financial_ledger FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(),'aap.ledger.read') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.aap_ledger_immutable_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'aap_financial_ledger is append-only'; END; $$;
DROP TRIGGER IF EXISTS trg_ledger_no_update ON public.aap_financial_ledger;
CREATE TRIGGER trg_ledger_no_update BEFORE UPDATE OR DELETE ON public.aap_financial_ledger
  FOR EACH ROW EXECUTE FUNCTION public.aap_ledger_immutable_guard();

CREATE OR REPLACE FUNCTION public.aap_log_financial_event(
  _advertiser_id uuid, _event text, _amount numeric, _currency text,
  _ref_type text, _ref_id uuid, _payload jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.aap_financial_ledger(advertiser_id,event_type,amount,currency,reference_type,reference_id,actor_id,payload)
  VALUES (_advertiser_id,_event,_amount,COALESCE(_currency,'INR'),_ref_type,_ref_id,auth.uid(),COALESCE(_payload,'{}'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.aap_log_financial_event(uuid,text,numeric,text,text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_log_financial_event(uuid,text,numeric,text,text,uuid,jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.aap_trg_invoice_ledger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO public.aap_financial_ledger(advertiser_id,event_type,amount,currency,reference_type,reference_id,payload)
      VALUES (NEW.advertiser_id,'invoice_created',NEW.total,NEW.currency,'invoice',NEW.id,jsonb_build_object('number',NEW.invoice_number,'status',NEW.status));
  ELSIF TG_OP='UPDATE' AND OLD.status <> NEW.status THEN
    INSERT INTO public.aap_financial_ledger(advertiser_id,event_type,amount,currency,reference_type,reference_id,payload)
      VALUES (NEW.advertiser_id,'invoice_'||NEW.status,NEW.total,NEW.currency,'invoice',NEW.id,jsonb_build_object('from',OLD.status,'to',NEW.status));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_aap_invoice_ledger ON public.aap_invoices;
CREATE TRIGGER trg_aap_invoice_ledger AFTER INSERT OR UPDATE ON public.aap_invoices
  FOR EACH ROW EXECUTE FUNCTION public.aap_trg_invoice_ledger();

CREATE OR REPLACE FUNCTION public.aap_trg_payment_ledger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO public.aap_financial_ledger(advertiser_id,event_type,amount,reference_type,reference_id,payload)
      VALUES (NEW.advertiser_id,'payment_'||NEW.status,NEW.amount,'payment',NEW.id,jsonb_build_object('method',NEW.method,'utr',NEW.utr));
  ELSIF TG_OP='UPDATE' AND OLD.status <> NEW.status THEN
    INSERT INTO public.aap_financial_ledger(advertiser_id,event_type,amount,reference_type,reference_id,payload)
      VALUES (NEW.advertiser_id,'payment_'||NEW.status,NEW.amount,'payment',NEW.id,jsonb_build_object('from',OLD.status,'to',NEW.status));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_aap_payment_ledger ON public.aap_payments;
CREATE TRIGGER trg_aap_payment_ledger AFTER INSERT OR UPDATE ON public.aap_payments
  FOR EACH ROW EXECUTE FUNCTION public.aap_trg_payment_ledger();

CREATE OR REPLACE FUNCTION public.aap_trg_postpaid_ledger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO public.aap_financial_ledger(advertiser_id,event_type,amount,reference_type,reference_id,payload)
      VALUES (NEW.advertiser_id,'postpaid_approved',NEW.credit_limit,'postpaid_account',NEW.id,jsonb_build_object('cycle',NEW.billing_cycle,'risk',NEW.risk_level));
  ELSIF TG_OP='UPDATE' THEN
    IF OLD.credit_limit <> NEW.credit_limit THEN
      INSERT INTO public.aap_financial_ledger(advertiser_id,event_type,amount,reference_type,reference_id,payload)
        VALUES (NEW.advertiser_id, CASE WHEN NEW.credit_limit>OLD.credit_limit THEN 'credit_limit_increased' ELSE 'credit_limit_reduced' END, NEW.credit_limit,'postpaid_account',NEW.id,jsonb_build_object('from',OLD.credit_limit,'to',NEW.credit_limit));
    END IF;
    IF OLD.status <> NEW.status THEN
      INSERT INTO public.aap_financial_ledger(advertiser_id,event_type,amount,reference_type,reference_id,payload)
        VALUES (NEW.advertiser_id,'postpaid_'||NEW.status,NULL,'postpaid_account',NEW.id,jsonb_build_object('from',OLD.status,'to',NEW.status));
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_aap_postpaid_ledger ON public.aap_postpaid_accounts;
CREATE TRIGGER trg_aap_postpaid_ledger AFTER INSERT OR UPDATE ON public.aap_postpaid_accounts
  FOR EACH ROW EXECUTE FUNCTION public.aap_trg_postpaid_ledger();

CREATE OR REPLACE FUNCTION public.aap_postpaid_credit_status(_advertiser_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mode text; v_limit numeric := 0; v_currency text := 'INR';
  v_wallet numeric := 0; v_outstanding numeric := 0; v_current_cycle numeric := 0;
  v_available numeric := 0; v_status text := 'active';
BEGIN
  SELECT billing_mode::text INTO v_mode FROM public.aap_advertisers WHERE id = _advertiser_id;
  SELECT COALESCE(balance,0), currency INTO v_wallet, v_currency FROM public.aap_wallets WHERE advertiser_id = _advertiser_id LIMIT 1;
  IF v_mode = 'postpaid_invoice' THEN
    SELECT credit_limit, status INTO v_limit, v_status FROM public.aap_postpaid_accounts WHERE advertiser_id = _advertiser_id;
    SELECT COALESCE(SUM(total),0) INTO v_outstanding FROM public.aap_invoices WHERE advertiser_id = _advertiser_id AND status IN ('issued','overdue');
    SELECT COALESCE(SUM(spent),0) INTO v_current_cycle FROM public.aap_campaigns WHERE advertiser_id = _advertiser_id;
    v_available := GREATEST(COALESCE(v_limit,0) - (COALESCE(v_outstanding,0) + GREATEST(COALESCE(v_current_cycle,0) - COALESCE(v_wallet,0),0)), 0);
  ELSE
    v_available := GREATEST(v_wallet,0);
  END IF;
  RETURN jsonb_build_object(
    'mode',v_mode,'status',v_status,'currency',v_currency,
    'wallet_balance',v_wallet,'credit_limit',v_limit,
    'outstanding',v_outstanding,'current_cycle_spend',v_current_cycle,
    'available_credit',v_available,
    'over_limit',(v_mode='postpaid_invoice' AND v_available<=0)
  );
END; $$;
REVOKE ALL ON FUNCTION public.aap_postpaid_credit_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_postpaid_credit_status(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.aap_finance_approve_credit(
  _application_id uuid, _approved_limit numeric, _approved_cycle text,
  _risk_level text, _security_deposit numeric, _payment_method text,
  _autopay boolean, _notes text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_app RECORD; v_acct_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_admin_permission(auth.uid(),'aap.credit.approve')) THEN
    RAISE EXCEPTION 'Only Finance L2 or admin can approve credit';
  END IF;
  SELECT * INTO v_app FROM public.aap_credit_applications WHERE id=_application_id AND status IN ('pending','under_review') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found or not reviewable'; END IF;

  UPDATE public.aap_credit_applications
    SET status='approved', reviewed_by=auth.uid(), reviewed_at=now(),
        approved_limit=_approved_limit, approved_cycle=_approved_cycle,
        risk_level=_risk_level, security_deposit=COALESCE(_security_deposit,0),
        review_notes=_notes, updated_at=now()
    WHERE id=_application_id;

  INSERT INTO public.aap_postpaid_accounts(advertiser_id, credit_limit, currency, billing_cycle, risk_level, security_deposit, payment_method, autopay_enabled, approved_by, notes, terms_accepted_at)
  VALUES (v_app.advertiser_id, _approved_limit, v_app.currency, _approved_cycle, _risk_level, COALESCE(_security_deposit,0), COALESCE(_payment_method,'bank_transfer'), COALESCE(_autopay,false), auth.uid(), _notes, now())
  ON CONFLICT (advertiser_id) DO UPDATE
    SET credit_limit=EXCLUDED.credit_limit, billing_cycle=EXCLUDED.billing_cycle,
        risk_level=EXCLUDED.risk_level, security_deposit=EXCLUDED.security_deposit,
        payment_method=EXCLUDED.payment_method, autopay_enabled=EXCLUDED.autopay_enabled,
        status='active', approved_by=auth.uid(), approved_at=now(),
        notes=EXCLUDED.notes, updated_at=now()
  RETURNING id INTO v_acct_id;

  UPDATE public.aap_advertisers SET billing_mode='postpaid_invoice', updated_at=now() WHERE id=v_app.advertiser_id;

  IF COALESCE(_security_deposit,0) > 0 THEN
    INSERT INTO public.aap_security_deposits(advertiser_id, direction, amount, reason, approved_by)
      VALUES (v_app.advertiser_id,'hold',_security_deposit,'Initial credit approval deposit', auth.uid());
  END IF;

  PERFORM public.aap_log_financial_event(v_app.advertiser_id,'finance_approval',_approved_limit,v_app.currency,'credit_application',_application_id,jsonb_build_object('cycle',_approved_cycle,'risk',_risk_level,'deposit',_security_deposit));
  RETURN v_acct_id;
END; $$;
REVOKE ALL ON FUNCTION public.aap_finance_approve_credit(uuid,numeric,text,text,numeric,text,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_finance_approve_credit(uuid,numeric,text,text,numeric,text,boolean,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.aap_finance_reject_credit(_application_id uuid, _notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_adv uuid; BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_admin_permission(auth.uid(),'aap.credit.review') OR public.has_admin_permission(auth.uid(),'aap.credit.approve')) THEN
    RAISE EXCEPTION 'Only Finance can reject';
  END IF;
  UPDATE public.aap_credit_applications SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), review_notes=_notes, updated_at=now()
    WHERE id=_application_id AND status IN ('pending','under_review')
    RETURNING advertiser_id INTO v_adv;
  IF v_adv IS NOT NULL THEN
    PERFORM public.aap_log_financial_event(v_adv,'finance_rejection',NULL,'INR','credit_application',_application_id,jsonb_build_object('notes',_notes));
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.aap_finance_reject_credit(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aap_finance_reject_credit(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.aap_founder_finance_overview AS
SELECT
  (SELECT COALESCE(SUM(total),0) FROM public.aap_invoices WHERE status='paid') AS collected_revenue,
  (SELECT COALESCE(SUM(total),0) FROM public.aap_invoices WHERE status IN ('issued','overdue')) AS outstanding_revenue,
  (SELECT COALESCE(SUM(total),0) FROM public.aap_invoices WHERE status='overdue') AS overdue_revenue,
  (SELECT COALESCE(SUM(total),0) FROM public.aap_invoices) AS total_revenue,
  (SELECT COALESCE(SUM(outstanding_amount),0) FROM public.aap_collections_cases WHERE status='bad_debt') AS bad_debt,
  (SELECT COALESCE(SUM(credit_limit),0) FROM public.aap_postpaid_accounts WHERE status='active') AS total_credit_exposure,
  (SELECT COUNT(*) FROM public.aap_postpaid_accounts WHERE status='active') AS postpaid_accounts,
  (SELECT COUNT(*) FROM public.aap_credit_applications WHERE status IN ('pending','under_review')) AS pending_applications,
  (SELECT COUNT(*) FROM public.aap_risk_events WHERE severity IN ('high','critical') AND resolved=false) AS active_risk_alerts;
GRANT SELECT ON public.aap_founder_finance_overview TO authenticated;
