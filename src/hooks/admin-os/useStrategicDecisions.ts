/**
 * Phase 3.5 — Strategic Decision Center hooks.
 * Founder-Office CRUD for decisions, versions, participants, timeline,
 * impact records, attachments and cross-links.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

export type DecisionStatus =
  | "draft" | "discussion" | "review" | "approved"
  | "implementation" | "monitoring" | "completed" | "archived";

export type DecisionPriority = "low" | "medium" | "high" | "critical";

export interface StrategicDecision {
  id: string;
  decision_code: string;
  title: string;
  summary: string | null;
  business_problem: string | null;
  objectives: string | null;
  alternatives_considered: string | null;
  risk_assessment: string | null;
  expected_benefits: string | null;
  category: string;
  priority: DecisionPriority;
  status: DecisionStatus;
  owner_id: string | null;
  affected_departments: string[];
  effective_date: string | null;
  review_date: string | null;
  completed_date: string | null;
  current_version: number;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const audit = async (action: string, target_id: string | null, meta: any = {}) => {
  try {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("admin_audit_logs").insert({
      actor_user_id: u.user?.id ?? null,
      module: "strategic_decisions",
      action,
      target_type: "strategic_decision",
      target_id: target_id ?? undefined,
      after: meta,
    });
  } catch (e) {
    console.warn("[strategic] audit failed", e);
  }
};

const addTimeline = async (
  decision_id: string, event_type: string, note?: string, metadata: any = {},
) => {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("strategic_decision_timeline" as any).insert({
    decision_id, event_type, actor_id: u.user?.id ?? null, note: note ?? null, metadata,
  });
};

/* ============================================================
 * DECISIONS
 * ============================================================ */
export const useDecisions = (filters?: {
  status?: DecisionStatus | "all";
  category?: string;
  priority?: DecisionPriority | "all";
  search?: string;
}) =>
  useQuery({
    queryKey: ["strat.decisions", filters],
    queryFn: async () => {
      let q = supabase
        .from("strategic_decisions" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.category) q = q.eq("category", filters.category);
      if (filters?.priority && filters.priority !== "all") q = q.eq("priority", filters.priority);
      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(
          `title.ilike.${s},decision_code.ilike.${s},summary.ilike.${s},business_problem.ilike.${s}`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as StrategicDecision[];
    },
  });

export const useDecision = (id?: string) =>
  useQuery({
    enabled: !!id,
    queryKey: ["strat.decision", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_decisions" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as StrategicDecision | null;
    },
  });

export const useCreateDecision = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<StrategicDecision> & {
      title: string; category: string; decision_code: string;
    }) => {
      const payload: any = {
        ...input,
        owner_id: input.owner_id ?? user?.id ?? null,
        created_by: user?.id ?? null,
        status: input.status ?? "draft",
        current_version: 1,
      };
      const { data, error } = await supabase
        .from("strategic_decisions" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      const d = data as any;
      // seed first version snapshot
      await supabase.from("strategic_decision_versions" as any).insert({
        decision_id: d.id,
        version: 1,
        snapshot: d,
        changelog: "Initial draft",
        created_by: user?.id ?? null,
      });
      await addTimeline(d.id, "created", "Decision drafted");
      await audit("strategic.decision.created", d.id, { title: input.title, code: input.decision_code });
      return d as StrategicDecision;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["strat.decisions"] }),
  });
};

export const useUpdateDecision = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id, patch, changelog,
    }: { id: string; patch: Partial<StrategicDecision>; changelog?: string }) => {
      // fetch current
      const { data: cur } = await supabase
        .from("strategic_decisions" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!cur) throw new Error("Decision not found");
      const nextVersion = ((cur as any).current_version ?? 1) + 1;
      const patched = { ...(cur as any), ...patch, current_version: nextVersion };
      const { error } = await supabase
        .from("strategic_decisions" as any)
        .update({ ...patch, current_version: nextVersion })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("strategic_decision_versions" as any).insert({
        decision_id: id,
        version: nextVersion,
        snapshot: patched,
        changelog: changelog ?? null,
        created_by: user?.id ?? null,
      });
      await addTimeline(id, "edited", changelog ?? "Decision updated", { patch });
      await audit("strategic.decision.updated", id, patch);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["strat.decisions"] });
      qc.invalidateQueries({ queryKey: ["strat.decision", v.id] });
      qc.invalidateQueries({ queryKey: ["strat.decision.versions", v.id] });
    },
  });
};

export const useTransitionDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, to, note }: { id: string; to: DecisionStatus; note?: string }) => {
      const patch: any = { status: to };
      if (to === "completed") patch.completed_date = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("strategic_decisions" as any)
        .update(patch)
        .eq("id", id);
      if (error) throw error;
      await addTimeline(id, `status:${to}`, note);
      await audit(`strategic.decision.${to}`, id, { note });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["strat.decisions"] });
      qc.invalidateQueries({ queryKey: ["strat.decision", v.id] });
      qc.invalidateQueries({ queryKey: ["strat.decision.timeline", v.id] });
    },
  });
};

