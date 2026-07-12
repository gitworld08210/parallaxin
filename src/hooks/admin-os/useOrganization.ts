/**
 * Aurelix Admin OS — Organization Structure & Workforce Planning hooks.
 *
 * Shared query/mutation layer used by every Phase 2.5 page. Every write
 * writes an admin_audit_logs entry (module=people_ops, action=org.*).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

/* ---------- Types ---------- */

export interface DepartmentCapacityRow {
  id: string | null;
  department_id: string;
  department_key: string;
  department_name: string;
  max_capacity: number;
  target_capacity: number;
  workload_score: number;
  notes: string | null;
  current_headcount: number;
  vacancies: number;
  capacity_pct: number;
  health: "healthy" | "watch" | "overloaded" | "under";
}

export interface OpenPosition {
  id: string;
  department_id: string;
  role_id: string | null;
  level: string | null;
  title: string;
  reason: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "draft" | "pending_approval" | "approved" | "filled" | "cancelled";
  requested_by: string | null;
  approved_by: string | null;
  expected_joining: string | null;
  filled_by_employee_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  department: { id: string; name: string } | null;
  role: { id: string; name: string } | null;
}

export interface SuccessionPlan {
  id: string;
  scope: "department_head" | "deputy_head" | "team_lead" | "specialist";
  department_id: string | null;
  incumbent_employee_id: string;
  primary_successor_id: string | null;
  secondary_successor_id: string | null;
  readiness_level: "not_ready" | "dev_1y" | "dev_6m" | "ready_now";
  training_progress: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  incumbent?: { id: string; full_name: string; employee_number: string } | null;
  primary_successor?: { id: string; full_name: string; employee_number: string } | null;
  secondary_successor?: { id: string; full_name: string; employee_number: string } | null;
  department?: { id: string; name: string } | null;
}

export interface WorkforceForecast {
  id: string;
  department_id: string;
  period_start: string;
  period_end: string;
  planned_headcount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  department?: { id: string; name: string } | null;
}

/* ---------- Audit helper ---------- */

async function writeAudit(
  actor_user_id: string | null,
  action: string,
  target_type: string,
  target_id: string | null,
  before: any = null,
  after: any = null,
) {
  await supabase.from("admin_audit_logs").insert({
    actor_user_id,
    module: "people_ops",
    action,
    target_type,
    target_id,
    before,
    after,
  });
}

/* ---------- Department Capacity ---------- */

const ACTIVE_STATUSES = ["active", "on_leave", "joining_today"];

export const useDepartmentCapacity = () =>
  useQuery({
    queryKey: ["admin-os", "org", "capacity"],
    queryFn: async (): Promise<DepartmentCapacityRow[]> => {
      const [{ data: depts, error: dErr }, { data: caps, error: cErr }, { data: emps, error: eErr }] =
        await Promise.all([
          supabase.from("admin_departments").select("id, key, name").order("name"),
          supabase.from("department_capacity").select("*"),
          supabase
            .from("employees")
            .select("id, department_id, employment_status")
            .in("employment_status", ACTIVE_STATUSES as any),
        ]);
      if (dErr) throw dErr;
      if (cErr) throw cErr;
      if (eErr) throw eErr;

      const capMap = new Map((caps ?? []).map((c: any) => [c.department_id, c]));
      const countMap = new Map<string, number>();
      (emps ?? []).forEach((e: any) => {
        if (!e.department_id) return;
        countMap.set(e.department_id, (countMap.get(e.department_id) ?? 0) + 1);
      });

      return (depts ?? []).map((d: any) => {
        const cap = capMap.get(d.id);
        const current = countMap.get(d.id) ?? 0;
        const max = cap?.max_capacity ?? 0;
        const target = cap?.target_capacity ?? 0;
        const denom = max || target || Math.max(current, 1);
        const pct = Math.round((current / denom) * 100);
        let health: DepartmentCapacityRow["health"] = "healthy";
        if (target && current < Math.max(1, Math.floor(target * 0.7))) health = "under";
        else if (max && current > max) health = "overloaded";
        else if (max && current / max >= 0.9) health = "watch";
        return {
          id: cap?.id ?? null,
          department_id: d.id,
          department_key: d.key,
          department_name: d.name,
          max_capacity: max,
          target_capacity: target,
          workload_score: cap?.workload_score ?? 50,
          notes: cap?.notes ?? null,
          current_headcount: current,
          vacancies: Math.max(0, target - current),
          capacity_pct: pct,
          health,
        };
      });
    },
  });

