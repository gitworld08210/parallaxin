/**
 * Phase 3.6 — Executive Reports & Analytics hooks.
 * Covers report definitions, scheduled reports, saved reports, generation
 * history, KPI configs, analytics snapshots and mandatory department
 * periodic (weekly / monthly) reports.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const audit = async (
  action: string,
  target_type: string,
  target_id: string | null,
  meta: any = {},
) => {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    await supabase.from("admin_audit_logs").insert({
      actor_user_id: userRes.user?.id ?? null,
      module: "executive_reports",
      action,
      target_type,
      target_id: target_id ?? undefined,
      after: meta,
    });
  } catch (e) {
    console.warn("[exec-reports] audit failed", e);
  }
};

/* =========== Report Definitions =========== */
export const useReportDefinitions = (filters: { scope?: string; category?: string } = {}) =>
  useQuery({
    queryKey: ["exec-reports", "definitions", filters],
    queryFn: async () => {
      let q = supabase
        .from("executive_report_definitions")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (filters.scope) q = q.eq("scope", filters.scope);
      if (filters.category) q = q.eq("category", filters.category);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateReportDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("executive_report_definitions")
        .insert({ ...payload, created_by: u.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      await audit("report_definition.created", "report_definition", data.id, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-reports", "definitions"] }),
  });
};

export const useUpdateReportDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { data, error } = await supabase
        .from("executive_report_definitions")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await audit("report_definition.updated", "report_definition", id, patch);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-reports", "definitions"] }),
  });
};

/* =========== Scheduled Reports =========== */
export const useScheduledReports = () =>
  useQuery({
    queryKey: ["exec-reports", "scheduled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_scheduled_reports")
        .select("*, definition:executive_report_definitions(name,category,scope)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveScheduledReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const isNew = !payload.id;
      const { data, error } = isNew
        ? await supabase
            .from("executive_scheduled_reports")
            .insert({ ...payload, created_by: u.user?.id ?? null })
            .select()
            .single()
        : await supabase
            .from("executive_scheduled_reports")
            .update(payload)
            .eq("id", payload.id)
            .select()
            .single();
      if (error) throw error;
      await audit(
        isNew ? "schedule.created" : "schedule.updated",
        "scheduled_report",
        data.id,
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-reports", "scheduled"] }),
  });
};

export const useDeleteScheduledReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("executive_scheduled_reports")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await audit("schedule.deleted", "scheduled_report", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-reports", "scheduled"] }),
  });
};

/* =========== Saved Reports =========== */
export const useSavedReports = () =>
  useQuery({
    queryKey: ["exec-reports", "saved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_saved_reports")
        .select("*, definition:executive_report_definitions(name,category)")
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("executive_saved_reports")
        .insert({ ...payload, owner_id: u.user?.id })
        .select()
        .single();
      if (error) throw error;
      await audit("report.saved", "saved_report", data.id, {
        title: payload.title,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-reports", "saved"] }),
  });
};

export const useDeleteSavedReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("executive_saved_reports").delete().eq("id", id);
      if (error) throw error;
      await audit("report.saved_deleted", "saved_report", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-reports", "saved"] }),
  });
};

