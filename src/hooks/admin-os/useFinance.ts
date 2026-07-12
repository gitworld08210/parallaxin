import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const invalidate = (qc: ReturnType<typeof useQueryClient>, keys: string[]) =>
  keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

function crudList<T = any>(table: string, key: string, order = "created_at") {
  return () =>
    useQuery({
      queryKey: [key],
      queryFn: async () => {
        const { data, error } = await supabase.from(table as any).select("*").order(order, { ascending: false });
        if (error) throw error;
        return (data ?? []) as T[];
      },
    });
}

function crudCreate(table: string, key: string, message: string) {
  return () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (payload: any) => {
        const { data, error } = await supabase.from(table as any).insert(payload).select().single();
        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        toast.success(message);
        invalidate(qc, [key, "fin_dashboard"]);
      },
      onError: (e: any) => toast.error(e.message ?? "Failed"),
    });
  };
}

function crudUpdate(table: string, key: string) {
  return () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, ...patch }: any) => {
        const { data, error } = await supabase.from(table as any).update(patch).eq("id", id).select().single();
        if (error) throw error;
        return data;
      },
      onSuccess: () => invalidate(qc, [key, "fin_dashboard"]),
      onError: (e: any) => toast.error(e.message ?? "Failed"),
    });
  };
}

// ===== Vendors =====
export const useFinVendors = crudList("fin_vendors", "fin_vendors");
export const useCreateFinVendor = crudCreate("fin_vendors", "fin_vendors", "Vendor added");
export const useUpdateFinVendor = crudUpdate("fin_vendors", "fin_vendors");

// ===== Budgets =====
export const useFinBudgets = crudList("fin_budgets", "fin_budgets");
export const useCreateFinBudget = crudCreate("fin_budgets", "fin_budgets", "Budget created");
export const useUpdateFinBudget = crudUpdate("fin_budgets", "fin_budgets");

export const useApproveFinBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("fin_budgets")
        .update({
          status: "approved",
          approved_by: userRes.user?.id ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Budget approved");
      invalidate(qc, ["fin_budgets", "fin_dashboard"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

// ===== Expenses =====
export const useFinExpenses = crudList("fin_expenses", "fin_expenses");
export const useCreateFinExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: userRes } = await supabase.auth.getUser();
      const body = { ...payload, employee_id: payload.employee_id ?? userRes.user?.id };
      const { data, error } = await supabase.from("fin_expenses").insert(body).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Expense submitted");
      invalidate(qc, ["fin_expenses", "fin_dashboard"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useApproveExpenseManager = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("fin_expenses")
        .update({
          manager_approved: true,
          manager_approved_by: userRes.user?.id ?? null,
          manager_approved_at: new Date().toISOString(),
          status: "manager_approved",
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Manager approval recorded");
      invalidate(qc, ["fin_expenses", "fin_dashboard"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useApproveExpenseFinance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("fin_expenses")
        .update({
          finance_approved: true,
          finance_approved_by: userRes.user?.id ?? null,
          finance_approved_at: new Date().toISOString(),
          status: "approved",
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Finance approval recorded");
      invalidate(qc, ["fin_expenses", "fin_dashboard"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

// ===== Purchase Orders =====
export const useFinPurchaseOrders = crudList("fin_purchase_orders", "fin_purchase_orders");
export const useCreateFinPO = crudCreate("fin_purchase_orders", "fin_purchase_orders", "PO created");
export const useUpdateFinPO = crudUpdate("fin_purchase_orders", "fin_purchase_orders");

// ===== Invoices =====
export const useFinInvoices = crudList("fin_invoices", "fin_invoices");
export const useCreateFinInvoice = crudCreate("fin_invoices", "fin_invoices", "Invoice created");
export const useUpdateFinInvoice = crudUpdate("fin_invoices", "fin_invoices");

export const useMarkInvoicePaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("fin_invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Invoice marked paid");
      invalidate(qc, ["fin_invoices", "fin_dashboard"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

// ===== Contracts =====
export const useFinContracts = crudList("fin_contracts", "fin_contracts");
export const useCreateFinContract = crudCreate("fin_contracts", "fin_contracts", "Contract drafted");
export const useUpdateFinContract = crudUpdate("fin_contracts", "fin_contracts");

// ===== Legal =====
export const useFinLegalRecords = crudList("fin_legal_records", "fin_legal_records");
export const useCreateFinLegalRecord = crudCreate("fin_legal_records", "fin_legal_records", "Legal record saved");

// ===== Compliance =====
export const useFinCompliance = crudList("fin_compliance_records", "fin_compliance_records");
export const useCreateFinCompliance = crudCreate("fin_compliance_records", "fin_compliance_records", "Compliance record saved");
export const useUpdateFinCompliance = crudUpdate("fin_compliance_records", "fin_compliance_records");

// ===== Dashboard KPIs =====
export const useFinDashboard = () =>
  useQuery({
    queryKey: ["fin_dashboard"],
    queryFn: async () => {
      const [budgets, expenses, invoices, contracts, payments, compliance] = await Promise.all([
        supabase.from("fin_budgets").select("id, allocated_amount, spent_amount, status"),
        supabase.from("fin_expenses").select("id, amount, status, created_at"),
        supabase.from("fin_invoices").select("id, amount, status, due_on"),
        supabase.from("fin_contracts").select("id, status, end_date"),
        supabase.from("fin_payments").select("id, amount, status"),
        supabase.from("fin_compliance_records").select("id, status, severity, due_on"),
      ]);
      const now = new Date();
      const thisMonth = (d: string) => new Date(d).getMonth() === now.getMonth() && new Date(d).getFullYear() === now.getFullYear();
      const dueSoon = (d: string | null) => d && (new Date(d).getTime() - now.getTime()) / 86400000 <= 30;
      return {
        totalBudget: (budgets.data ?? []).reduce((s: number, b: any) => s + Number(b.allocated_amount ?? 0), 0),
        spentBudget: (budgets.data ?? []).reduce((s: number, b: any) => s + Number(b.spent_amount ?? 0), 0),
        monthlyExpenses: (expenses.data ?? []).filter((e: any) => thisMonth(e.created_at)).reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0),
        pendingExpenses: (expenses.data ?? []).filter((e: any) => e.status !== "approved" && e.status !== "paid" && e.status !== "rejected").length,
        openInvoices: (invoices.data ?? []).filter((i: any) => i.status !== "paid" && i.status !== "cancelled").length,
        vendorPaymentsPending: (payments.data ?? []).filter((p: any) => p.status !== "completed" && p.status !== "cancelled").length,
        activeContracts: (contracts.data ?? []).filter((c: any) => c.status === "active" || c.status === "signed").length,
        expiringContracts: (contracts.data ?? []).filter((c: any) => dueSoon(c.end_date) && c.status !== "expired" && c.status !== "archived").length,
        complianceAlerts: (compliance.data ?? []).filter((c: any) => c.status !== "completed" && (c.severity === "high" || c.severity === "critical")).length,
      };
    },
  });
