/**
 * Employee directory hooks — HR + Founder Office only (RLS enforced).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

export interface EmployeeListItem {
  id: string;
  employee_number: string;
  full_name: string;
  company_email: string;
  employment_status: string;
  user_type: string;
  level: string | null;
  photo_url: string | null;
  joining_date: string | null;
  department: { id: string; key: string; name: string } | null;
  role: { id: string; key: string; name: string; priority: number } | null;
}

export interface EmployeeFilters {
  search?: string;
  status?: string;
  departmentId?: string;
  /** Include newly appointed executives who haven't logged in yet (temp password). */
  includePending?: boolean;
}

export const useEmployeesList = (filters: EmployeeFilters = {}) =>
  useQuery({
    queryKey: ["admin-os", "employees", filters],
    queryFn: async (): Promise<EmployeeListItem[]> => {
      let q = supabase
        .from("employees")
        .select(
          `id, employee_number, full_name, company_email, employment_status,
           user_type, level, photo_url, joining_date,
           department:admin_departments!employees_department_id_fkey(id,key,name),
           role:admin_roles!employees_role_id_fkey(id,key,name,priority)`,
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (filters.status) q = q.eq("employment_status", filters.status as any);
      if (filters.departmentId) q = q.eq("department_id", filters.departmentId);
      // Hide newly appointed executives who have not yet completed first-login
      // (they still have a temp password). They reappear once they log in and
      // change it. Callers can opt in with `includePending: true`.
      if (!filters.includePending) {
        q = q.eq("requires_password_change", false);
      }
      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim();
        q = q.or(
          `full_name.ilike.%${s}%,company_email.ilike.%${s}%,employee_number.ilike.%${s}%`,
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as EmployeeListItem[];
    },
  });

export interface EmployeeDetail extends EmployeeListItem {
  user_id: string | null;
  passport_id: string | null;
  reporting_manager_id: string | null;
  requires_password_change: boolean;
  requires_2fa_setup: boolean;
  policies_accepted_at: string | null;
  exit_date: string | null;
  created_at: string;
  updated_at: string;
  reporting_manager?: { id: string; full_name: string; employee_number: string } | null;
}

export const useEmployeeDetail = (id: string | undefined) =>
  useQuery({
    queryKey: ["admin-os", "employee-detail", id],
    enabled: !!id,
    queryFn: async (): Promise<EmployeeDetail | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select(
          `id, user_id, employee_number, full_name, company_email, employment_status,
           user_type, level, photo_url, joining_date, exit_date, passport_id,
           reporting_manager_id, requires_password_change, requires_2fa_setup,
           policies_accepted_at, created_at, updated_at,
           department:admin_departments!employees_department_id_fkey(id,key,name),
           role:admin_roles!employees_role_id_fkey(id,key,name,priority)`,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;

      if (!data) return null;

      let reportingManager: EmployeeDetail["reporting_manager"] = null;
      if (data.reporting_manager_id) {
        const { data: manager, error: managerError } = await supabase
          .from("employees")
          .select("id,full_name,employee_number")
          .eq("id", data.reporting_manager_id)
          .maybeSingle();
        if (managerError) throw managerError;
        reportingManager = manager as EmployeeDetail["reporting_manager"];
      }

      return {
        ...(data as unknown as EmployeeDetail),
        reporting_manager: reportingManager,
      };
    },
  });

export interface CreateEmployeeInput {
  full_name: string;
  company_email: string;
  employee_number?: string;
  department_id: string;
  role_id: string;
  user_type: string;
  employment_status: string;
  level?: string | null;
  joining_date?: string | null;
  reporting_manager_id?: string | null;
}

export const useCreateEmployee = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      // Auto-generate AURE### employee number if not provided
      let employeeNumber = input.employee_number;
      if (!employeeNumber) {
        const { data: genData, error: genErr } = await supabase.rpc("gen_employee_number" as any);
        if (genErr) throw genErr;
        employeeNumber = genData as string;
      }
      const { data, error } = await supabase
        .from("employees")
        .insert({
          full_name: input.full_name,
          company_email: input.company_email,
          employee_number: employeeNumber,
          department_id: input.department_id,
          role_id: input.role_id,
          user_type: input.user_type as any,
          employment_status: input.employment_status as any,
          level: input.level || null,
          joining_date: input.joining_date || null,
          reporting_manager_id: input.reporting_manager_id || null,
          created_by: user?.id ?? null,
          requires_password_change: true,
          requires_2fa_setup: true,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null,
        module: "people_ops",
        action: "employee.created",
        target_type: "employee",
        target_id: data.id,
        after: data as any,
      });

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-os", "employees"] });
    },
  });
};

export interface UpdateEmployeeInput {
  id: string;
  patch: Partial<{
    full_name: string;
    company_email: string;
    department_id: string;
    role_id: string;
    level: string | null;
    joining_date: string | null;
    exit_date: string | null;
    reporting_manager_id: string | null;
    photo_url: string | null;
  }>;
  before?: Record<string, any>;
}

export const useUpdateEmployee = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch, before }: UpdateEmployeeInput) => {
      const { data, error } = await supabase
        .from("employees")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null,
        module: "people_ops",
        action: "employee.updated",
        target_type: "employee",
        target_id: id,
        before: (before as any) ?? null,
        after: data as any,
      });

      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-os", "employees"] });
      qc.invalidateQueries({ queryKey: ["admin-os", "employee-detail", v.id] });
    },
  });
};

export interface TransitionStatusInput {
  id: string;
  from_status: string;
  to_status: string;
  reason: string;
}

export const useTransitionEmployeeStatus = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, from_status, to_status, reason }: TransitionStatusInput) => {
      const patch: { employment_status: any; exit_date?: string } = {
        employment_status: to_status as any,
      };
      if (to_status === "exited" || to_status === "archived") {
        patch.exit_date = new Date().toISOString().slice(0, 10);
      }
      const { data, error } = await supabase
        .from("employees")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null,
        module: "people_ops",
        action: "employee.status_changed",
        target_type: "employee",
        target_id: id,
        before: { employment_status: from_status } as any,
        after: { employment_status: to_status, reason } as any,
      });

      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-os", "employees"] });
      qc.invalidateQueries({ queryKey: ["admin-os", "employee-detail", v.id] });
    },
  });
};

export const useDepartments = () =>
  useQuery({
    queryKey: ["admin-os", "departments"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_departments")
        .select("id, key, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useRoles = () =>
  useQuery({
    queryKey: ["admin-os", "roles"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_roles")
        .select("id, key, name, priority")
        .order("priority");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useEmployeeAuditTrail = (employeeId: string | undefined) =>
  useQuery({
    queryKey: ["admin-os", "audit", "employee", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("id, action, module, before, after, created_at, actor_user_id")
        .eq("target_type", "employee")
        .eq("target_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