/* =========== Report History (generation runs / exports) =========== */
export const useReportHistory = (limit = 100) =>
  useQuery({
    queryKey: ["exec-reports", "history", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_report_history")
        .select("*, definition:executive_report_definitions(name,category,scope)")
        .order("generated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useRunReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      definition_id,
      format = "pdf",
      filters = {},
    }: {
      definition_id: string;
      format?: string;
      filters?: any;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const started = performance.now();
      const { data, error } = await supabase
        .from("executive_report_history")
        .insert({
          definition_id,
          format,
          filters,
          triggered_by: "manual",
          status: "success",
          duration_ms: Math.round(performance.now() - started),
          generated_by: u.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await audit("report.generated", "report_definition", definition_id, {
        format,
        filters,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-reports", "history"] }),
  });
};

export const useLogExport = () =>
  useMutation({
    mutationFn: async ({
      definition_id,
      format,
      filters = {},
    }: {
      definition_id?: string;
      format: string;
      filters?: any;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("executive_report_history")
        .insert({
          definition_id: definition_id ?? null,
          format,
          filters,
          triggered_by: "manual",
          status: "success",
          generated_by: u.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await audit("report.exported", "report_definition", definition_id ?? null, {
        format,
      });
      return data;
    },
  });

/* =========== KPI Configs =========== */
export const useKpiConfigs = () =>
  useQuery({
    queryKey: ["exec-reports", "kpi-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_kpi_configs")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveKpiConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const isNew = !payload.id;
      const { data, error } = isNew
        ? await supabase
            .from("executive_kpi_configs")
            .insert({ ...payload, created_by: u.user?.id ?? null })
            .select()
            .single()
        : await supabase
            .from("executive_kpi_configs")
            .update(payload)
            .eq("id", payload.id)
            .select()
            .single();
      if (error) throw error;
      await audit(isNew ? "kpi.created" : "kpi.updated", "kpi_config", data.id, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-reports", "kpi-configs"] }),
  });
};

/* =========== Analytics Snapshots =========== */
export const useAnalyticsSnapshots = (params: {
  kpi_code?: string;
  scope?: string;
  period?: string;
  limit?: number;
} = {}) =>
  useQuery({
    queryKey: ["exec-reports", "snapshots", params],
    queryFn: async () => {
      let q = supabase
        .from("executive_analytics_snapshots")
        .select("*")
        .order("period_start", { ascending: false });
      if (params.kpi_code) q = q.eq("kpi_code", params.kpi_code);
      if (params.scope) q = q.eq("scope", params.scope);
      if (params.period) q = q.eq("period", params.period);
      q = q.limit(params.limit ?? 200);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

/* =========== Company Analytics (live aggregates) =========== */
export const useCompanyAnalytics = () =>
  useQuery({
    queryKey: ["exec-reports", "company-analytics"],
    queryFn: async () => {
      const [emp, dept, hires30, leaves30, promos90, offers, cycles] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }),
        supabase.from("admin_departments").select("id", { count: "exact", head: true }),
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
        supabase
          .from("leave_requests")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
        supabase
          .from("passport_promotion_history")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 90 * 864e5).toISOString()),
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase.from("performance_cycles").select("id", { count: "exact", head: true }),
      ]);
      return {
        totalEmployees: emp.count ?? 0,
        totalDepartments: dept.count ?? 0,
        hires30d: hires30.count ?? 0,
        leaves30d: leaves30.count ?? 0,
        promotions90d: promos90.count ?? 0,
        totalOffers: offers.count ?? 0,
        performanceCycles: cycles.count ?? 0,
      };
    },
    staleTime: 30_000,
  });

/* =========== Department Analytics =========== */
export const useDepartmentAnalytics = () =>
  useQuery({
    queryKey: ["exec-reports", "dept-analytics"],
    queryFn: async () => {
      const { data: depts, error } = await supabase
        .from("admin_departments")
        .select("id,name,code");
      if (error) throw error;
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const rows = await Promise.all(
        (depts ?? []).map(async (d: any) => {
          const [emp, deptEmps] = await Promise.all([
            supabase
              .from("employees")
              .select("id", { count: "exact", head: true })
              .eq("department_id", d.id),
            supabase.from("employees").select("id").eq("department_id", d.id),
          ]);
          const empIds = (deptEmps.data ?? []).map((e: any) => e.id);
          let leaveCount = 0;
          if (empIds.length) {
            const { count } = await supabase
              .from("leave_requests")
              .select("id", { count: "exact", head: true })
              .in("employee_id", empIds)
              .gte("created_at", since);
            leaveCount = count ?? 0;
          }
          const employeeCount = emp.count ?? 0;
          const health = Math.max(
            0,
            Math.min(
              100,
              Math.round(100 - Math.min(60, leaveCount * 3) + Math.min(20, employeeCount)),
            ),
          );
          return {
            id: d.id,
            name: d.name,
            code: d.code,
            employeeCount,
            leaveCount,
            healthScore: health,
          };
        }),
      );
      return rows;
    },
  });

/* =========== Department Periodic Reports =========== */
export const usePeriodicReports = (filters: {
  department_id?: string;
  cadence?: string;
  status?: string;
} = {}) =>
  useQuery({
    queryKey: ["exec-reports", "periodic", filters],
    queryFn: async () => {
      let q = supabase
        .from("department_periodic_reports")
        .select("*, department:admin_departments(name,code)")
        .order("period_start", { ascending: false });
      if (filters.department_id) q = q.eq("department_id", filters.department_id);
      if (filters.cadence) q = q.eq("cadence", filters.cadence);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const usePeriodicReport = (id?: string) =>
  useQuery({
    queryKey: ["exec-reports", "periodic", "one", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_periodic_reports")
        .select("*, department:admin_departments(name,code)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useSavePeriodicReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const isNew = !payload.id;
      const { data, error } = isNew
        ? await supabase
            .from("department_periodic_reports")
            .insert({ ...payload, created_by: u.user?.id ?? null })
            .select()
            .single()
        : await supabase
            .from("department_periodic_reports")
            .update(payload)
            .eq("id", payload.id)
            .select()
            .single();
      if (error) throw error;
      await audit(
        isNew ? "periodic_report.created" : "periodic_report.updated",
        "periodic_report",
        data.id,
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-reports", "periodic"] }),
  });
};

export const useSubmitPeriodicReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("department_periodic_reports")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          submitted_by: u.user?.id ?? null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await audit("periodic_report.submitted", "periodic_report", id);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-reports", "periodic"] }),
  });
};

export const useReopenPeriodicReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from("department_periodic_reports")
        .update({ status: "reopened", reopen_reason: reason })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await audit("periodic_report.reopened", "periodic_report", id, { reason });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-reports", "periodic"] }),
  });
};

export const useReportCompliance = () =>
  useQuery({
    queryKey: ["exec-reports", "compliance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_periodic_reports")
        .select("department_id,cadence,status,due_date,department:admin_departments(name)")
        .in("status", ["draft", "submitted", "reopened", "overdue"]);
      if (error) throw error;
      const now = Date.now();
      const map = new Map<string, any>();
      (data ?? []).forEach((r: any) => {
        const key = r.department_id;
        const entry =
          map.get(key) ??
          {
            department_id: key,
            department: r.department?.name ?? "—",
            submitted: 0,
            pending: 0,
            overdue: 0,
            total: 0,
          };
        entry.total += 1;
        if (r.status === "submitted") entry.submitted += 1;
        else if (
          r.status === "overdue" ||
          (r.status !== "submitted" && new Date(r.due_date).getTime() < now)
        )
          entry.overdue += 1;
        else entry.pending += 1;
        map.set(key, entry);
      });
      return Array.from(map.values()).map((e) => ({
        ...e,
        compliance: e.total ? Math.round((e.submitted / e.total) * 100) : 0,
      }));
    },
  });
