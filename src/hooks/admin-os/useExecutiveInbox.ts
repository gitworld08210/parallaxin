/**
 * Phase 3.3 — Executive Inbox hooks.
 *
 * Reads and mutates over the platform approval engine with Founder-Office
 * specific extensions (delegations, notes, escalations, timeline).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/services/platform/platform";

const K = (parts: unknown[]) => ["exec-inbox", ...parts];

/* -------------------------------------------------------------------------- */
/* Inbox filters                                                              */
/* -------------------------------------------------------------------------- */

export interface InboxFilters {
  status?: "pending" | "in_review" | "escalated" | "approved" | "rejected" | "cancelled" | "all";
  priority?: "critical" | "high" | "normal" | "low" | "urgent" | "medium" | "all";
  module?: string;
  search?: string;
  overdueOnly?: boolean;
  assignedToMe?: boolean;
}

const OPEN_STATUSES = ["pending", "in_review", "escalated"];

export const useExecutiveInbox = (filters: InboxFilters) =>
  useQuery({
    queryKey: K(["queue", filters]),
    staleTime: 15_000,
    queryFn: async () => {
      let q = supabase
        .from("platform_approval_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (!filters.status || filters.status === "all") {
        q = q.in("status", OPEN_STATUSES);
      } else {
        q = q.eq("status", filters.status);
      }
      if (filters.priority && filters.priority !== "all") q = q.eq("priority", filters.priority);
      if (filters.module) q = q.eq("module", filters.module);
      if (filters.search) {
        q = q.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,entity_type.ilike.%${filters.search}%`,
        );
      }
      if (filters.overdueOnly) q = q.lt("due_at", new Date().toISOString());

      const { data, error } = await q;
      if (error) throw error;

      // Priority ordering: critical → urgent → high → normal/medium → low
      const rank: Record<string, number> = {
        critical: 0,
        urgent: 1,
        high: 2,
        normal: 3,
        medium: 3,
        low: 4,
      };
      return (data ?? []).sort(
        (a: any, b: any) => (rank[a.priority] ?? 5) - (rank[b.priority] ?? 5),
      );
    },
  });

/* -------------------------------------------------------------------------- */
/* Counts for the inbox tabs                                                  */
/* -------------------------------------------------------------------------- */

export const useInboxCounts = () =>
  useQuery({
    queryKey: K(["counts"]),
    staleTime: 30_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const [pending, escalated, overdue, critical, delegated] = await Promise.all([
        supabase
          .from("platform_approval_requests")
          .select("id", { count: "exact", head: true })
          .in("status", OPEN_STATUSES),
        supabase
          .from("platform_approval_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "escalated"),
        supabase
          .from("platform_approval_requests")
          .select("id", { count: "exact", head: true })
          .in("status", OPEN_STATUSES)
          .lt("due_at", nowIso),
        supabase
          .from("platform_approval_requests")
          .select("id", { count: "exact", head: true })
          .in("status", OPEN_STATUSES)
          .eq("priority", "critical"),
        supabase
          .from("executive_delegations")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      return {
        pending: pending.count ?? 0,
        escalated: escalated.count ?? 0,
        overdue: overdue.count ?? 0,
        critical: critical.count ?? 0,
        delegated: delegated.count ?? 0,
      };
    },
  });

/* -------------------------------------------------------------------------- */
/* Single request                                                             */
/* -------------------------------------------------------------------------- */

export const useApprovalRequest = (id: string | undefined) =>
  useQuery({
    queryKey: K(["request", id]),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_approval_requests")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

/* -------------------------------------------------------------------------- */
/* Timeline (composite view)                                                  */
/* -------------------------------------------------------------------------- */

export const useApprovalTimeline = (id: string | undefined) =>
  useQuery({
    queryKey: K(["timeline", id]),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_approval_timeline" as any)
        .select("*")
        .eq("request_id", id!)
        .order("event_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        request_id: string;
        event_kind: string;
        event_at: string;
        actor_id: string | null;
        summary: string;
        metadata: any;
      }>;
    },
  });

/* -------------------------------------------------------------------------- */
/* Decisions                                                                  */
/* -------------------------------------------------------------------------- */

export const useDecideRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      decision:
        | "approved"
        | "rejected"
        | "returned"
        | "info_requested"
        | "scheduled_discussion";
      reason: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated");

      // Return-for-revision, info-requested, and scheduled-discussion keep the
      // request open but record the executive decision entry.
      let nextStatus: string | null = null;
      if (input.decision === "approved") nextStatus = "approved";
      else if (input.decision === "rejected") nextStatus = "rejected";
      else if (input.decision === "returned") nextStatus = "pending";
      else nextStatus = "in_review";

      const { data: before } = await supabase
        .from("platform_approval_requests")
        .select("*")
        .eq("id", input.id)
        .single();

      const patch: any = { status: nextStatus, updated_at: new Date().toISOString() };
      if (input.decision === "approved" || input.decision === "rejected") {
        patch.completed_at = new Date().toISOString();
      }
      const { error: upErr } = await supabase
        .from("platform_approval_requests")
        .update(patch)
        .eq("id", input.id);
      if (upErr) throw upErr;

      const { error: decErr } = await supabase.from("platform_approval_decisions").insert({
        request_id: input.id,
        decided_by: uid,
        decision: input.decision,
        reason: input.reason,
      });
      if (decErr) throw decErr;

      await logAdminAction({
        module: "founder_office",
        action: `executive.${input.decision}`,
        target_type: "approval",
        target_id: input.id,
        before,
        after: { status: nextStatus, reason: input.reason },
      });
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: K(["queue"]) });
      qc.invalidateQueries({ queryKey: K(["counts"]) });
      qc.invalidateQueries({ queryKey: K(["request", vars.id]) });
      qc.invalidateQueries({ queryKey: K(["timeline", vars.id]) });
      qc.invalidateQueries({ queryKey: K(["decisions", vars.id]) });
    },
  });
};

export const useApprovalDecisions = (id: string | undefined) =>
  useQuery({
    queryKey: K(["decisions", id]),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_approval_decisions")
        .select("*")
        .eq("request_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/* -------------------------------------------------------------------------- */
/* Priority mutation (also triggers escalation via DB trigger)                */
/* -------------------------------------------------------------------------- */

export const useSetPriority = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; priority: string; reason?: string }) => {
      const { error } = await supabase
        .from("platform_approval_requests")
        .update({ priority: input.priority as any })
        .eq("id", input.id);
      if (error) throw error;
      await logAdminAction({
        module: "founder_office",
        action: "executive.priority_changed",
        target_type: "approval",
        target_id: input.id,
        after: { priority: input.priority, reason: input.reason ?? null },
      });
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: K(["queue"]) });
      qc.invalidateQueries({ queryKey: K(["request", vars.id]) });
      qc.invalidateQueries({ queryKey: K(["timeline", vars.id]) });
      qc.invalidateQueries({ queryKey: K(["escalations", vars.id]) });
      qc.invalidateQueries({ queryKey: K(["counts"]) });
    },
  });
};

/* -------------------------------------------------------------------------- */
/* Delegations                                                                */
/* -------------------------------------------------------------------------- */

export const useDelegations = (requestId: string | undefined) =>
  useQuery({
    queryKey: K(["delegations", requestId]),
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_delegations")
        .select("*")
        .eq("request_id", requestId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateDelegation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      request_id: string;
      delegated_to: string;
      reason?: string;
      expires_at?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("executive_delegations")
        .insert({
          request_id: input.request_id,
          delegated_by: uid,
          delegated_to: input.delegated_to,
          reason: input.reason ?? null,
          expires_at: input.expires_at ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await logAdminAction({
        module: "founder_office",
        action: "executive.delegated",
        target_type: "approval",
        target_id: input.request_id,
        after: data,
      });
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: K(["delegations", vars.request_id]) });
      qc.invalidateQueries({ queryKey: K(["timeline", vars.request_id]) });
      qc.invalidateQueries({ queryKey: K(["counts"]) });
    },
  });
};

export const useUpdateDelegationStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      request_id: string;
      status: "accepted" | "declined" | "revoked" | "completed";
    }) => {
      const { error } = await supabase
        .from("executive_delegations")
        .update({
          status: input.status,
          responded_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
      await logAdminAction({
        module: "founder_office",
        action: `executive.delegation_${input.status}`,
        target_type: "delegation",
        target_id: input.id,
      });
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: K(["delegations", vars.request_id]) });
      qc.invalidateQueries({ queryKey: K(["timeline", vars.request_id]) });
    },
  });
};

/* -------------------------------------------------------------------------- */
/* Notes                                                                      */
/* -------------------------------------------------------------------------- */

export const useNotes = (requestId: string | undefined) =>
  useQuery({
    queryKey: K(["notes", requestId]),
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_notes")
        .select("*")
        .eq("request_id", requestId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAddNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      request_id: string;
      body: string;
      visibility?: "founder_office" | "shared";
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase.from("executive_notes").insert({
        request_id: input.request_id,
        author_id: uid,
        body: input.body,
        visibility: input.visibility ?? "founder_office",
      });
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: K(["notes", vars.request_id]) });
      qc.invalidateQueries({ queryKey: K(["timeline", vars.request_id]) });
    },
  });
};

/* -------------------------------------------------------------------------- */
/* Escalations                                                                */
/* -------------------------------------------------------------------------- */

export const useEscalations = (requestId: string | undefined) =>
  useQuery({
    queryKey: K(["escalations", requestId]),
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_escalations")
        .select("*")
        .eq("request_id", requestId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useManualEscalate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { request_id: string; reason: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase.from("executive_escalations").insert({
        request_id: input.request_id,
        reason: input.reason,
        triggered_by: "user",
        triggered_by_user: uid,
      });
      if (error) throw error;
      // Also mark request as escalated
      await supabase
        .from("platform_approval_requests")
        .update({ status: "escalated" })
        .eq("id", input.request_id);
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: K(["escalations", vars.request_id]) });
      qc.invalidateQueries({ queryKey: K(["timeline", vars.request_id]) });
      qc.invalidateQueries({ queryKey: K(["queue"]) });
      qc.invalidateQueries({ queryKey: K(["counts"]) });
    },
  });
};

/* -------------------------------------------------------------------------- */
/* Decision log — every executive decision                                    */
/* -------------------------------------------------------------------------- */

export const useDecisionLog = (limit = 100) =>
  useQuery({
    queryKey: K(["decision-log", limit]),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_approval_decisions")
        .select("*, request:platform_approval_requests(id, title, module, entity_type, priority, status)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });

/* -------------------------------------------------------------------------- */
/* My inbound delegations                                                     */
/* -------------------------------------------------------------------------- */

export const useMyDelegations = () =>
  useQuery({
    queryKey: K(["my-delegations"]),
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("executive_delegations")
        .select("*, request:platform_approval_requests(id, title, module, priority, status)")
        .eq("delegated_to", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
