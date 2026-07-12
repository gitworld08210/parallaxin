import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const logAudit = async (action: string, resource: string, resourceId: string | null, details: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("admin_audit_logs").insert({
    action, resource_type: resource, resource_id: resourceId,
    user_id: user.id, details, severity: "info",
  } as any);
};

/* ============ Automations ============ */
export const useAutomations = (filters?: { status?: string; department?: string }) =>
  useQuery({
    queryKey: ["automations", filters],
    queryFn: async () => {
      let q = supabase.from("executive_automations").select("*").order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.department) q = q.eq("department", filters.department);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAutomation = (id?: string) =>
  useQuery({
    queryKey: ["automation", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("executive_automations").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useSaveAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const isUpdate = !!payload.id;
      const row = { ...payload, ...(isUpdate ? {} : { created_by: user?.id, owner_id: payload.owner_id ?? user?.id }) };
      const { data, error } = isUpdate
        ? await supabase.from("executive_automations").update(row).eq("id", payload.id).select().single()
        : await supabase.from("executive_automations").insert(row).select().single();
      if (error) throw error;
      await logAudit(isUpdate ? "automation.update" : "automation.create", "executive_automation", data.id, { name: data.name });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      qc.invalidateQueries({ queryKey: ["automation"] });
      toast.success("Automation saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });
};

export const useToggleAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data, error } = await supabase.from("executive_automations")
        .update({ is_enabled: enabled, status: enabled ? "active" : "paused" }).eq("id", id).select().single();
      if (error) throw error;
      await logAudit(enabled ? "automation.enable" : "automation.disable", "executive_automation", id, {});
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automation updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Toggle failed"),
  });
};

export const useDeleteAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("executive_automations").delete().eq("id", id);
      if (error) throw error;
      await logAudit("automation.delete", "executive_automation", id, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automation removed");
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });
};

export const useRunAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (automationId: string) => {
      const started = new Date();
      const { data: run, error } = await supabase.from("executive_automation_runs").insert({
        automation_id: automationId, status: "running", trigger_source: "manual",
        started_at: started.toISOString(),
      }).select().single();
      if (error) throw error;
      // Simulated success completion; execution engine can extend this.
      const finished = new Date();
      await supabase.from("executive_automation_runs")
        .update({
          status: "success",
          finished_at: finished.toISOString(),
          duration_ms: finished.getTime() - started.getTime(),
          output: { message: "Manual run acknowledged" },
        }).eq("id", run.id);
      await supabase.from("executive_automations").update({
        last_run_at: finished.toISOString(),
        run_count: ((await supabase.from("executive_automations").select("run_count").eq("id", automationId).single()).data?.run_count ?? 0) + 1,
      }).eq("id", automationId);
      await logAudit("automation.run", "executive_automation", automationId, { run_id: run.id, source: "manual" });
      return run;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      qc.invalidateQueries({ queryKey: ["automation-runs"] });
      toast.success("Automation executed");
    },
    onError: (e: any) => toast.error(e.message ?? "Run failed"),
  });
};

