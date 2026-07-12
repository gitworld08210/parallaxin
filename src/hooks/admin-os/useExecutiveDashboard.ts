/**
 * Phase 3.2 — Executive Dashboard hooks.
 *
 * All queries are READ-ONLY summaries composed from existing tables.
 * The Executive Dashboard never mutates business data; operational
 * changes happen inside dedicated modules.
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

/* -------------------------------------------------------------------------- */
/* Company Overview                                                           */
/* -------------------------------------------------------------------------- */

export const useCompanyOverview = () =>
  useQuery({
    queryKey: ["exec-dash", "company-overview"],
    staleTime: 60_000,
    queryFn: async () => {
      const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const since60 = new Date(Date.now() - 60 * 86_400_000).toISOString();

      const [emp, dept, positions, growthNew, growth60] = await Promise.all([
        supabase.from("employees").select("employment_status"),
        supabase.from("admin_departments").select("id", { count: "exact", head: true }),
        supabase
          .from("open_positions")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved"),
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since30),
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since60)
          .lt("created_at", since30),
      ]);

      if (emp.error) throw emp.error;
      const rows = emp.data ?? [];
      const byStatus: Record<string, number> = {};
      rows.forEach((r: any) => {
        byStatus[r.employment_status] = (byStatus[r.employment_status] ?? 0) + 1;
      });

      const total = rows.length;
      const active = byStatus.active ?? 0;
      const onboarding =
        (byStatus.pre_onboarding ?? 0) +
        (byStatus.joining_today ?? 0) +
        (byStatus.offer_accepted ?? 0);

      const last30 = growthNew.count ?? 0;
      const prev30 = growth60.count ?? 0;
      const growthPct = prev30 > 0 ? ((last30 - prev30) / prev30) * 100 : last30 > 0 ? 100 : 0;

      return {
        totalEmployees: total,
        activeEmployees: active,
        departments: dept.count ?? 0,
        openPositions: positions.count ?? 0,
        onboarding,
        onLeave: byStatus.on_leave ?? 0,
        suspended: byStatus.suspended ?? 0,
        newLast30: last30,
        growthPct,
      };
    },
  });

/* -------------------------------------------------------------------------- */
/* Department Overview                                                        */
/* -------------------------------------------------------------------------- */

export const useDepartmentOverview = () =>
  useQuery({
    queryKey: ["exec-dash", "department-overview"],
    staleTime: 60_000,
    queryFn: async () => {
      const [depts, emps, approvals] = await Promise.all([
        supabase
          .from("admin_departments")
          .select("id, key, name, head_employee_id")
          .order("name"),
        supabase.from("employees").select("id, department_id, employment_status"),
        supabase
          .from("platform_approval_requests")
          .select("id, module, status")
          .in("status", ["pending", "in_review"]),
      ]);
      if (depts.error) throw depts.error;
      if (emps.error) throw emps.error;

      const byDept: Record<string, { total: number; active: number }> = {};
      (emps.data ?? []).forEach((e: any) => {
        const k = e.department_id ?? "_unassigned";
        if (!byDept[k]) byDept[k] = { total: 0, active: 0 };
        byDept[k].total += 1;
        if (e.employment_status === "active") byDept[k].active += 1;
      });

      const pendingByModule: Record<string, number> = {};
      (approvals.data ?? []).forEach((r: any) => {
        pendingByModule[r.module] = (pendingByModule[r.module] ?? 0) + 1;
      });

      return (depts.data ?? []).map((d: any) => {
        const stat = byDept[d.id] ?? { total: 0, active: 0 };
        const capacity = ratio(stat.active, stat.total || 1);
        const pending = pendingByModule[d.key] ?? 0;
        const health = clamp(Math.round(capacity * 100 - pending * 3));
        const risk = health < 55 ? "high" : health < 75 ? "medium" : "low";
        return {
          id: d.id,
          key: d.key,
          name: d.name,
          headEmployeeId: d.head_employee_id,
          headcount: stat.total,
          active: stat.active,
          capacityPct: Math.round(capacity * 100),
          pendingApprovals: pending,
          health,
          risk,
        };
      });
    },
  });

/* -------------------------------------------------------------------------- */
/* Executive Approvals                                                        */
/* -------------------------------------------------------------------------- */

const EXECUTIVE_MODULES = new Set([
  "governance",
  "founder_office",
  "people_ops",
  "finance",
  "security",
]);
const EXECUTIVE_ENTITY_HINTS = [
  "department",
  "promotion",
  "transfer",
  "policy",
  "hiring",
  "offer",
  "founder",
  "executive",
  "emergency",
];

export const useExecutiveApprovals = () =>
  useQuery({
    queryKey: ["exec-dash", "executive-approvals"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_approval_requests")
        .select("id, title, module, entity_type, priority, status, due_at, created_at")
        .in("status", ["pending", "in_review", "escalated"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      return (data ?? []).filter((r: any) => {
        if (r.priority === "critical" || r.priority === "high") return true;
        if (EXECUTIVE_MODULES.has(r.module)) return true;
        const hay = `${r.title} ${r.entity_type}`.toLowerCase();
        return EXECUTIVE_ENTITY_HINTS.some((h) => hay.includes(h));
      });
    },
  });

/* -------------------------------------------------------------------------- */
/* Critical Alerts                                                            */
/* -------------------------------------------------------------------------- */

const ALERT_MODULES = ["security", "system", "founder_office", "governance"];
const ALERT_ACTIONS = [
  "security",
  "breach",
  "failed",
  "revoked",
  "suspended",
  "violation",
  "escalated",
  "alert",
  "incident",
];

export const useCriticalAlerts = () =>
  useQuery({
    queryKey: ["exec-dash", "critical-alerts"],
    staleTime: 30_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("id, module, action, target_type, target_id, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      return (data ?? []).filter((a: any) => {
        if (ALERT_MODULES.includes(a.module)) return true;
        return ALERT_ACTIONS.some((k) => a.action?.toLowerCase().includes(k));
      });
    },
  });

