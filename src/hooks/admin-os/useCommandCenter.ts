/**
 * Phase 3.7 — Executive Command Center hooks.
 * Covers emergency mode, maintenance windows, announcements, broadcasts,
 * system status, incidents, business continuity, department lockdowns
 * and executive watchlists. All writes are Founder-Office only.
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
      module: "command_center",
      action,
      target_type,
      target_id: target_id ?? undefined,
      after: meta,
    });
  } catch (e) {
    console.warn("[command-center] audit failed", e);
  }
};

/* =========== Emergency Mode =========== */
export const useEmergencyEvents = () =>
  useQuery({
    queryKey: ["cmd", "emergency"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_emergency_events")
        .select("*")
        .order("activated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useActiveEmergency = () =>
  useQuery({
    queryKey: ["cmd", "emergency", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_emergency_events")
        .select("*")
        .eq("status", "active")
        .order("activated_at", { ascending: false })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
  });

export const useActivateEmergency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("executive_emergency_events")
        .insert({ ...payload, activated_by: u.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      await audit("emergency.activated", "emergency", data.id, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "emergency"] }),
  });
};

export const useEndEmergency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, end_reason }: { id: string; end_reason: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("executive_emergency_events")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          ended_by: u.user?.id ?? null,
          end_reason,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await audit("emergency.ended", "emergency", id, { end_reason });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "emergency"] }),
  });
};

/* =========== Maintenance =========== */
export const useMaintenanceWindows = () =>
  useQuery({
    queryKey: ["cmd", "maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_maintenance_windows")
        .select("*")
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const isNew = !payload.id;
      const { data, error } = isNew
        ? await supabase
            .from("executive_maintenance_windows")
            .insert({ ...payload, created_by: u.user?.id ?? null })
            .select()
            .single()
        : await supabase
            .from("executive_maintenance_windows")
            .update(payload)
            .eq("id", payload.id)
            .select()
            .single();
      if (error) throw error;
      await audit(
        isNew ? "maintenance.scheduled" : "maintenance.updated",
        "maintenance",
        data.id,
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "maintenance"] }),
  });
};

export const useCancelMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("executive_maintenance_windows")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
      await audit("maintenance.cancelled", "maintenance", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "maintenance"] }),
  });
};

/* =========== Announcements =========== */
export const useAnnouncements = (statusFilter?: string) =>
  useQuery({
    queryKey: ["cmd", "announcements", statusFilter ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("executive_announcements")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const isNew = !payload.id;
      const { data, error } = isNew
        ? await supabase
            .from("executive_announcements")
            .insert({ ...payload, created_by: u.user?.id ?? null })
            .select()
            .single()
        : await supabase
            .from("executive_announcements")
            .update(payload)
            .eq("id", payload.id)
            .select()
            .single();
      if (error) throw error;
      await audit(
        isNew ? "announcement.created" : "announcement.updated",
        "announcement",
        data.id,
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "announcements"] }),
  });
};

export const usePublishAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("executive_announcements")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await audit("announcement.published", "announcement", id);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "announcements"] }),
  });
};

export const useArchiveAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("executive_announcements")
        .update({ status: "archived" })
        .eq("id", id);
      if (error) throw error;
      await audit("announcement.archived", "announcement", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "announcements"] }),
  });
};

/* =========== Broadcasts =========== */
export const useBroadcasts = () =>
  useQuery({
    queryKey: ["cmd", "broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_broadcasts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveBroadcast = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("executive_broadcasts")
        .insert({ ...payload, created_by: u.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      await audit("broadcast.created", "broadcast", data.id, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "broadcasts"] }),
  });
};

export const useSendBroadcast = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (broadcast_id: string) => {
      // Resolve recipients based on audience type
      const { data: b } = await supabase
        .from("executive_broadcasts")
        .select("*")
        .eq("id", broadcast_id)
        .single();
      const audience: any = b?.audience ?? {};
      let userIds: string[] = [];
      if (audience.type === "employees" && Array.isArray(audience.user_ids)) {
        userIds = audience.user_ids;
      } else if (audience.type === "department" && audience.department_ids?.length) {
        const { data: emps } = await supabase
          .from("employees")
          .select("user_id")
          .in("department_id", audience.department_ids);
        userIds = (emps ?? []).map((e: any) => e.user_id).filter(Boolean);
      } else {
        const { data: emps } = await supabase
          .from("employees")
          .select("user_id");
        userIds = (emps ?? []).map((e: any) => e.user_id).filter(Boolean);
      }
      const now = new Date().toISOString();
      if (userIds.length) {
        await supabase
          .from("executive_broadcast_deliveries")
          .upsert(
            userIds.map((uid) => ({
              broadcast_id,
              user_id: uid,
              status: "delivered" as const,
              delivered_at: now,
            })),
            { onConflict: "broadcast_id,user_id" },
          );
      }
      const { data, error } = await supabase
        .from("executive_broadcasts")
        .update({ status: "sent", sent_at: now })
        .eq("id", broadcast_id)
        .select()
        .single();
      if (error) throw error;
      await audit("broadcast.sent", "broadcast", broadcast_id, {
        recipients: userIds.length,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "broadcasts"] }),
  });
};

