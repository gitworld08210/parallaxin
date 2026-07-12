/**
 * Recruitment hooks — Phase 2.8.
 *
 * Centralized queries + mutations for hiring requests, candidates,
 * applications, interviews, feedback, offers and candidate timeline.
 * Every mutation writes an admin_audit_logs row; the DB triggers
 * automatically maintain the candidate timeline.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type HiringRequest = Tables["hiring_requests"]["Row"];
export type Candidate = Tables["candidates"]["Row"];
export type Application = Tables["applications"]["Row"];
export type InterviewRound = Tables["interview_rounds"]["Row"];
export type InterviewFeedback = Tables["interview_feedback"]["Row"];
export type Offer = Tables["offers"]["Row"];
export type CandidateEvent = Tables["candidate_timeline"]["Row"];

export type HiringRequestStatus = Database["public"]["Enums"]["hiring_request_status"];
export type CandidateStage = Database["public"]["Enums"]["candidate_stage"];
export type OfferStatus = Database["public"]["Enums"]["offer_status"];

const audit = async (a: {
  actor: string | null;
  action: string;
  targetType: string;
  targetId: string;
  after?: unknown;
}) => {
  await supabase.from("admin_audit_logs").insert({
    actor_user_id: a.actor,
    module: "people_ops",
    action: a.action,
    target_type: a.targetType,
    target_id: a.targetId,
    after: (a.after as any) ?? null,
  });
};

const rootKey = ["admin-os", "recruitment"];

// ============================================================
// Hiring requests
// ============================================================
export const useHiringRequests = (filter?: { status?: HiringRequestStatus }) =>
  useQuery({
    queryKey: [...rootKey, "hiring-requests", filter],
    queryFn: async () => {
      let q = supabase
        .from("hiring_requests")
        .select(
          `*, department:admin_departments(id,name,key)`,
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter?.status) q = q.eq("status", filter.status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useHiringRequest = (id?: string) =>
  useQuery({
    queryKey: [...rootKey, "hiring-request", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_requests")
        .select(`*, department:admin_departments(id,name,key)`)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useCreateHiringRequest = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<HiringRequest>) => {
      const { data, error } = await supabase
        .from("hiring_requests")
        .insert({ ...input, requested_by: user?.id, role_title: input.role_title!, reason: input.reason! })
        .select()
        .single();
      if (error) throw error;
      await audit({
        actor: user?.id ?? null,
        action: "hiring_request.create",
        targetType: "hiring_request",
        targetId: data.id,
        after: data,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...rootKey, "hiring-requests"] }),
  });
};

export const useUpdateHiringRequest = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<HiringRequest> }) => {
      const { data, error } = await supabase
        .from("hiring_requests")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await audit({
        actor: user?.id ?? null,
        action: "hiring_request.update",
        targetType: "hiring_request",
        targetId: id,
        after: data,
      });
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [...rootKey, "hiring-requests"] });
      qc.invalidateQueries({ queryKey: [...rootKey, "hiring-request", v.id] });
    },
  });
};

// ============================================================
// Candidates
// ============================================================
export const useCandidates = (filter?: { stage?: CandidateStage; search?: string }) =>
  useQuery({
    queryKey: [...rootKey, "candidates", filter],
    queryFn: async () => {
      let q = supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (filter?.stage) q = q.eq("current_stage", filter.stage);
      if (filter?.search) {
        q = q.or(
          `full_name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,candidate_number.ilike.%${filter.search}%`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCandidate = (id?: string) =>
  useQuery({
    queryKey: [...rootKey, "candidate", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useCreateCandidate = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Candidate>) => {
      const { data, error } = await supabase
        .from("candidates")
        .insert({ ...input, created_by: user?.id, full_name: input.full_name! })
        .select()
        .single();
      if (error) throw error;
      await audit({
        actor: user?.id ?? null,
        action: "candidate.create",
        targetType: "candidate",
        targetId: data.id,
        after: data,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...rootKey, "candidates"] }),
  });
};

export const useUpdateCandidate = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Candidate> }) => {
      const { data, error } = await supabase
        .from("candidates")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await audit({
        actor: user?.id ?? null,
        action: "candidate.update",
        targetType: "candidate",
        targetId: id,
        after: data,
      });
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [...rootKey, "candidates"] });
      qc.invalidateQueries({ queryKey: [...rootKey, "candidate", v.id] });
    },
  });
};

// ============================================================
// Applications
// ============================================================
export const useApplications = (filter?: {
  candidate_id?: string;
  hiring_request_id?: string;
}) =>
  useQuery({
    queryKey: [...rootKey, "applications", filter],
    queryFn: async () => {
      let q = supabase
        .from("applications")
        .select(
          `*, candidate:candidates(id,full_name,candidate_number,email),
           hiring_request:hiring_requests(id,role_title,request_number,department_id)`,
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (filter?.candidate_id) q = q.eq("candidate_id", filter.candidate_id);
      if (filter?.hiring_request_id) q = q.eq("hiring_request_id", filter.hiring_request_id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateApplication = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      candidate_id: string;
      hiring_request_id: string;
      current_stage?: CandidateStage;
    }) => {
      const { data, error } = await supabase
        .from("applications")
        .insert({ ...input, assigned_recruiter: user?.id })
        .select()
        .single();
      if (error) throw error;
      await audit({
        actor: user?.id ?? null,
        action: "application.create",
        targetType: "application",
        targetId: data.id,
        after: data,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...rootKey, "applications"] }),
  });
};

export const useUpdateApplication = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Application> }) => {
      const { data, error } = await supabase
        .from("applications")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await audit({
        actor: user?.id ?? null,
        action: "application.update",
        targetType: "application",
        targetId: id,
        after: data,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...rootKey, "applications"] }),
  });
};

// ============================================================
// Interview rounds
// ============================================================
export const useInterviewRounds = (applicationId?: string) =>
  useQuery({
    queryKey: [...rootKey, "interviews", applicationId],
    enabled: !!applicationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_rounds")
        .select("*")
        .eq("application_id", applicationId!)
        .order("sequence", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useScheduleInterview = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<InterviewRound> & { application_id: string; stage: CandidateStage }) => {
      const { data, error } = await supabase
        .from("interview_rounds")
        .insert({ ...input, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      await audit({
        actor: user?.id ?? null,
        action: "interview.schedule",
        targetType: "interview_round",
        targetId: data.id,
        after: data,
      });
      return data;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: [...rootKey, "interviews", v.application_id] }),
  });
};

export const useUpdateInterview = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<InterviewRound> }) => {
      const { data, error } = await supabase
        .from("interview_rounds")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await audit({
        actor: user?.id ?? null,
        action: "interview.update",
        targetType: "interview_round",
        targetId: id,
        after: data,
      });
      return data;
    },
    onSuccess: (d) =>
      qc.invalidateQueries({ queryKey: [...rootKey, "interviews", d.application_id] }),
  });
};

// ============================================================
// Interview feedback (immutable)
// ============================================================
export const useInterviewFeedback = (roundId?: string) =>
  useQuery({
    queryKey: [...rootKey, "feedback", roundId],
    enabled: !!roundId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_feedback")
        .select("*")
        .eq("round_id", roundId!)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSubmitFeedback = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<InterviewFeedback> & { round_id: string; recommendation: Database["public"]["Enums"]["interview_recommendation"] }) => {
      const { data, error } = await supabase
        .from("interview_feedback")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      await audit({
        actor: user?.id ?? null,
        action: "interview.feedback_submit",
        targetType: "interview_feedback",
        targetId: data.id,
        after: data,
      });
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: [...rootKey, "feedback", d.round_id] });
    },
  });
};

// ============================================================
// Offers
// ============================================================
export const useOffers = (applicationId?: string) =>
  useQuery({
    queryKey: [...rootKey, "offers", applicationId],
    enabled: !!applicationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("application_id", applicationId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAllOffers = (filter?: { status?: OfferStatus }) =>
  useQuery({
    queryKey: [...rootKey, "offers-all", filter],
    queryFn: async () => {
      let q = supabase
        .from("offers")
        .select(
          `*, application:applications(id,candidate_id,hiring_request_id,
             candidate:candidates(id,full_name,candidate_number,email))`,
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter?.status) q = q.eq("status", filter.status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useGenerateOffer = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Offer> & { application_id: string }) => {
      // determine next version
      const { data: existing } = await supabase
        .from("offers")
        .select("version")
        .eq("application_id", input.application_id)
        .order("version", { ascending: false })
        .limit(1);
      const nextVersion = (existing?.[0]?.version ?? 0) + 1;
      const { data, error } = await supabase
        .from("offers")
        .insert({ ...input, version: nextVersion, generated_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      await audit({
        actor: user?.id ?? null,
        action: "offer.generate",
        targetType: "offer",
        targetId: data.id,
        after: data,
      });
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: [...rootKey, "offers", d.application_id] });
      qc.invalidateQueries({ queryKey: [...rootKey, "offers-all"] });
    },
  });
};

export const useUpdateOffer = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Offer> }) => {
      // stamp timestamps based on status transition
      const stamped: Partial<Offer> = { ...patch };
      const now = new Date().toISOString();
      if (patch.status === "approved") stamped.approved_at = now;
      if (patch.status === "sent") stamped.sent_at = now;
      if (patch.status === "accepted") stamped.accepted_at = now;
      if (patch.status === "rejected") stamped.rejected_at = now;
      if (patch.status === "withdrawn") stamped.withdrawn_at = now;
      if (patch.status === "approved") stamped.approved_by = user?.id ?? null;

      const { data, error } = await supabase
        .from("offers")
        .update(stamped)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await audit({
        actor: user?.id ?? null,
        action: `offer.${patch.status ?? "update"}`,
        targetType: "offer",
        targetId: id,
        after: data,
      });
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: [...rootKey, "offers", d.application_id] });
      qc.invalidateQueries({ queryKey: [...rootKey, "offers-all"] });
      qc.invalidateQueries({ queryKey: [...rootKey, "timeline"] });
    },
  });
};

// ============================================================
// Candidate timeline
// ============================================================
export const useCandidateTimeline = (candidateId?: string) =>
  useQuery({
    queryKey: [...rootKey, "timeline", candidateId],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_timeline")
        .select("*")
        .eq("candidate_id", candidateId!)
        .order("event_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

// ============================================================
// Analytics
// ============================================================
export const useRecruitmentAnalytics = () =>
  useQuery({
    queryKey: [...rootKey, "analytics"],
    queryFn: async () => {
      const [hr, cands, apps, offers] = await Promise.all([
        supabase.from("hiring_requests").select("id,status,created_at"),
        supabase.from("candidates").select("id,current_stage,status,created_at"),
        supabase.from("applications").select("id,status,current_stage,applied_at"),
        supabase.from("offers").select("id,status,created_at,accepted_at"),
      ]);

      const hiringRequests = hr.data ?? [];
      const candidates = cands.data ?? [];
      const applications = apps.data ?? [];
      const allOffers = offers.data ?? [];

      const offerAccepted = allOffers.filter((o) => o.status === "accepted").length;
      const offerRejected = allOffers.filter((o) => o.status === "rejected").length;
      const totalOffers = allOffers.length;
      const interviewCount = applications.filter((a) =>
        [
          "hr_interview",
          "technical_interview",
          "manager_interview",
          "founder_interview",
        ].includes(a.current_stage),
      ).length;

      return {
        openRequests: hiringRequests.filter((h) => ["approved", "pending_hr", "pending_founder"].includes(h.status)).length,
        activeCandidates: candidates.filter((c) => c.status === "active").length,
        activeApplications: applications.filter((a) => a.status === "active").length,
        interviewsInProgress: interviewCount,
        offerAcceptanceRate: totalOffers ? Math.round((offerAccepted / totalOffers) * 100) : 0,
        offerRejectionRate: totalOffers ? Math.round((offerRejected / totalOffers) * 100) : 0,
        totalHired: candidates.filter((c) => c.status === "hired").length,
        totalCandidates: candidates.length,
      };
    },
  });