export const useUpsertCapacity = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      department_id: string;
      max_capacity: number;
      target_capacity: number;
      workload_score?: number;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("department_capacity")
        .upsert(
          {
            department_id: input.department_id,
            max_capacity: input.max_capacity,
            target_capacity: input.target_capacity,
            workload_score: input.workload_score ?? 50,
            notes: input.notes ?? null,
            updated_by: user?.id ?? null,
          },
          { onConflict: "department_id" },
        )
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, "org.capacity.updated", "department", input.department_id, null, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "org", "capacity"] }),
  });
};

/* ---------- Open Positions ---------- */

export const useOpenPositions = (filters: {
  status?: string;
  departmentId?: string;
  priority?: string;
} = {}) =>
  useQuery({
    queryKey: ["admin-os", "org", "positions", filters],
    queryFn: async (): Promise<OpenPosition[]> => {
      let q = supabase
        .from("open_positions")
        .select(
          `*,
           department:admin_departments!open_positions_department_id_fkey(id,name),
           role:admin_roles!open_positions_role_id_fkey(id,name)`,
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (filters.status) q = q.eq("status", filters.status as any);
      if (filters.departmentId) q = q.eq("department_id", filters.departmentId);
      if (filters.priority) q = q.eq("priority", filters.priority as any);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as OpenPosition[];
    },
  });

export const useUpsertPosition = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<OpenPosition> & { id?: string }) => {
      const payload: any = {
        department_id: input.department_id,
        role_id: input.role_id ?? null,
        level: input.level ?? null,
        title: input.title,
        reason: input.reason ?? null,
        priority: input.priority ?? "medium",
        status: input.status ?? "draft",
        expected_joining: input.expected_joining ?? null,
        notes: input.notes ?? null,
      };
      if (!input.id) payload.requested_by = user?.id ?? null;

      const query = input.id
        ? supabase.from("open_positions").update(payload).eq("id", input.id).select().single()
        : supabase.from("open_positions").insert(payload).select().single();
      const { data, error } = await query;
      if (error) throw error;
      await writeAudit(
        user?.id ?? null,
        input.id ? "org.position.updated" : "org.position.created",
        "open_position",
        (data as any).id,
        null,
        data,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "org", "positions"] }),
  });
};

export const useTransitionPositionStatus = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      to: OpenPosition["status"];
      reason?: string;
      filled_by_employee_id?: string | null;
    }) => {
      const patch: any = { status: input.to };
      if (input.to === "approved") patch.approved_by = user?.id ?? null;
      if (input.to === "filled") patch.filled_by_employee_id = input.filled_by_employee_id ?? null;
      const { data, error } = await supabase
        .from("open_positions")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, `org.position.${input.to}`, "open_position", input.id, null, {
        ...data,
        reason: input.reason,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "org", "positions"] }),
  });
};

/* ---------- Succession Plans ---------- */

export const useSuccessionPlans = () =>
  useQuery({
    queryKey: ["admin-os", "org", "succession"],
    queryFn: async (): Promise<SuccessionPlan[]> => {
      const { data, error } = await supabase
        .from("succession_plans")
        .select(
          `*,
           incumbent:employees!succession_plans_incumbent_employee_id_fkey(id, full_name, employee_number),
           primary_successor:employees!succession_plans_primary_successor_id_fkey(id, full_name, employee_number),
           secondary_successor:employees!succession_plans_secondary_successor_id_fkey(id, full_name, employee_number),
           department:admin_departments!succession_plans_department_id_fkey(id, name)`,
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as SuccessionPlan[];
    },
  });

export const useUpsertSuccession = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<SuccessionPlan> & { id?: string }) => {
      const payload: any = {
        scope: input.scope,
        department_id: input.department_id ?? null,
        incumbent_employee_id: input.incumbent_employee_id,
        primary_successor_id: input.primary_successor_id ?? null,
        secondary_successor_id: input.secondary_successor_id ?? null,
        readiness_level: input.readiness_level ?? "not_ready",
        training_progress: input.training_progress ?? 0,
        notes: input.notes ?? null,
        updated_by: user?.id ?? null,
      };
      const query = input.id
        ? supabase.from("succession_plans").update(payload).eq("id", input.id).select().single()
        : supabase.from("succession_plans").insert(payload).select().single();
      const { data, error } = await query;
      if (error) throw error;
      await writeAudit(
        user?.id ?? null,
        input.id ? "org.succession.updated" : "org.succession.created",
        "succession_plan",
        (data as any).id,
        null,
        data,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "org", "succession"] }),
  });
};