/* ============================================================
 * VERSIONS
 * ============================================================ */
export const useDecisionVersions = (decisionId?: string) =>
  useQuery({
    enabled: !!decisionId,
    queryKey: ["strat.decision.versions", decisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_decision_versions" as any)
        .select("*")
        .eq("decision_id", decisionId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

/* ============================================================
 * PARTICIPANTS
 * ============================================================ */
export const useDecisionParticipants = (decisionId?: string) =>
  useQuery({
    enabled: !!decisionId,
    queryKey: ["strat.decision.participants", decisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_decision_participants" as any)
        .select("*")
        .eq("decision_id", decisionId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useAddParticipant = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { decision_id: string; user_id: string; role: string }) => {
      const { error } = await supabase.from("strategic_decision_participants" as any).insert({
        ...input, added_by: user?.id ?? null,
      });
      if (error) throw error;
      await addTimeline(input.decision_id, "participant_added", `Added ${input.role}`, input);
      await audit("strategic.decision.participant_added", input.decision_id, input);
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["strat.decision.participants", v.decision_id] }),
  });
};

export const useRemoveParticipant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision_id }: { id: string; decision_id: string }) => {
      const { error } = await supabase
        .from("strategic_decision_participants" as any).delete().eq("id", id);
      if (error) throw error;
      await addTimeline(decision_id, "participant_removed", null as any, { id });
      await audit("strategic.decision.participant_removed", decision_id, { id });
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["strat.decision.participants", v.decision_id] }),
  });
};

/* ============================================================
 * TIMELINE
 * ============================================================ */
export const useDecisionTimeline = (decisionId?: string) =>
  useQuery({
    enabled: !!decisionId,
    queryKey: ["strat.decision.timeline", decisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_decision_timeline" as any)
        .select("*")
        .eq("decision_id", decisionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useAddTimelineNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ decision_id, note }: { decision_id: string; note: string }) => {
      await addTimeline(decision_id, "note", note);
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["strat.decision.timeline", v.decision_id] }),
  });
};

/* ============================================================
 * IMPACT
 * ============================================================ */
export const useDecisionImpact = (decisionId?: string) =>
  useQuery({
    enabled: !!decisionId,
    queryKey: ["strat.decision.impact", decisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_decision_impact" as any)
        .select("*")
        .eq("decision_id", decisionId!)
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useAddImpact = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      decision_id: string; kind: string; summary: string; metrics?: any;
    }) => {
      const { error } = await supabase.from("strategic_decision_impact" as any).insert({
        ...input, metrics: input.metrics ?? {}, recorded_by: user?.id ?? null,
      });
      if (error) throw error;
      await addTimeline(input.decision_id, `impact:${input.kind}`, input.summary);
      await audit("strategic.decision.impact_recorded", input.decision_id, input);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["strat.decision.impact", v.decision_id] });
      qc.invalidateQueries({ queryKey: ["strat.decision.timeline", v.decision_id] });
    },
  });
};

/* ============================================================
 * ATTACHMENTS
 * ============================================================ */
const BUCKET = "decision-attachments";

export const useDecisionAttachments = (decisionId?: string) =>
  useQuery({
    enabled: !!decisionId,
    queryKey: ["strat.decision.attachments", decisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_decision_attachments" as any)
        .select("*")
        .eq("decision_id", decisionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useUploadAttachment = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ decisionId, file }: { decisionId: string; file: File }) => {
      const path = `${decisionId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error } = await supabase.from("strategic_decision_attachments" as any).insert({
        decision_id: decisionId,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: user?.id ?? null,
      });
      if (error) throw error;
      await addTimeline(decisionId, "attachment_added", file.name);
      await audit("strategic.decision.attachment_added", decisionId, { name: file.name });
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["strat.decision.attachments", v.decisionId] }),
  });
};

export const attachmentSignedUrl = async (path: string) => {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
};

/* ============================================================
 * DEPENDENCIES / LINKS
 * ============================================================ */
export const useDecisionDependencies = (decisionId?: string) =>
  useQuery({
    enabled: !!decisionId,
    queryKey: ["strat.decision.deps", decisionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_decision_dependencies" as any)
        .select("*")
        .eq("decision_id", decisionId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useAddDependency = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      decision_id: string;
      related_decision_id?: string | null;
      related_policy_id?: string | null;
      related_approval_request_id?: string | null;
      kind?: string;
    }) => {
      const { error } = await supabase.from("strategic_decision_dependencies" as any).insert({
        ...input, kind: input.kind ?? "related", created_by: user?.id ?? null,
      });
      if (error) throw error;
      await addTimeline(input.decision_id, "dependency_added", null as any, input);
      await audit("strategic.decision.dependency_added", input.decision_id, input);
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["strat.decision.deps", v.decision_id] }),
  });
};