/* -------------------------------------------------------------------------- */
/* Company Health                                                             */
/* -------------------------------------------------------------------------- */

export const useCompanyHealth = () =>
  useQuery({
    queryKey: ["exec-dash", "company-health"],
    staleTime: 60_000,
    queryFn: async () => {
      const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const [emp, sessions, failedLogins, securityAudit, pendingApp] =
        await Promise.all([
          supabase.from("employees").select("employment_status"),
          supabase
            .from("employee_sessions")
            .select("id", { count: "exact", head: true })
            .is("revoked_at", null),
          supabase
            .from("login_events")
            .select("id", { count: "exact", head: true })
            .eq("success", false)
            .gte("created_at", since7),
          supabase
            .from("admin_audit_logs")
            .select("id", { count: "exact", head: true })
            .eq("module", "security")
            .gte("created_at", since7),
          supabase
            .from("platform_approval_requests")
            .select("id", { count: "exact", head: true })
            .in("status", ["pending", "in_review"]),
        ]);

      if (emp.error) throw emp.error;
      const rows = emp.data ?? [];
      const total = rows.length;
      const active = rows.filter((r: any) => r.employment_status === "active").length;
      const suspended = rows.filter((r: any) => r.employment_status === "suspended").length;

      const operational = clamp(Math.round(ratio(active, total) * 100));
      const hr = clamp(operational - suspended * 2);
      const security = clamp(100 - (failedLogins.count ?? 0) - (securityAudit.count ?? 0) * 2);
      const system = clamp(100 - Math.min(50, (pendingApp.count ?? 0)));
      const finance = clamp(100 - Math.min(30, suspended * 3));
      const overall = Math.round((operational + hr + security + system + finance) / 5);

      return {
        operational,
        hr,
        security,
        system,
        finance,
        overall,
        activeSessions: sessions.count ?? 0,
        failedLogins7d: failedLogins.count ?? 0,
      };
    },
  });

/* -------------------------------------------------------------------------- */
/* Executive Calendar                                                         */
/* -------------------------------------------------------------------------- */

export const useExecutiveCalendar = () =>
  useQuery({
    queryKey: ["exec-dash", "calendar"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in60 = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);

      const [holidays, cycles] = await Promise.all([
        supabase
          .from("holidays")
          .select("id, name, date, type")
          .gte("date", today)
          .lte("date", in60)
          .order("date")
          .limit(20),
        supabase
          .from("performance_cycles")
          .select("id, name, start_date, end_date, status")
          .gte("end_date", today)
          .order("start_date")
          .limit(10),
      ]);

      const items: Array<{
        id: string;
        title: string;
        date: string;
        kind: "holiday" | "review" | "meeting";
      }> = [];
      (holidays.data ?? []).forEach((h: any) =>
        items.push({ id: `h_${h.id}`, title: h.name, date: h.date, kind: "holiday" }),
      );
      (cycles.data ?? []).forEach((c: any) =>
        items.push({
          id: `c_${c.id}`,
          title: `${c.name} · Review Cycle`,
          date: c.end_date ?? c.start_date,
          kind: "review",
        }),
      );

      return items
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8);
    },
  });

/* -------------------------------------------------------------------------- */
/* Recent Executive Activity                                                  */
/* -------------------------------------------------------------------------- */

const EXECUTIVE_ACTIVITY_MODULES = [
  "governance",
  "founder_office",
  "security",
  "people_ops",
  "compensation",
];

export const useExecutiveActivity = () =>
  useQuery({
    queryKey: ["exec-dash", "activity"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("id, module, action, target_type, target_id, actor_user_id, created_at")
        .in("module", EXECUTIVE_ACTIVITY_MODULES)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

/* -------------------------------------------------------------------------- */
/* System Status                                                              */
/* -------------------------------------------------------------------------- */

export const useSystemStatus = () =>
  useQuery({
    queryKey: ["exec-dash", "system-status"],
    staleTime: 60_000,
    queryFn: async () => {
      const since24 = new Date(Date.now() - 86_400_000).toISOString();
      const [sessions, workflows, notifications] = await Promise.all([
        supabase
          .from("employee_sessions")
          .select("id", { count: "exact", head: true })
          .is("revoked_at", null),
        supabase
          .from("platform_workflow_runs")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("created_at", since24),
        supabase
          .from("platform_notification_deliveries")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("created_at", since24),
      ]);
      return {
        activeSessions: sessions.count ?? 0,
        failedWorkflows24h: workflows.count ?? 0,
        failedNotifications24h: notifications.count ?? 0,
      };
    },
  });

/* -------------------------------------------------------------------------- */
/* Audit dashboard access (fire-and-forget)                                   */
/* -------------------------------------------------------------------------- */

export const useAuditDashboardAccess = () => {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      await supabase.from("admin_audit_logs").insert({
        actor_user_id: data.user.id,
        module: "founder_office",
        action: "executive_dashboard.viewed",
        target_type: "dashboard",
        target_id: "executive",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);
};
