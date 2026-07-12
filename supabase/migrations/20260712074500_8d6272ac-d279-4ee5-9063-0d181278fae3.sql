
CREATE OR REPLACE FUNCTION public.is_finance_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.admin_departments d ON d.id = e.department_id
    WHERE e.user_id = _user_id
      AND e.employment_status = 'active'
      AND d.key IN ('finance','legal','finance_legal','procurement','compliance')
  ) OR public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.gen_fin_id(_prefix text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE seq_num int;
BEGIN
  seq_num := (floor(random() * 900000) + 100000)::int;
  RETURN _prefix || '-' || to_char(now(), 'YYYY') || '-' || seq_num::text;
END; $$;

-- Vendors
CREATE TABLE public.fin_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id text UNIQUE NOT NULL DEFAULT public.gen_fin_id('VEN'),
  name text NOT NULL,
  category text,
  contact_email text,
  contact_phone text,
  address text,
  tax_id text,
  status text NOT NULL DEFAULT 'active',
  risk_level text NOT NULL DEFAULT 'low',
  performance_rating numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_vendors TO authenticated;
GRANT ALL ON public.fin_vendors TO service_role;
ALTER TABLE public.fin_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_vendors view" ON public.fin_vendors FOR SELECT TO authenticated
  USING (public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_vendors manage" ON public.fin_vendors FOR ALL TO authenticated
  USING (public.is_finance_staff(auth.uid())) WITH CHECK (public.is_finance_staff(auth.uid()));

-- Budgets
CREATE TABLE public.fin_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  period text NOT NULL,
  fiscal_year int NOT NULL,
  allocated_amount numeric NOT NULL DEFAULT 0,
  spent_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'draft',
  requested_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_budgets TO authenticated;
GRANT ALL ON public.fin_budgets TO service_role;
ALTER TABLE public.fin_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_budgets view" ON public.fin_budgets FOR SELECT TO authenticated
  USING (public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_budgets manage" ON public.fin_budgets FOR ALL TO authenticated
  USING (public.is_finance_staff(auth.uid())) WITH CHECK (public.is_finance_staff(auth.uid()));

-- Expenses
CREATE TABLE public.fin_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id text UNIQUE NOT NULL DEFAULT public.gen_fin_id('EXP'),
  employee_id uuid REFERENCES auth.users(id),
  department_id uuid REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  budget_id uuid REFERENCES public.fin_budgets(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  incurred_on date,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending',
  manager_approved boolean NOT NULL DEFAULT false,
  manager_approved_by uuid REFERENCES auth.users(id),
  manager_approved_at timestamptz,
  finance_approved boolean NOT NULL DEFAULT false,
  finance_approved_by uuid REFERENCES auth.users(id),
  finance_approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_expenses TO authenticated;
GRANT ALL ON public.fin_expenses TO service_role;
ALTER TABLE public.fin_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_expenses view own or staff" ON public.fin_expenses FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_expenses insert self" ON public.fin_expenses FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid() OR public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_expenses update staff" ON public.fin_expenses FOR UPDATE TO authenticated
  USING (public.is_finance_staff(auth.uid())) WITH CHECK (public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_expenses delete staff" ON public.fin_expenses FOR DELETE TO authenticated
  USING (public.is_finance_staff(auth.uid()));

-- Purchase Requests
CREATE TABLE public.fin_purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text UNIQUE NOT NULL DEFAULT public.gen_fin_id('PR'),
  requester_id uuid REFERENCES auth.users(id),
  department_id uuid REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  estimated_amount numeric,
  currency text NOT NULL DEFAULT 'USD',
  justification text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_purchase_requests TO authenticated;
GRANT ALL ON public.fin_purchase_requests TO service_role;
ALTER TABLE public.fin_purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_prs view" ON public.fin_purchase_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_prs insert" ON public.fin_purchase_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() OR public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_prs update" ON public.fin_purchase_requests FOR UPDATE TO authenticated
  USING (public.is_finance_staff(auth.uid())) WITH CHECK (public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_prs delete" ON public.fin_purchase_requests FOR DELETE TO authenticated
  USING (public.is_finance_staff(auth.uid()));

-- Purchase Orders
CREATE TABLE public.fin_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id text UNIQUE NOT NULL DEFAULT public.gen_fin_id('PO'),
  request_id uuid REFERENCES public.fin_purchase_requests(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.fin_vendors(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_purchase_orders TO authenticated;
GRANT ALL ON public.fin_purchase_orders TO service_role;
ALTER TABLE public.fin_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_pos view" ON public.fin_purchase_orders FOR SELECT TO authenticated
  USING (public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_pos manage" ON public.fin_purchase_orders FOR ALL TO authenticated
  USING (public.is_finance_staff(auth.uid())) WITH CHECK (public.is_finance_staff(auth.uid()));

-- Invoices
CREATE TABLE public.fin_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text UNIQUE NOT NULL DEFAULT public.gen_fin_id('INV'),
  vendor_id uuid REFERENCES public.fin_vendors(id) ON DELETE SET NULL,
  po_id uuid REFERENCES public.fin_purchase_orders(id) ON DELETE SET NULL,
  external_invoice_number text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  issued_on date,
  due_on date,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_invoices TO authenticated;
GRANT ALL ON public.fin_invoices TO service_role;
ALTER TABLE public.fin_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_invoices view" ON public.fin_invoices FOR SELECT TO authenticated
  USING (public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_invoices manage" ON public.fin_invoices FOR ALL TO authenticated
  USING (public.is_finance_staff(auth.uid())) WITH CHECK (public.is_finance_staff(auth.uid()));

-- Payments
CREATE TABLE public.fin_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL DEFAULT public.gen_fin_id('TXN'),
  invoice_id uuid REFERENCES public.fin_invoices(id) ON DELETE SET NULL,
  expense_id uuid REFERENCES public.fin_expenses(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.fin_vendors(id) ON DELETE SET NULL,
  payee_type text NOT NULL DEFAULT 'vendor',
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  method text,
  reference text,
  status text NOT NULL DEFAULT 'pending',
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_payments TO authenticated;
GRANT ALL ON public.fin_payments TO service_role;
ALTER TABLE public.fin_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_payments view" ON public.fin_payments FOR SELECT TO authenticated
  USING (public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_payments manage" ON public.fin_payments FOR ALL TO authenticated
  USING (public.is_finance_staff(auth.uid())) WITH CHECK (public.is_finance_staff(auth.uid()));

-- Contracts
CREATE TABLE public.fin_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id text UNIQUE NOT NULL DEFAULT public.gen_fin_id('CTR'),
  title text NOT NULL,
  counterparty text NOT NULL,
  vendor_id uuid REFERENCES public.fin_vendors(id) ON DELETE SET NULL,
  contract_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'draft',
  value numeric,
  currency text NOT NULL DEFAULT 'USD',
  start_date date,
  end_date date,
  renewal_date date,
  legal_reviewed_by uuid REFERENCES auth.users(id),
  legal_reviewed_at timestamptz,
  executive_approved_by uuid REFERENCES auth.users(id),
  executive_approved_at timestamptz,
  signed_at timestamptz,
  archived_at timestamptz,
  notes text,
  current_version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_contracts TO authenticated;
GRANT ALL ON public.fin_contracts TO service_role;
ALTER TABLE public.fin_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_contracts view" ON public.fin_contracts FOR SELECT TO authenticated
  USING (public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_contracts manage" ON public.fin_contracts FOR ALL TO authenticated
  USING (public.is_finance_staff(auth.uid())) WITH CHECK (public.is_finance_staff(auth.uid()));

-- Contract versions (immutable)
CREATE TABLE public.fin_contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.fin_contracts(id) ON DELETE CASCADE,
  version int NOT NULL,
  content text,
  changed_by uuid REFERENCES auth.users(id),
  change_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, version)
);
GRANT SELECT, INSERT ON public.fin_contract_versions TO authenticated;
GRANT ALL ON public.fin_contract_versions TO service_role;
ALTER TABLE public.fin_contract_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_ctr_ver view" ON public.fin_contract_versions FOR SELECT TO authenticated
  USING (public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_ctr_ver insert" ON public.fin_contract_versions FOR INSERT TO authenticated
  WITH CHECK (public.is_finance_staff(auth.uid()));

-- Legal records
CREATE TABLE public.fin_legal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id text UNIQUE NOT NULL DEFAULT public.gen_fin_id('LEG'),
  title text NOT NULL,
  record_type text NOT NULL DEFAULT 'notice',
  description text,
  status text NOT NULL DEFAULT 'open',
  reference_url text,
  filed_on date,
  expires_on date,
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_legal_records TO authenticated;
GRANT ALL ON public.fin_legal_records TO service_role;
ALTER TABLE public.fin_legal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_legal view" ON public.fin_legal_records FOR SELECT TO authenticated
  USING (public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_legal manage" ON public.fin_legal_records FOR ALL TO authenticated
  USING (public.is_finance_staff(auth.uid())) WITH CHECK (public.is_finance_staff(auth.uid()));

-- Compliance records
CREATE TABLE public.fin_compliance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_id text UNIQUE NOT NULL DEFAULT public.gen_fin_id('CMP'),
  title text NOT NULL,
  framework text,
  description text,
  status text NOT NULL DEFAULT 'pending',
  severity text NOT NULL DEFAULT 'medium',
  due_on date,
  completed_at timestamptz,
  owner_id uuid REFERENCES auth.users(id),
  evidence_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_compliance_records TO authenticated;
GRANT ALL ON public.fin_compliance_records TO service_role;
ALTER TABLE public.fin_compliance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_compliance view" ON public.fin_compliance_records FOR SELECT TO authenticated
  USING (public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_compliance manage" ON public.fin_compliance_records FOR ALL TO authenticated
  USING (public.is_finance_staff(auth.uid())) WITH CHECK (public.is_finance_staff(auth.uid()));

-- History (immutable)
CREATE TABLE public.fin_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.fin_history TO authenticated;
GRANT ALL ON public.fin_history TO service_role;
ALTER TABLE public.fin_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_history view" ON public.fin_history FOR SELECT TO authenticated
  USING (public.is_finance_staff(auth.uid()));
CREATE POLICY "fin_history insert" ON public.fin_history FOR INSERT TO authenticated
  WITH CHECK (public.is_finance_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.fin_prevent_update_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Finance record is immutable';
END; $$;

CREATE TRIGGER fin_history_no_update BEFORE UPDATE ON public.fin_history
  FOR EACH ROW EXECUTE FUNCTION public.fin_prevent_update_delete();
CREATE TRIGGER fin_history_no_delete BEFORE DELETE ON public.fin_history
  FOR EACH ROW EXECUTE FUNCTION public.fin_prevent_update_delete();
CREATE TRIGGER fin_ctr_ver_no_update BEFORE UPDATE ON public.fin_contract_versions
  FOR EACH ROW EXECUTE FUNCTION public.fin_prevent_update_delete();
CREATE TRIGGER fin_ctr_ver_no_delete BEFORE DELETE ON public.fin_contract_versions
  FOR EACH ROW EXECUTE FUNCTION public.fin_prevent_update_delete();

CREATE TRIGGER trg_fin_vendors_updated BEFORE UPDATE ON public.fin_vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_budgets_updated BEFORE UPDATE ON public.fin_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_expenses_updated BEFORE UPDATE ON public.fin_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_prs_updated BEFORE UPDATE ON public.fin_purchase_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_pos_updated BEFORE UPDATE ON public.fin_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_invoices_updated BEFORE UPDATE ON public.fin_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_payments_updated BEFORE UPDATE ON public.fin_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_contracts_updated BEFORE UPDATE ON public.fin_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_legal_updated BEFORE UPDATE ON public.fin_legal_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_compliance_updated BEFORE UPDATE ON public.fin_compliance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_fin_expenses_status ON public.fin_expenses(status);
CREATE INDEX idx_fin_expenses_employee ON public.fin_expenses(employee_id);
CREATE INDEX idx_fin_invoices_status ON public.fin_invoices(status);
CREATE INDEX idx_fin_invoices_vendor ON public.fin_invoices(vendor_id);
CREATE INDEX idx_fin_contracts_status ON public.fin_contracts(status);
CREATE INDEX idx_fin_budgets_department ON public.fin_budgets(department_id);
CREATE INDEX idx_fin_payments_status ON public.fin_payments(status);
CREATE INDEX idx_fin_history_entity ON public.fin_history(entity_type, entity_id);