export const useDeleteSuccession = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("succession_plans").delete().eq("id", id);
      if (error) throw error;
      await writeAudit(user?.id ?? null, "org.succession.deleted", "succession_plan", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "org", "succession"] }),
  });
};

/* ---------- Workforce Forecasts ---------- */

export const useWorkforceForecasts = () =>
  useQuery({
    queryKey: ["admin-os", "org", "forecasts"],
    queryFn: async (): Promise<WorkforceForecast[]> => {
      const { data, error } = await supabase
        .from("workforce_forecasts")
        .select(`*, department:admin_departments!workforce_forecasts_department_id_fkey(id, name)`)
        .order("period_start", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as WorkforceForecast[];
    },
  });

export const useUpsertForecast = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<WorkforceForecast> & { id?: string }) => {
      const payload: any = {
        department_id: input.department_id,
        period_start: input.period_start,
        period_end: input.period_end,
        planned_headcount: input.planned_headcount ?? 0,
        notes: input.notes ?? null,
      };
      if (!input.id) payload.created_by = user?.id ?? null;
      const query = input.id
        ? supabase.from("workforce_forecasts").update(payload).eq("id", input.id).select().single()
        : supabase.from("workforce_forecasts").insert(payload).select().single();
      const { data, error } = await query;
      if (error) throw error;
      await writeAudit(
        user?.id ?? null,
        input.id ? "org.forecast.updated" : "org.forecast.created",
        "workforce_forecast",
        (data as any).id,
        null,
        data,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "org", "forecasts"] }),
  });
};

export const useDeleteForecast = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workforce_forecasts").delete().eq("id", id);
      if (error) throw error;
      await writeAudit(user?.id ?? null, "org.forecast.deleted", "workforce_forecast", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "org", "forecasts"] }),
  });
};

/* ---------- Organizational Health aggregate ---------- */

export const useOrganizationalHealth = () => {
  const capacity = useDepartmentCapacity();
  const positions = useOpenPositions();
  const succession = useSuccessionPlans();

  const isLoading = capacity.isLoading || positions.isLoading || succession.isLoading;
  const error = capacity.error || positions.error || succession.error;

  const caps = capacity.data ?? [];
  const pos = positions.data ?? [];
  const succ = succession.data ?? [];

  const totalHeadcount = caps.reduce((s, c) => s + c.current_headcount, 0);
  const totalTarget = caps.reduce((s, c) => s + (c.target_capacity || 0), 0);
  const openHiring = pos.filter((p) => ["approved", "pending_approval"].includes(p.status)).length;
  const criticalOpen = pos.filter(
    (p) => p.priority === "critical" && ["approved", "pending_approval"].includes(p.status),
  ).length;
  const overloaded = caps.filter((c) => c.health === "overloaded").length;
  const under = caps.filter((c) => c.health === "under").length;
  const readyLeaders = succ.filter((s) => s.readiness_level === "ready_now").length;
  const successionCoverage = succ.length
    ? Math.round((succ.filter((s) => !!s.primary_successor_id).length / succ.length) * 100)
    : 0;
  const capacityUtilisation = totalTarget
    ? Math.round((totalHeadcount / totalTarget) * 100)
    : caps.length && caps.some((c) => c.max_capacity)
      ? Math.round(
          (totalHeadcount /
            Math.max(
              1,
              caps.reduce((s, c) => s + (c.max_capacity || 0), 0),
            )) *
            100,
        )
      : 0;

  return {
    isLoading,
    error,
    metrics: {
      totalHeadcount,
      totalTarget,
      openHiring,
      criticalOpen,
      overloaded,
      under,
      readyLeaders,
      successionCoverage,
      capacityUtilisation,
      departmentsTracked: caps.length,
    },
    capacity: caps,
    positions: pos,
    succession: succ,
  };
};
