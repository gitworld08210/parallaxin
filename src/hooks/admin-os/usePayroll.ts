/**
 * Payroll, Compensation & Benefits hooks — Phase 2.10.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type CompensationPlan = T["compensation_plans"]["Row"];
export type SalaryStructure = T["salary_structures"]["Row"];
export type SalaryRevision = T["salary_revisions"]["Row"];
export type PayrollCycle = T["payroll_cycles"]["Row"];
export type PayrollItem = T["payroll_items"]["Row"];
export type Bonus = T["compensation_bonuses"]["Row"];
export type BenefitCatalog = T["benefits_catalog"]["Row"];
export type EmployeeBenefit = T["employee_benefits"]["Row"];
export type Reimbursement = T["reimbursements"]["Row"];
export type CompType = Database["public"]["Enums"]["compensation_type"];
export type CycleStatus = Database["public"]["Enums"]["payroll_cycle_status"];
export type BonusType = Database["public"]["Enums"]["bonus_type"];
export type BonusStatus = Database["public"]["Enums"]["bonus_status"];
export type ReimbStatus = Database["public"]["Enums"]["reimbursement_status"];
export type RevStatus = Database["public"]["Enums"]["salary_revision_status"];

const audit = async (a: {
  actor: string | null; action: string; targetType: string; targetId: string; after?: unknown;
}) => {
  await supabase.from("admin_audit_logs").insert({
    actor_user_id: a.actor, module: "people_ops", action: a.action,
    target_type: a.targetType, target_id: a.targetId,
    after: (a.after as any) ?? null,
  });
};

const root = ["admin-os", "payroll"];

// ------------- Compensation plans -------------
export const useCompPlans = () =>
  useQuery({
    queryKey: [...root, "plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("compensation_plans")
        .select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSavePlan = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CompensationPlan> & { name: string; comp_type: CompType }) => {
      const { id, ...rest } = input;
      const q = id
        ? supabase.from("compensation_plans").update(rest).eq("id", id).select().single()
        : supabase.from("compensation_plans").insert({ ...rest, created_by: user?.id }).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: id ? "comp_plan.update" : "comp_plan.create",
        targetType: "compensation_plan", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "plans"] }),
  });
};

// ------------- Salary structures -------------
export const useSalaryStructures = (employeeId?: string) =>
  useQuery({
    queryKey: [...root, "salary", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase.from("salary_structures")
        .select(`*, plan:compensation_plans(id,name,comp_type)`)
        .eq("employee_id", employeeId!)
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useActiveSalaries = () =>
  useQuery({
    queryKey: [...root, "salary-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("salary_structures")
        .select(`*, employee:employees(id,full_name,employee_number,department_id)`)
        .eq("status", "active")
        .order("updated_at", { ascending: false }).limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveSalaryStructure = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<SalaryStructure> & { employee_id: string; effective_from: string }) => {
      const { id, ...rest } = input;
      const q = id
        ? supabase.from("salary_structures").update(rest).eq("id", id).select().single()
        : supabase.from("salary_structures").insert({ ...rest, created_by: user?.id }).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: id ? "salary.update" : "salary.create",
        targetType: "salary_structure", targetId: data.id, after: data });
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [...root, "salary", v.employee_id] });
      qc.invalidateQueries({ queryKey: [...root, "salary-active"] });
    },
  });
};

// ------------- Salary revisions -------------
export const useSalaryRevisions = (filter?: { status?: RevStatus; employee_id?: string }) =>
  useQuery({
    queryKey: [...root, "revisions", filter],
    queryFn: async () => {
      let q = supabase.from("salary_revisions")
        .select(`*, employee:employees(id,full_name,employee_number)`)
        .order("created_at", { ascending: false }).limit(200);
      if (filter?.status) q = q.eq("status", filter.status);
      if (filter?.employee_id) q = q.eq("employee_id", filter.employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateRevision = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<SalaryRevision> & { employee_id: string; reason: string; effective_date: string }) => {
      const { data, error } = await supabase.from("salary_revisions")
        .insert({ ...input, requested_by: user?.id, status: "pending_hr" })
        .select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "revision.create",
        targetType: "salary_revision", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "revisions"] }),
  });
};

export const useReviewRevision = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, next, rejection_reason }: { id: string; next: RevStatus; rejection_reason?: string }) => {
      const patch: Partial<SalaryRevision> = { status: next };
      const now = new Date().toISOString();
      if (next === "pending_finance") { patch.hr_reviewer = user?.id ?? null; patch.hr_reviewed_at = now; }
      else if (next === "pending_founder") { patch.finance_reviewer = user?.id ?? null; patch.finance_reviewed_at = now; }
      else if (next === "approved") { patch.founder_reviewer = user?.id ?? null; patch.founder_reviewed_at = now; }
      else if (next === "rejected") { patch.rejection_reason = rejection_reason ?? "Rejected"; }
      const { data, error } = await supabase.from("salary_revisions").update(patch).eq("id", id).select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: `revision.${next}`,
        targetType: "salary_revision", targetId: id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "revisions"] }),
  });
};

// ------------- Payroll cycles & items -------------
export const usePayrollCycles = () =>
  useQuery({
    queryKey: [...root, "cycles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_cycles").select("*")
        .order("period_month", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const usePayrollCycle = (id?: string) =>
  useQuery({
    queryKey: [...root, "cycle", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_cycles").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

export const usePayrollItems = (cycleId?: string) =>
  useQuery({
    queryKey: [...root, "items", cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_items")
        .select(`*, employee:employees(id,full_name,employee_number,department_id)`)
        .eq("cycle_id", cycleId!)
        .order("net_pay", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateCycle = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { period_month: string; currency?: string; notes?: string }) => {
      const { data, error } = await supabase.from("payroll_cycles")
        .insert({ ...input, status: "draft" })
        .select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "cycle.create",
        targetType: "payroll_cycle", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "cycles"] }),
  });
};

export const useGenerateCycle = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (cycleId: string) => {
      // Snapshot every active salary structure into payroll_items.
      const { data: structs, error: sErr } = await supabase.from("salary_structures")
        .select(`id, employee_id, currency, basic, house_allowance, transport_allowance,
                 medical_allowance, special_allowance, other_allowances, deductions,
                 benefits, gross_monthly`)
        .eq("status", "active");
      if (sErr) throw sErr;

      let total = 0;
      const rows = (structs ?? []).map((s) => {
        const deductionTotal = Array.isArray(s.deductions)
          ? (s.deductions as any[]).reduce((sum, d) => sum + (Number(d?.amount) || 0), 0)
          : 0;
        const gross = Number(s.gross_monthly) || 0;
        const net = Math.max(0, gross - deductionTotal);
        total += net;
        return {
          cycle_id: cycleId,
          employee_id: s.employee_id,
          structure_snapshot: s as any,
          worked_days: 30,
          leave_days: 0,
          loss_of_pay_days: 0,
          gross,
          bonuses_total: 0,
          reimbursements_total: 0,
          deductions_total: deductionTotal,
          net_pay: net,
        };
      });

      if (rows.length) {
        const { error: iErr } = await supabase.from("payroll_items")
          .upsert(rows, { onConflict: "cycle_id,employee_id" });
        if (iErr) throw iErr;
      }

      const { data, error } = await supabase.from("payroll_cycles")
        .update({
          status: "finance_review",
          generated_by: user?.id, generated_at: new Date().toISOString(),
          totals: { net_pay: total, employees: rows.length } as any,
        })
        .eq("id", cycleId).select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "cycle.generate",
        targetType: "payroll_cycle", targetId: cycleId, after: data });
      return data;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: [...root, "cycles"] });
      qc.invalidateQueries({ queryKey: [...root, "cycle", id] });
      qc.invalidateQueries({ queryKey: [...root, "items", id] });
    },
  });
};

export const useAdvanceCycle = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, next }: { id: string; next: CycleStatus }) => {
      const now = new Date().toISOString();
      const patch: Partial<PayrollCycle> = { status: next };
      if (next === "hr_review") { patch.finance_reviewer = user?.id ?? null; patch.finance_reviewed_at = now; }
      else if (next === "founder_review") { patch.hr_reviewer = user?.id ?? null; patch.hr_reviewed_at = now; }
      else if (next === "approved") { patch.founder_reviewer = user?.id ?? null; patch.founder_reviewed_at = now; patch.approved_by = user?.id ?? null; patch.approved_at = now; }
      else if (next === "released") { patch.released_by = user?.id ?? null; patch.released_at = now; }
      const { data, error } = await supabase.from("payroll_cycles").update(patch).eq("id", id).select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: `cycle.${next}`,
        targetType: "payroll_cycle", targetId: id, after: data });
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [...root, "cycles"] });
      qc.invalidateQueries({ queryKey: [...root, "cycle", v.id] });
    },
  });
};

// ------------- Bonuses -------------
export const useBonuses = (filter?: { status?: BonusStatus; employee_id?: string }) =>
  useQuery({
    queryKey: [...root, "bonuses", filter],
    queryFn: async () => {
      let q = supabase.from("compensation_bonuses")
        .select(`*, employee:employees(id,full_name,employee_number)`)
        .order("created_at", { ascending: false }).limit(200);
      if (filter?.status) q = q.eq("status", filter.status);
      if (filter?.employee_id) q = q.eq("employee_id", filter.employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveBonus = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Bonus> & { employee_id: string; bonus_type: BonusType; amount: number; reason: string }) => {
      const { id, ...rest } = input;
      const q = id
        ? supabase.from("compensation_bonuses").update(rest).eq("id", id).select().single()
        : supabase.from("compensation_bonuses").insert({ ...rest, requested_by: user?.id }).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: id ? "bonus.update" : "bonus.create",
        targetType: "bonus", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "bonuses"] }),
  });
};

export const useDecideBonus = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, decision, rejection_reason }: { id: string; decision: BonusStatus; rejection_reason?: string }) => {
      const patch: Partial<Bonus> = { status: decision };
      if (decision === "approved") { patch.approver = user?.id ?? null; patch.approved_at = new Date().toISOString(); }
      else if (decision === "paid") { patch.paid_at = new Date().toISOString(); }
      else if (decision === "rejected") { patch.rejection_reason = rejection_reason ?? "Rejected"; }
      const { data, error } = await supabase.from("compensation_bonuses").update(patch).eq("id", id).select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: `bonus.${decision}`,
        targetType: "bonus", targetId: id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "bonuses"] }),
  });
};

// ------------- Benefits -------------
export const useBenefits = () =>
  useQuery({
    queryKey: [...root, "benefits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("benefits_catalog").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveBenefit = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<BenefitCatalog> & { name: string; category: string }) => {
      const { id, ...rest } = input;
      const q = id
        ? supabase.from("benefits_catalog").update(rest).eq("id", id).select().single()
        : supabase.from("benefits_catalog").insert({ ...rest, created_by: user?.id }).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: id ? "benefit.update" : "benefit.create",
        targetType: "benefit", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "benefits"] }),
  });
};

export const useEmployeeBenefits = (employeeId?: string) =>
  useQuery({
    queryKey: [...root, "employee-benefits", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase.from("employee_benefits")
        .select(`*, benefit:benefits_catalog(id,name,category,monthly_cost)`)
        .eq("employee_id", employeeId!)
        .order("enrolled_from", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useEnrollBenefit = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { employee_id: string; benefit_id: string; enrolled_from: string; enrolled_to?: string | null; notes?: string }) => {
      const { data, error } = await supabase.from("employee_benefits")
        .insert({ ...input, enrolled_by: user?.id }).select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "benefit.enroll",
        targetType: "employee_benefit", targetId: data.id, after: data });
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...root, "employee-benefits", v.employee_id] }),
  });
};

// ------------- Reimbursements -------------
export const useReimbursements = (filter?: { status?: ReimbStatus; employee_id?: string }) =>
  useQuery({
    queryKey: [...root, "reimbursements", filter],
    queryFn: async () => {
      let q = supabase.from("reimbursements")
        .select(`*, employee:employees(id,full_name,employee_number)`)
        .order("created_at", { ascending: false }).limit(200);
      if (filter?.status) q = q.eq("status", filter.status);
      if (filter?.employee_id) q = q.eq("employee_id", filter.employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSubmitReimbursement = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Reimbursement> & { employee_id: string; category: string; amount: number; description: string; expense_date: string }) => {
      const { data, error } = await supabase.from("reimbursements")
        .insert({ ...input, submitted_by: user?.id, status: "pending_manager" })
        .select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "reimbursement.submit",
        targetType: "reimbursement", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "reimbursements"] }),
  });
};

export const useReviewReimbursement = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, next, rejection_reason }: { id: string; next: ReimbStatus; rejection_reason?: string }) => {
      const now = new Date().toISOString();
      const patch: Partial<Reimbursement> = { status: next };
      if (next === "pending_finance") { patch.manager_reviewer = user?.id ?? null; patch.manager_reviewed_at = now; }
      else if (next === "approved") { patch.finance_reviewer = user?.id ?? null; patch.finance_reviewed_at = now; }
      else if (next === "paid") { patch.paid_at = now; }
      else if (next === "rejected") { patch.rejection_reason = rejection_reason ?? "Rejected"; }
      const { data, error } = await supabase.from("reimbursements").update(patch).eq("id", id).select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: `reimbursement.${next}`,
        targetType: "reimbursement", targetId: id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "reimbursements"] }),
  });
};

// ------------- Employee self-service payslips -------------
export const useMyPayslips = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...root, "my-payslips", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: emp, error: eErr } = await supabase
        .from("employees")
        .select("id, full_name, employee_number, company_email, department:admin_departments!employees_department_id_fkey(name), role:admin_roles!employees_role_id_fkey(name)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (eErr) throw eErr;
      if (!emp) return { employee: null, items: [] as any[] };

      const { data: items, error } = await supabase
        .from("payroll_items")
        .select(`*, cycle:payroll_cycles!inner(id, period_month, currency, status, released_at)`)
        .eq("employee_id", emp.id)
        .eq("cycle.status", "released")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return { employee: emp as any, items: (items ?? []) as any[] };
    },
  });
};

export const useMyPayslip = (itemId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...root, "my-payslip", itemId, user?.id],
    enabled: !!itemId && !!user?.id,
    queryFn: async () => {
      const { data: emp, error: eErr } = await supabase
        .from("employees")
        .select("id, full_name, employee_number, company_email, level, photo_url, department:admin_departments!employees_department_id_fkey(name), role:admin_roles!employees_role_id_fkey(name)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (eErr) throw eErr;
      if (!emp) return null;

      const { data, error } = await supabase
        .from("payroll_items")
        .select(`*, cycle:payroll_cycles(id, period_month, currency, status, released_at)`)
        .eq("id", itemId!)
        .eq("employee_id", emp.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { employee: emp as any, item: data as any };
    },
  });
};
