/**
 * useEmployee — loads the current user's employee record + effective permission
 * keys. Uses RLS-protected reads; unauthorised users just get null.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import type { AdminPermissionKey } from "@/features/admin-os/permissions";

export interface EmployeeRecord {
  id: string;
  user_id: string | null;
  employee_number: string;
  full_name: string;
  company_email: string;
  employment_status: string;
  user_type: string;
  level: string | null;
  photo_url: string | null;
  requires_password_change: boolean;
  requires_2fa_setup: boolean;
  policies_accepted_at: string | null;
  department: { id: string; key: string; name: string } | null;
  role: { id: string; key: string; name: string; priority: number } | null;
}

export interface EmployeeContext {
  employee: EmployeeRecord | null;
  permissions: Set<AdminPermissionKey>;
  hasPermission: (key: AdminPermissionKey) => boolean;
  loading: boolean;
  error: Error | null;
}

export const useEmployee = (): EmployeeContext => {
  const { user, loading: authLoading } = useAuth();

  const q = useQuery({
    queryKey: ["admin-os", "employee", user?.id],
    enabled: !!user?.id && !authLoading,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return { employee: null, permissions: [] as string[] };

      const { data: emp, error } = await supabase
        .from("employees")
        .select(
          `id, user_id, employee_number, full_name, company_email,
           employment_status, user_type, level, photo_url,
           requires_password_change, requires_2fa_setup, policies_accepted_at,
           department:admin_departments!employees_department_id_fkey(id,key,name),
           role:admin_roles!employees_role_id_fkey(id,key,name,priority)`,
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!emp || !emp.role) return { employee: emp as any, permissions: [] };

      const { data: perms, error: pErr } = await supabase
        .from("admin_role_permissions")
        .select("admin_permissions(permission_key)")
        .eq("role_id", emp.role.id);
      if (pErr) throw pErr;

      const keys = ((perms ?? []) as any[])
        .map((r) => r.admin_permissions?.permission_key)
        .filter((k): k is string => !!k);

      return { employee: emp as any as EmployeeRecord, permissions: keys };
    },
  });

  const permissions = new Set<AdminPermissionKey>(
    (q.data?.permissions ?? []) as AdminPermissionKey[],
  );

  return {
    employee: q.data?.employee ?? null,
    permissions,
    hasPermission: (k) => permissions.has(k),
    loading: authLoading || q.isLoading,
    error: (q.error as Error | null) ?? null,
  };
};
