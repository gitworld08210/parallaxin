/**
 * Departments module — reads from admin_departments + employees.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DepartmentSummary {
  id: string;
  key: string;
  name: string;
  status: string | null;
  description: string | null;
  activeCount: number;
  totalCount: number;
  onLeaveCount: number;
  headName: string | null;
}

export const useDepartmentsOverview = () =>
  useQuery({
    queryKey: ["admin-os", "departments-overview"],
    staleTime: 30_000,
    queryFn: async (): Promise<DepartmentSummary[]> => {
      const [deptRes, empRes] = await Promise.all([
        supabase
          .from("admin_departments")
          .select("id, key, name, status, description")
          .order("name"),
        supabase
          .from("employees")
          .select(
            `id, department_id, employment_status, full_name,
             role:admin_roles!employees_role_id_fkey(key, priority)`,
          ),
      ]);
      if (deptRes.error) throw deptRes.error;
      if (empRes.error) throw empRes.error;

      const employees = (empRes.data ?? []) as any[];
      return (deptRes.data ?? []).map((d: any) => {
        const members = employees.filter((e) => e.department_id === d.id);
        const active = members.filter((e) => e.employment_status === "active");
        const onLeave = members.filter((e) => e.employment_status === "on_leave");
        const head = members
          .filter((e) => e.role?.key === "department_head")
          .sort((a, b) => (a.role?.priority ?? 999) - (b.role?.priority ?? 999))[0];
        return {
          id: d.id,
          key: d.key,
          name: d.name,
          status: d.status ?? "active",
          description: d.description ?? null,
          activeCount: active.length,
          totalCount: members.length,
          onLeaveCount: onLeave.length,
          headName: head?.full_name ?? null,
        };
      });
    },
  });

export const useDepartmentDetail = (departmentId: string | undefined) =>
  useQuery({
    queryKey: ["admin-os", "department-detail", departmentId],
    enabled: !!departmentId,
    queryFn: async () => {
      if (!departmentId) return null;
      const [deptRes, empRes, auditRes] = await Promise.all([
        supabase
          .from("admin_departments")
          .select("*")
          .eq("id", departmentId)
          .maybeSingle(),
        supabase
          .from("employees")
          .select(
            `id, employee_number, full_name, company_email, employment_status,
             photo_url, level,
             role:admin_roles!employees_role_id_fkey(id, key, name, priority)`,
          )
          .eq("department_id", departmentId)
          .order("full_name"),
        supabase
          .from("admin_audit_logs")
          .select("id, action, module, created_at")
          .ilike("action", "%")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (deptRes.error) throw deptRes.error;
      if (empRes.error) throw empRes.error;
      if (auditRes.error) throw auditRes.error;
      return {
        department: deptRes.data,
        members: (empRes.data ?? []) as any[],
        recentActivity: auditRes.data ?? [],
      };
    },
  });