export const useBroadcastDeliveries = (broadcast_id?: string) =>
  useQuery({
    queryKey: ["cmd", "deliveries", broadcast_id],
    enabled: !!broadcast_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_broadcast_deliveries")
        .select("*")
        .eq("broadcast_id", broadcast_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/* =========== System Status =========== */
export const useSystemStatus = () =>
  useQuery({
    queryKey: ["cmd", "system-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_system_status")
        .select("*")
        .order("service");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

export const useUpdateSystemStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, message }: any) => {
      const { data, error } = await supabase
        .from("executive_system_status")
        .update({ status, message, last_checked_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await audit("system_status.updated", "system_status", id, { status, message });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "system-status"] }),
  });
};

/* =========== Incidents =========== */
export const useIncidents = (statusFilter?: string) =>
  useQuery({
    queryKey: ["cmd", "incidents", statusFilter ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("executive_incidents")
        .select("*")
        .order("detected_at", { ascending: false });
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useIncident = (id?: string) =>
  useQuery({
    queryKey: ["cmd", "incident", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_incidents")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useIncidentTimeline = (id?: string) =>
  useQuery({
    queryKey: ["cmd", "incident-timeline", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_incident_updates")
        .select("*")
        .eq("incident_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveIncident = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const isNew = !payload.id;
      const { data, error } = isNew
        ? await supabase
            .from("executive_incidents")
            .insert({ ...payload, created_by: u.user?.id ?? null })
            .select()
            .single()
        : await supabase
            .from("executive_incidents")
            .update(payload)
            .eq("id", payload.id)
            .select()
            .single();
      if (error) throw error;
      await audit(
        isNew ? "incident.created" : "incident.updated",
        "incident",
        data.id,
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "incidents"] }),
  });
};

export const useAddIncidentUpdate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      incident_id,
      note,
      status,
    }: {
      incident_id: string;
      note: string;
      status?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("executive_incident_updates")
        .insert({ incident_id, note, status, updated_by: u.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      if (status) {
        await supabase
          .from("executive_incidents")
          .update({
            status,
            resolved_at: ["resolved", "closed"].includes(status)
              ? new Date().toISOString()
              : null,
          })
          .eq("id", incident_id);
      }
      await audit("incident.updated", "incident", incident_id, { note, status });
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["cmd", "incidents"] });
      qc.invalidateQueries({ queryKey: ["cmd", "incident-timeline", v.incident_id] });
      qc.invalidateQueries({ queryKey: ["cmd", "incident", v.incident_id] });
    },
  });
};

/* =========== Business Continuity =========== */
export const useContinuityPlans = () =>
  useQuery({
    queryKey: ["cmd", "bcp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_continuity_plans")
        .select("*, department:admin_departments(name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveContinuityPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const isNew = !payload.id;
      const { data, error } = isNew
        ? await supabase
            .from("executive_continuity_plans")
            .insert({ ...payload, created_by: u.user?.id ?? null })
            .select()
            .single()
        : await supabase
            .from("executive_continuity_plans")
            .update(payload)
            .eq("id", payload.id)
            .select()
            .single();
      if (error) throw error;
      await audit(
        isNew ? "bcp.created" : "bcp.updated",
        "continuity_plan",
        data.id,
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "bcp"] }),
  });
};

/* =========== Department Lockdowns =========== */
export const useLockdowns = () =>
  useQuery({
    queryKey: ["cmd", "lockdowns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_department_lockdowns")
        .select("*, department:admin_departments(name)")
        .order("activated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useActivateLockdown = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("executive_department_lockdowns")
        .insert({ ...payload, activated_by: u.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      await audit("lockdown.activated", "lockdown", data.id, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "lockdowns"] }),
  });
};

export const useEndLockdown = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("executive_department_lockdowns")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          ended_by: u.user?.id ?? null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await audit("lockdown.ended", "lockdown", id);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "lockdowns"] }),
  });
};

/* =========== Watchlists =========== */
export const useWatchlists = () =>
  useQuery({
    queryKey: ["cmd", "watchlists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_watchlists")
        .select("*, items:executive_watchlist_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveWatchlist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const isNew = !payload.id;
      const { data, error } = isNew
        ? await supabase
            .from("executive_watchlists")
            .insert({ ...payload, owner_id: u.user?.id ?? null })
            .select()
            .single()
        : await supabase
            .from("executive_watchlists")
            .update(payload)
            .eq("id", payload.id)
            .select()
            .single();
      if (error) throw error;
      await audit(
        isNew ? "watchlist.created" : "watchlist.updated",
        "watchlist",
        data.id,
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "watchlists"] }),
  });
};

export const useAddWatchlistItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("executive_watchlist_items")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      await audit("watchlist.item_added", "watchlist_item", data.id, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "watchlists"] }),
  });
};

export const useDeleteWatchlistItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("executive_watchlist_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await audit("watchlist.item_removed", "watchlist_item", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmd", "watchlists"] }),
  });
};
