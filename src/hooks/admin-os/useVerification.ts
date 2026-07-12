import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type VerStatus =
  | "pending" | "under_review" | "info_required" | "approved"
  | "rejected" | "suspended" | "revoked" | "expired";
export type VerType =
  | "individual" | "creator" | "organization" | "business"
  | "employee" | "public_figure" | "government" | "education";
export type BadgeKind =
  | "blue" | "organization" | "business" | "employee_affiliation"
  | "creator" | "public_figure" | "government" | "education";

export function useVerApplications(filters?: { status?: VerStatus; type?: VerType }) {
  return useQuery({
    queryKey: ["ver-applications", filters],
    queryFn: async () => {
      let q = supabase.from("ver_applications").select("*").order("submitted_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.type) q = q.eq("ver_type", filters.type);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVerApplication(id?: string) {
  return useQuery({
    queryKey: ["ver-application", id],
    enabled: !!id,
    queryFn: async () => {
      const [a, docs, revs, hist] = await Promise.all([
        supabase.from("ver_applications").select("*").eq("id", id!).maybeSingle(),
        supabase.from("ver_documents").select("*").eq("application_id", id!).order("created_at"),
        supabase.from("ver_reviews").select("*").eq("application_id", id!).order("created_at"),
        supabase.from("ver_history").select("*").eq("application_id", id!).order("created_at", { ascending: false }),
      ]);
      if (a.error) throw a.error;
      return {
        application: a.data,
        documents: docs.data ?? [],
        reviews: revs.data ?? [],
        history: hist.data ?? [],
      };
    },
  });
}

export function useVerBadges() {
  return useQuery({
    queryKey: ["ver-badges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ver_badges").select("*")
        .order("issued_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVerAffiliations() {
  return useQuery({
    queryKey: ["ver-affiliations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ver_affiliations").select("*")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVerAppeals() {
  return useQuery({
    queryKey: ["ver-appeals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ver_appeals").select("*")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateVerApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ver_type: VerType;
      subject_display_name: string;
      priority?: string;
      submission_notes?: string;
      requires_dual_review?: boolean;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("ver_applications").insert({
        ver_type: input.ver_type,
        subject_display_name: input.subject_display_name,
        priority: input.priority ?? "normal",
        submission_notes: input.submission_notes,
        requires_dual_review: input.requires_dual_review ?? false,
        submitted_by: u.user?.id,
        subject_user_id: u.user?.id,
        application_number: "",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Verification application submitted");
      qc.invalidateQueries({ queryKey: ["ver-applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VerStatus }) => {
      const patch: Record<string, unknown> = { status };
      if (["approved", "rejected", "revoked", "suspended"].includes(status)) {
        patch.decided_at = new Date().toISOString();
      }
      const { error } = await supabase.from("ver_applications").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      toast.success("Application updated");
      qc.invalidateQueries({ queryKey: ["ver-applications"] });
      qc.invalidateQueries({ queryKey: ["ver-application", v.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      application_id: string;
      decision: VerStatus;
      reason: string;
      policy_refs: string[];
      evidence?: unknown[];
      is_final?: boolean;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!input.reason?.trim()) throw new Error("Reason required");
      if (!input.policy_refs?.length) throw new Error("At least one policy reference required");
      const { error } = await supabase.from("ver_reviews").insert({
        application_id: input.application_id,
        reviewer_id: u.user!.id,
        decision: input.decision,
        reason: input.reason,
        policy_refs: input.policy_refs,
        evidence: (input.evidence ?? []) as never,
        is_final: input.is_final ?? true,
      });
      if (error) throw error;
      // Cascade status
      await supabase.from("ver_applications")
        .update({ status: input.decision, decided_at: new Date().toISOString() })
        .eq("id", input.application_id);
    },
    onSuccess: (_r, v) => {
      toast.success("Review recorded");
      qc.invalidateQueries({ queryKey: ["ver-application", v.application_id] });
      qc.invalidateQueries({ queryKey: ["ver-applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useIssueBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      application_id: string;
      subject_user_id?: string | null;
      badge_kind: BadgeKind;
      expires_at?: string | null;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      // Confirm application approved
      const { data: app, error: e1 } = await supabase
        .from("ver_applications").select("status,subject_user_id")
        .eq("id", input.application_id).maybeSingle();
      if (e1) throw e1;
      if (!app || app.status !== "approved") {
        throw new Error("Application must be approved before issuing a badge");
      }
      const { error } = await supabase.from("ver_badges").insert({
        application_id: input.application_id,
        subject_user_id: input.subject_user_id ?? app.subject_user_id,
        badge_kind: input.badge_kind,
        issued_by: u.user!.id,
        expires_at: input.expires_at ?? null,
        verification_id: "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Badge issued");
      qc.invalidateQueries({ queryKey: ["ver-badges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRevokeBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (!reason.trim()) throw new Error("Revocation reason required");
      const { error } = await supabase.from("ver_badges").update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Badge revoked");
      qc.invalidateQueries({ queryKey: ["ver-badges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateAffiliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      affiliation_kind: "employee_org" | "creator_brand" | "executive_company" | "partner_org";
      subject_user_id?: string | null;
      organization_name: string;
      role_label?: string;
      effective_from?: string;
      effective_to?: string | null;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("ver_affiliations").insert({
        affiliation_kind: input.affiliation_kind,
        subject_user_id: input.subject_user_id ?? u.user?.id ?? null,
        organization_name: input.organization_name,
        role_label: input.role_label,
        effective_from: input.effective_from ?? new Date().toISOString().slice(0, 10),
        effective_to: input.effective_to ?? null,
        status: "approved",
        approved_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Affiliation recorded");
      qc.invalidateQueries({ queryKey: ["ver-affiliations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDecideAppeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: VerStatus; notes: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("ver_appeals").update({
        status, decision_notes: notes, decided_at: new Date().toISOString(),
        reviewer_id: u.user?.id,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appeal decided");
      qc.invalidateQueries({ queryKey: ["ver-appeals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
