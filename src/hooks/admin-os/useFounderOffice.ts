/**
 * Founder Office & Audit Center hooks — reads from existing tables.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFounderStats = () =>
  useQuery({
    queryKey: ["admin-os", "founder-stats"],
    staleTime: 30_000,
    queryFn: async () => {
      const [empRes, deptRes, auditRes, sessRes] = await Promise.all([
        supabase
          .from("employees")
          .select("employment_status", { count: "exact" }),
        supabase.from("admin_departments").select("id, key, name"),
        supabase
          .from("admin_audit_logs")
          .select("id, action, module, created_at, actor_user_id")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("employee_sessions")
          .select("id", { count: "exact", head: true })
          .is("revoked_at", null),
      ]);

      if (empRes.error) throw empRes.error;
      if (deptRes.error) throw deptRes.error;
      if (auditRes.error) throw auditRes.error;

      const byStatus: Record<string, number> = {};
      (empRes.data ?? []).forEach((e: any) => {
        byStatus[e.employment_status] = (byStatus[e.employment_status] ?? 0) + 1;
      });

      return {
        totalEmployees: empRes.count ?? empRes.data?.length ?? 0,
        activeEmployees: byStatus.active ?? 0,
        onLeave: byStatus.on_leave ?? 0,
        suspended: byStatus.suspended ?? 0,
        inOnboarding:
          (byStatus.pre_onboarding ?? 0) +
          (byStatus.joining_today ?? 0) +
          (byStatus.offer_sent ?? 0) +
          (byStatus.offer_accepted ?? 0),
        departments: deptRes.data ?? [],
        recentAudit: auditRes.data ?? [],
        activeSessions: sessRes.count ?? 0,
        byStatus,
      };
    },
  });

export interface AuditFilters {
  module?: string;
  action?: string;
  search?: string;
  from?: string;
  to?: string;
}

export const useAuditLogs = (filters: AuditFilters = {}) =>
  useQuery({
    queryKey: ["admin-os", "audit-logs", filters],
    queryFn: async () => {
      let q = supabase
        .from("admin_audit_logs")
        .select(
          "id, module, action, target_type, target_id, actor_user_id, actor_employee_id, before, after, created_at, ip",
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (filters.module) q = q.eq("module", filters.module);
      if (filters.action) q = q.ilike("action", `%${filters.action}%`);
      if (filters.from) q = q.gte("created_at", filters.from);
      if (filters.to) q = q.lte("created_at", filters.to);
      if (filters.search)
        q = q.or(
          `target_id.ilike.%${filters.search}%,target_type.ilike.%${filters.search}%`,
        );

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAuditModules = () =>
  useQuery({
    queryKey: ["admin-os", "audit-modules"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("module")
        .limit(500);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => r.module && set.add(r.module));
      return Array.from(set).sort();
    },
  });
