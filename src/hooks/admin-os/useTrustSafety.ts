import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const TS_CATEGORIES = [
  "spam", "fake_account", "impersonation", "harassment", "bullying", "hate_content",
  "violence", "child_safety", "scam", "copyright", "trademark", "privacy",
  "misinformation", "platform_abuse", "other",
] as const;

export const TS_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const TS_STATUSES = ["new", "triage", "investigating", "pending_review", "resolved", "closed"] as const;
export const TS_ENFORCEMENT_TYPES = [
  "warning", "content_removal", "feature_restriction", "temporary_suspension",
  "permanent_ban", "org_restriction", "creator_restriction",
] as const;

export const useTsCases = (filters?: { status?: string; category?: string; assignedToMe?: boolean }) =>
  useQuery({
    queryKey: ["ts-cases", filters],
    queryFn: async () => {
      let q = supabase.from("ts_cases" as any).select("*").order("created_at", { ascending: false }).limit(200);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.category) q = q.eq("category", filters.category);
      if (filters?.assignedToMe) {
        const { data: user } = await supabase.auth.getUser();
        if (user.user?.id) q = q.eq("assigned_to", user.user.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

export const useTsCase = (id?: string) =>
  useQuery({
    queryKey: ["ts-case", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("ts_cases" as any).select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

export const useTsEvidence = (caseId?: string) =>
  useQuery({
    queryKey: ["ts-evidence", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("ts_evidence" as any).select("*").eq("case_id", caseId!).order("submitted_at");
      if (error) throw error;
      return data as any[];
    },
  });

export const useTsNotes = (caseId?: string) =>
  useQuery({
    queryKey: ["ts-notes", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("ts_internal_notes" as any).select("*").eq("case_id", caseId!).order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

export const useTsTimeline = (caseId?: string) =>
  useQuery({
    queryKey: ["ts-timeline", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("ts_case_timeline" as any).select("*").eq("case_id", caseId!).order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

export const useTsEnforcement = (caseId?: string) =>
  useQuery({
    queryKey: ["ts-enforcement", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("ts_enforcement_actions" as any).select("*").eq("case_id", caseId!).order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

export const useTsAppeals = (caseId?: string) =>
  useQuery({
    queryKey: ["ts-appeals", caseId],
    queryFn: async () => {
      let q = supabase.from("ts_appeals" as any).select("*").order("created_at", { ascending: false });
      if (caseId) q = q.eq("case_id", caseId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

export const useTsPolicies = () =>
  useQuery({
    queryKey: ["ts-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ts_policy_references" as any).select("*").eq("is_active", true).order("code");
      if (error) throw error;
      return data as any[];
    },
  });

const logTimeline = async (caseId: string, eventType: string, description: string, metadata: any = {}) => {
  const { data: user } = await supabase.auth.getUser();
  await supabase.from("ts_case_timeline" as any).insert({
    case_id: caseId, event_type: eventType, actor_id: user.user?.id, description, metadata,
  });
};

export const useCreateCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string; description?: string; category: string; severity: string;
      source?: string; subject_user_id?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("ts_cases" as any).insert({
        ...input,
        source: input.source ?? "manual",
        reporter_id: user.user?.id,
        created_by: user.user?.id,
      }).select().single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ts-cases"] });
      toast.success("Case created");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useUpdateCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("ts_cases" as any).update(patch).eq("id", id);
      if (error) throw error;
      await logTimeline(id, "case_updated", "Case updated", patch);
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["ts-case", v.id] });
      qc.invalidateQueries({ queryKey: ["ts-cases"] });
      qc.invalidateQueries({ queryKey: ["ts-timeline", v.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useAssignCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (caseId: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("ts_cases" as any)
        .update({ assigned_to: user.user?.id, status: "investigating" }).eq("id", caseId);
      if (error) throw error;
      await logTimeline(caseId, "case_assigned", "Case assigned");
    },
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ["ts-case", id] });
      qc.invalidateQueries({ queryKey: ["ts-cases"] });
      qc.invalidateQueries({ queryKey: ["ts-timeline", id] });
      toast.success("Assigned to you");
    },
  });
};

export const useAddEvidence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      case_id: string; evidence_type: string; content?: string; file_url?: string; description?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("ts_evidence" as any).insert({
        ...input, submitted_by: user.user?.id, is_locked: true,
      });
      if (error) throw error;
      await logTimeline(input.case_id, "evidence_added", `Evidence: ${input.evidence_type}`, {
        evidence_type: input.evidence_type,
      });
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["ts-evidence", v.case_id] });
      qc.invalidateQueries({ queryKey: ["ts-timeline", v.case_id] });
      toast.success("Evidence added (locked)");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useAddNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { case_id: string; note: string; is_private?: boolean }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("ts_internal_notes" as any).insert({
        ...input, author_id: user.user?.id, is_private: input.is_private ?? true,
      });
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["ts-notes", v.case_id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useApplyEnforcement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      case_id: string; action_type: string; target_type: string; target_id?: string;
      reason: string; policy_reference: string; effective_until?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("ts_enforcement_actions" as any).insert({
        ...input,
        approver_id: user.user?.id,
        created_by: user.user?.id,
      });
      if (error) throw error;
      await supabase.from("ts_cases" as any)
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", input.case_id);
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["ts-enforcement", v.case_id] });
      qc.invalidateQueries({ queryKey: ["ts-case", v.case_id] });
      qc.invalidateQueries({ queryKey: ["ts-cases"] });
      qc.invalidateQueries({ queryKey: ["ts-timeline", v.case_id] });
      toast.success("Enforcement applied");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useReviewAppeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; decision: string; decision_notes: string; case_id: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("ts_appeals" as any).update({
        decision: input.decision,
        decision_notes: input.decision_notes,
        status: "decided",
        reviewer_id: user.user?.id,
        decided_at: new Date().toISOString(),
      }).eq("id", input.id);
      if (error) throw error;
      await logTimeline(input.case_id, "appeal_decided", `Appeal ${input.decision}`, { decision: input.decision });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ts-appeals"] });
      toast.success("Appeal decision recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useTsStats = () =>
  useQuery({
    queryKey: ["ts-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ts_cases" as any).select("status,severity,category,requires_founder_review");
      if (error) throw error;
      const rows = (data as any[]) ?? [];
      return {
        total: rows.length,
        byStatus: rows.reduce((a: any, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {}),
        bySeverity: rows.reduce((a: any, r) => ({ ...a, [r.severity]: (a[r.severity] ?? 0) + 1 }), {}),
        founderReview: rows.filter((r) => r.requires_founder_review).length,
      };
    },
  });