/* ============ Runs ============ */
export const useAutomationRuns = (automationId?: string, limit = 50) =>
  useQuery({
    queryKey: ["automation-runs", automationId, limit],
    queryFn: async () => {
      let q = supabase.from("executive_automation_runs").select("*").order("started_at", { ascending: false }).limit(limit);
      if (automationId) q = q.eq("automation_id", automationId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

/* ============ Schedules ============ */
export const useAutomationSchedules = (automationId?: string) =>
  useQuery({
    queryKey: ["automation-schedules", automationId],
    queryFn: async () => {
      let q = supabase.from("executive_automation_schedules").select("*, executive_automations(name)").order("created_at", { ascending: false });
      if (automationId) q = q.eq("automation_id", automationId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const isUpdate = !!payload.id;
      const { data, error } = isUpdate
        ? await supabase.from("executive_automation_schedules").update(payload).eq("id", payload.id).select().single()
        : await supabase.from("executive_automation_schedules").insert(payload).select().single();
      if (error) throw error;
      await logAudit(isUpdate ? "schedule.update" : "schedule.create", "executive_automation_schedule", data.id, {});
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-schedules"] });
      toast.success("Schedule saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });
};

export const useDeleteSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("executive_automation_schedules").delete().eq("id", id);
      if (error) throw error;
      await logAudit("schedule.delete", "executive_automation_schedule", id, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-schedules"] });
      toast.success("Schedule removed");
    },
  });
};

/* ============ Templates ============ */
export const useAutomationTemplates = () =>
  useQuery({
    queryKey: ["automation-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("executive_automation_templates").select("*").order("category").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const isUpdate = !!payload.id;
      const row = { ...payload, ...(isUpdate ? {} : { created_by: user?.id }) };
      const { data, error } = isUpdate
        ? await supabase.from("executive_automation_templates").update(row).eq("id", payload.id).select().single()
        : await supabase.from("executive_automation_templates").insert(row).select().single();
      if (error) throw error;
      await logAudit(isUpdate ? "template.update" : "template.create", "automation_template", data.id, { name: data.name });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-templates"] });
      toast.success("Template saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });
};

export const useCreateFromTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, name }: { templateId: string; name: string }) => {
      const { data: tpl, error: tErr } = await supabase.from("executive_automation_templates").select("*").eq("id", templateId).single();
      if (tErr) throw tErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("executive_automations").insert({
        name, description: tpl.description, category: tpl.category, department: tpl.department,
        trigger_type: tpl.trigger_type, trigger_config: tpl.trigger_config,
        actions: tpl.actions, tags: tpl.tags, status: "draft",
        owner_id: user?.id, created_by: user?.id,
      }).select().single();
      if (error) throw error;
      await logAudit("automation.from_template", "executive_automation", data.id, { template_id: templateId });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automation created from template");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

/* ============ Reminders ============ */
export const useReminders = (mine = false) =>
  useQuery({
    queryKey: ["reminders", mine],
    queryFn: async () => {
      let q = supabase.from("executive_reminders").select("*").order("remind_at", { ascending: true });
      if (mine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) q = q.eq("recipient_id", user.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const isUpdate = !!payload.id;
      const row = { ...payload, ...(isUpdate ? {} : { created_by: user?.id }) };
      const { data, error } = isUpdate
        ? await supabase.from("executive_reminders").update(row).eq("id", payload.id).select().single()
        : await supabase.from("executive_reminders").insert(row).select().single();
      if (error) throw error;
      await logAudit(isUpdate ? "reminder.update" : "reminder.create", "executive_reminder", data.id, { title: data.title });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });
};

export const useAckReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("executive_reminders").update({
        status: "acknowledged", acknowledged_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      await logAudit("reminder.ack", "executive_reminder", id, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder acknowledged");
    },
  });
};

export const useSnoozeReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, until }: { id: string; until: string }) => {
      const { error } = await supabase.from("executive_reminders").update({
        status: "snoozed", snoozed_until: until,
      }).eq("id", id);
      if (error) throw error;
      await logAudit("reminder.snooze", "executive_reminder", id, { until });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder snoozed");
    },
  });
};

/* ============ Escalations ============ */
export const useAutomationEscalations = () =>
  useQuery({
    queryKey: ["automation-escalations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("executive_automation_escalations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveEscalation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const row = { ...payload, escalated_by: user?.id };
      const { data, error } = await supabase.from("executive_automation_escalations").insert(row).select().single();
      if (error) throw error;
      await logAudit("escalation.create", "automation_escalation", data.id, { reason: data.reason });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-escalations"] });
      toast.success("Escalation created");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useResolveEscalation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase.from("executive_automation_escalations").update({
        status: "resolved", resolved_at: new Date().toISOString(), notes,
      }).eq("id", id);
      if (error) throw error;
      await logAudit("escalation.resolve", "automation_escalation", id, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-escalations"] });
      toast.success("Escalation resolved");
    },
  });
};

/* ============ Monitoring ============ */
export const useAutomationMetrics = () =>
  useQuery({
    queryKey: ["automation-metrics"],
    queryFn: async () => {
      const [autos, runs, reminders, escalations] = await Promise.all([
        supabase.from("executive_automations").select("id,is_enabled,status,failure_count,run_count"),
        supabase.from("executive_automation_runs").select("id,status,duration_ms,started_at").order("started_at", { ascending: false }).limit(200),
        supabase.from("executive_reminders").select("id,status"),
        supabase.from("executive_automation_escalations").select("id,status"),
      ]);
      const list = autos.data ?? [];
      const runList = runs.data ?? [];
      return {
        total: list.length,
        active: list.filter((a: any) => a.is_enabled).length,
        failed: list.filter((a: any) => a.failure_count > 0).length,
        totalRuns: runList.length,
        successRuns: runList.filter((r: any) => r.status === "success").length,
        failedRuns: runList.filter((r: any) => r.status === "failed").length,
        pendingRuns: runList.filter((r: any) => ["pending", "running"].includes(r.status)).length,
        avgDurationMs: runList.filter((r: any) => r.duration_ms).reduce((s: number, r: any) => s + r.duration_ms, 0) /
          Math.max(1, runList.filter((r: any) => r.duration_ms).length),
        pendingReminders: (reminders.data ?? []).filter((r: any) => r.status === "pending").length,
        openEscalations: (escalations.data ?? []).filter((e: any) => e.status === "open").length,
      };
    },
  });
