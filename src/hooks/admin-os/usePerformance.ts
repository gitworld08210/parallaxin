/**
 * Aurelix Admin OS — Performance Management hooks (Phase 2.6).
 *
 * All performance surfaces (cycles, KPIs, goals, reviews, ratings,
 * recognitions, PIP, career progress, promotion readiness) query and
 * mutate through this single hook module. Every mutation writes an
 * admin_audit_logs entry under module=people_ops with action prefixes
 * `perf.*`, `goal.*`, `review.*`, `rating.*`, `recognition.*`, `pip.*`,
 * `career.*`, `promotion.*`.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

/* ---------- Types ---------- */

export type CyclePeriod = "monthly" | "quarterly" | "half_yearly" | "annual";
export type CycleStatus = "draft" | "active" | "in_review" | "closed";
export type GoalPriority = "low" | "medium" | "high" | "critical";
export type GoalStatus =
  | "not_started"
  | "in_progress"
  | "at_risk"
  | "completed"
  | "missed"
  | "cancelled";
export type ReviewStage = "self" | "team_lead" | "department_head" | "hr" | "finalized";
export type ReviewerRole = "self" | "team_lead" | "department_head" | "hr";
export type RecognitionType =
  | "award"
  | "achievement"
  | "outstanding"
  | "innovation"
  | "leadership"
  | "special";
export type PipStatus =
  | "draft"
  | "active"
  | "on_track"
  | "off_track"
  | "completed"
  | "failed"
  | "cancelled";
export type ReadinessLevel =
  | "not_ready"
  | "emerging"
  | "developing"
  | "ready_soon"
  | "ready_now";

export interface PerformanceCycle {
  id: string;
  name: string;
  period_type: CyclePeriod;
  start_date: string;
  end_date: string;
  status: CycleStatus;
  department_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  department?: { id: string; name: string } | null;
}

export interface PerformanceKpi {
  id: string;
  department_id: string;
  name: string;
  description: string | null;
  unit: string | null;
  target_value: number | null;
  weightage: number;
  is_active: boolean;
  department?: { id: string; name: string } | null;
}

export interface PerformanceGoal {
  id: string;
  employee_id: string;
  cycle_id: string | null;
  department_id: string | null;
  kpi_id: string | null;
  title: string;
  description: string | null;
  priority: GoalPriority;
  weightage: number;
  is_team_goal: boolean;
  due_date: string | null;
  status: GoalStatus;
  progress: number;
  assigned_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: { id: string; full_name: string; employee_number: string } | null;
  cycle?: { id: string; name: string } | null;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  cycle_id: string;
  current_stage: ReviewStage;
  overall_rating: number | null;
  finalized: boolean;
  finalized_at: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  employee?: { id: string; full_name: string; employee_number: string } | null;
  cycle?: { id: string; name: string } | null;
}

export interface PerformanceRating {
  id: string;
  review_id: string;
  reviewer_role: ReviewerRole;
  reviewer_id: string | null;
  overall_rating: number;
  category_ratings: Record<string, number>;
  strengths: string | null;
  weaknesses: string | null;
  improvement_suggestions: string | null;
  comments: string | null;
  submitted_at: string;
}

export interface Recognition {
  id: string;
  employee_id: string;
  cycle_id: string | null;
  type: RecognitionType;
  title: string;
  description: string | null;
  awarded_by: string | null;
  awarded_at: string;
  employee?: { id: string; full_name: string; employee_number: string } | null;
}

export interface ImprovementPlan {
  id: string;
  employee_id: string;
  coach_id: string | null;
  objectives: string;
  timeline_start: string;
  timeline_end: string;
  review_dates: string[];
  progress: number;
  status: PipStatus;
  final_outcome: string | null;
  created_at: string;
  updated_at: string;
  employee?: { id: string; full_name: string; employee_number: string } | null;
  coach?: { id: string; full_name: string } | null;
}

export interface CareerProgress {
  id: string;
  employee_id: string;
  current_level: string | null;
  target_level: string | null;
  required_skills: string[];
  training_needed: string[];
  experience_required_months: number;
  progress: number;
  notes: string | null;
  updated_at: string;
}

export interface PromotionReadiness {
  id: string;
  employee_id: string;
  performance_score: number;
  skills_score: number;
  training_score: number;
  audit_score: number;
  department_recommendation: boolean;
  readiness_level: ReadinessLevel;
  overall_score: number;
  notes: string | null;
  computed_at: string;
  employee?: { id: string; full_name: string; employee_number: string; level: string | null } | null;
}

/* ---------- Audit ---------- */

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

/* ---------- Cycles ---------- */

export const usePerformanceCycles = () =>
  useQuery({
    queryKey: ["admin-os", "perf", "cycles"],
    queryFn: async (): Promise<PerformanceCycle[]> => {
      const { data, error } = await supabase
        .from("performance_cycles")
        .select("*, department:admin_departments!performance_cycles_department_id_fkey(id,name)")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PerformanceCycle[];
    },
  });

export const useUpsertCycle = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<PerformanceCycle> & { id?: string }) => {
      const payload: any = {
        name: input.name,
        period_type: input.period_type,
        start_date: input.start_date,
        end_date: input.end_date,
        status: input.status ?? "draft",
        department_id: input.department_id ?? null,
        notes: input.notes ?? null,
      };
      if (!input.id) payload.created_by = user?.id ?? null;
      const query = input.id
        ? supabase.from("performance_cycles").update(payload).eq("id", input.id).select().single()
        : supabase.from("performance_cycles").insert(payload).select().single();
      const { data, error } = await query;
      if (error) throw error;
      await writeAudit(
        user?.id ?? null,
        input.id ? "perf.cycle.updated" : "perf.cycle.created",
        "performance_cycle",
        (data as any).id,
        null,
        data,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "perf", "cycles"] }),
  });
};

/* ---------- KPIs ---------- */

export const useKpis = (departmentId?: string) =>
  useQuery({
    queryKey: ["admin-os", "perf", "kpis", departmentId ?? "all"],
    queryFn: async (): Promise<PerformanceKpi[]> => {
      let q = supabase
        .from("performance_kpis")
        .select("*, department:admin_departments!performance_kpis_department_id_fkey(id,name)")
        .order("name");
      if (departmentId) q = q.eq("department_id", departmentId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PerformanceKpi[];
    },
  });

export const useUpsertKpi = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<PerformanceKpi> & { id?: string }) => {
      const payload: any = {
        department_id: input.department_id,
        name: input.name,
        description: input.description ?? null,
        unit: input.unit ?? null,
        target_value: input.target_value ?? null,
        weightage: input.weightage ?? 10,
        is_active: input.is_active ?? true,
      };
      if (!input.id) payload.created_by = user?.id ?? null;
      const query = input.id
        ? supabase.from("performance_kpis").update(payload).eq("id", input.id).select().single()
        : supabase.from("performance_kpis").insert(payload).select().single();
      const { data, error } = await query;
      if (error) throw error;
      await writeAudit(
        user?.id ?? null,
        input.id ? "perf.kpi.updated" : "perf.kpi.created",
        "performance_kpi",
        (data as any).id,
        null,
        data,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "perf", "kpis"] }),
  });
};

/* ---------- Goals ---------- */

export const useGoals = (filters: { employeeId?: string; cycleId?: string; status?: GoalStatus } = {}) =>
  useQuery({
    queryKey: ["admin-os", "perf", "goals", filters],
    queryFn: async (): Promise<PerformanceGoal[]> => {
      let q = supabase
        .from("performance_goals")
        .select(
          `*,
           employee:employees!performance_goals_employee_id_fkey(id,full_name,employee_number),
           cycle:performance_cycles!performance_goals_cycle_id_fkey(id,name)`,
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (filters.employeeId) q = q.eq("employee_id", filters.employeeId);
      if (filters.cycleId) q = q.eq("cycle_id", filters.cycleId);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PerformanceGoal[];
    },
  });

export const useUpsertGoal = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<PerformanceGoal> & { id?: string }) => {
      const payload: any = {
        employee_id: input.employee_id,
        cycle_id: input.cycle_id ?? null,
        department_id: input.department_id ?? null,
        kpi_id: input.kpi_id ?? null,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? "medium",
        weightage: input.weightage ?? 10,
        is_team_goal: input.is_team_goal ?? false,
        due_date: input.due_date ?? null,
        status: input.status ?? "not_started",
        progress: input.progress ?? 0,
      };
      if (!input.id) payload.assigned_by = user?.id ?? null;
      if (payload.status === "completed") payload.completed_at = new Date().toISOString();
      const query = input.id
        ? supabase.from("performance_goals").update(payload).eq("id", input.id).select().single()
        : supabase.from("performance_goals").insert(payload).select().single();
      const { data, error } = await query;
      if (error) throw error;
      await writeAudit(
        user?.id ?? null,
        input.id ? "goal.updated" : "goal.created",
        "performance_goal",
        (data as any).id,
        null,
        data,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "perf", "goals"] }),
  });
};

export const useUpdateGoalProgress = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; progress: number; status?: GoalStatus }) => {
      const patch: any = { progress: input.progress };
      if (input.status) patch.status = input.status;
      if (input.status === "completed") patch.completed_at = new Date().toISOString();
      const { data, error } = await supabase
        .from("performance_goals")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, "goal.progress_updated", "performance_goal", input.id, null, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "perf", "goals"] }),
  });
};

/* ---------- Reviews & Ratings ---------- */

export const useReviews = (filters: { employeeId?: string; cycleId?: string; stage?: ReviewStage } = {}) =>
  useQuery({
    queryKey: ["admin-os", "perf", "reviews", filters],
    queryFn: async (): Promise<PerformanceReview[]> => {
      let q = supabase
        .from("performance_reviews")
        .select(
          `*,
           employee:employees!performance_reviews_employee_id_fkey(id,full_name,employee_number),
           cycle:performance_cycles!performance_reviews_cycle_id_fkey(id,name)`,
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (filters.employeeId) q = q.eq("employee_id", filters.employeeId);
      if (filters.cycleId) q = q.eq("cycle_id", filters.cycleId);
      if (filters.stage) q = q.eq("current_stage", filters.stage);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PerformanceReview[];
    },
  });

export const useReviewRatings = (reviewId: string | undefined) =>
  useQuery({
    queryKey: ["admin-os", "perf", "ratings", reviewId],
    enabled: !!reviewId,
    queryFn: async (): Promise<PerformanceRating[]> => {
      const { data, error } = await supabase
        .from("performance_ratings")
        .select("*")
        .eq("review_id", reviewId!)
        .order("submitted_at");
      if (error) throw error;
      return (data ?? []) as unknown as PerformanceRating[];
    },
  });

export const useEnsureReview = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { employee_id: string; cycle_id: string }) => {
      const { data: existing } = await supabase
        .from("performance_reviews")
        .select("*")
        .eq("employee_id", input.employee_id)
        .eq("cycle_id", input.cycle_id)
        .maybeSingle();
      if (existing) return existing;
      const { data, error } = await supabase
        .from("performance_reviews")
        .insert({ employee_id: input.employee_id, cycle_id: input.cycle_id })
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, "review.created", "performance_review", data.id, null, data);
      return data;
    },
  });
};

export const useSubmitRating = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      review_id: string;
      reviewer_role: ReviewerRole;
      overall_rating: number;
      category_ratings?: Record<string, number>;
      strengths?: string | null;
      weaknesses?: string | null;
      improvement_suggestions?: string | null;
      comments?: string | null;
      advanceStage?: ReviewStage;
    }) => {
      const { data, error } = await supabase
        .from("performance_ratings")
        .upsert(
          {
            review_id: input.review_id,
            reviewer_role: input.reviewer_role,
            reviewer_id: user?.id ?? null,
            overall_rating: input.overall_rating,
            category_ratings: input.category_ratings ?? {},
            strengths: input.strengths ?? null,
            weaknesses: input.weaknesses ?? null,
            improvement_suggestions: input.improvement_suggestions ?? null,
            comments: input.comments ?? null,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "review_id,reviewer_role" },
        )
        .select()
        .single();
      if (error) throw error;
      if (input.advanceStage) {
        await supabase
          .from("performance_reviews")
          .update({ current_stage: input.advanceStage })
          .eq("id", input.review_id);
      }
      await writeAudit(
        user?.id ?? null,
        `rating.${input.reviewer_role}.submitted`,
        "performance_rating",
        data.id,
        null,
        data,
      );
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-os", "perf", "ratings", v.review_id] });
      qc.invalidateQueries({ queryKey: ["admin-os", "perf", "reviews"] });
    },
  });
};

export const useFinalizeReview = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { review_id: string; overall_rating: number; summary?: string }) => {
      const { data, error } = await supabase
        .from("performance_reviews")
        .update({
          finalized: true,
          finalized_at: new Date().toISOString(),
          finalized_by: user?.id ?? null,
          current_stage: "finalized" as ReviewStage,
          overall_rating: input.overall_rating,
          summary: input.summary ?? null,
        })
        .eq("id", input.review_id)
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, "review.finalized", "performance_review", input.review_id, null, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "perf", "reviews"] }),
  });
};

/* ---------- Recognitions ---------- */

export const useRecognitions = (employeeId?: string) =>
  useQuery({
    queryKey: ["admin-os", "perf", "recognitions", employeeId ?? "all"],
    queryFn: async (): Promise<Recognition[]> => {
      let q = supabase
        .from("recognitions")
        .select(
          `*, employee:employees!recognitions_employee_id_fkey(id,full_name,employee_number)`,
        )
        .order("awarded_at", { ascending: false })
        .limit(500);
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Recognition[];
    },
  });

export const useGrantRecognition = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Recognition>) => {
      const { data, error } = await supabase
        .from("recognitions")
        .insert({
          employee_id: input.employee_id!,
          cycle_id: input.cycle_id ?? null,
          type: input.type ?? "achievement",
          title: input.title!,
          description: input.description ?? null,
          awarded_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, "recognition.granted", "recognition", data.id, null, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "perf", "recognitions"] }),
  });
};

/* ---------- Improvement Plans ---------- */

export const useImprovementPlans = (filters: { employeeId?: string; status?: PipStatus } = {}) =>
  useQuery({
    queryKey: ["admin-os", "perf", "pip", filters],
    queryFn: async (): Promise<ImprovementPlan[]> => {
      let q = supabase
        .from("improvement_plans")
        .select(
          `*,
           employee:employees!improvement_plans_employee_id_fkey(id,full_name,employee_number),
           coach:employees!improvement_plans_coach_id_fkey(id,full_name)`,
        )
        .order("created_at", { ascending: false });
      if (filters.employeeId) q = q.eq("employee_id", filters.employeeId);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ImprovementPlan[];
    },
  });

export const useUpsertPip = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<ImprovementPlan> & { id?: string }) => {
      const payload: any = {
        employee_id: input.employee_id,
        coach_id: input.coach_id ?? null,
        objectives: input.objectives,
        timeline_start: input.timeline_start,
        timeline_end: input.timeline_end,
        review_dates: input.review_dates ?? [],
        progress: input.progress ?? 0,
        status: input.status ?? "draft",
        final_outcome: input.final_outcome ?? null,
      };
      if (!input.id) payload.created_by = user?.id ?? null;
      const query = input.id
        ? supabase.from("improvement_plans").update(payload).eq("id", input.id).select().single()
        : supabase.from("improvement_plans").insert(payload).select().single();
      const { data, error } = await query;
      if (error) throw error;
      await writeAudit(
        user?.id ?? null,
        input.id ? "pip.updated" : "pip.created",
        "improvement_plan",
        (data as any).id,
        null,
        data,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "perf", "pip"] }),
  });
};

/* ---------- Career progress ---------- */

export const useCareerProgress = (employeeId?: string) =>
  useQuery({
    queryKey: ["admin-os", "perf", "career", employeeId ?? "all"],
    queryFn: async (): Promise<CareerProgress[]> => {
      let q = supabase.from("career_progress").select("*").order("updated_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as CareerProgress[];
    },
  });

export const useUpsertCareer = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CareerProgress>) => {
      const { data, error } = await supabase
        .from("career_progress")
        .upsert(
          {
            employee_id: input.employee_id!,
            current_level: input.current_level ?? null,
            target_level: input.target_level ?? null,
            required_skills: input.required_skills ?? [],
            training_needed: input.training_needed ?? [],
            experience_required_months: input.experience_required_months ?? 0,
            progress: input.progress ?? 0,
            notes: input.notes ?? null,
            updated_by: user?.id ?? null,
          },
          { onConflict: "employee_id" },
        )
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, "career.updated", "career_progress", data.id, null, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "perf", "career"] }),
  });
};

/* ---------- Promotion readiness ---------- */

export const usePromotionReadiness = (employeeId?: string) =>
  useQuery({
    queryKey: ["admin-os", "perf", "promotion", employeeId ?? "all"],
    queryFn: async (): Promise<PromotionReadiness[]> => {
      let q = supabase
        .from("promotion_readiness_snapshots")
        .select(
          `*, employee:employees!promotion_readiness_snapshots_employee_id_fkey(id,full_name,employee_number,level)`,
        )
        .order("computed_at", { ascending: false })
        .limit(500);
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PromotionReadiness[];
    },
  });

function deriveReadiness(overall: number, deptOk: boolean): ReadinessLevel {
  if (overall >= 85 && deptOk) return "ready_now";
  if (overall >= 70) return "ready_soon";
  if (overall >= 55) return "developing";
  if (overall >= 40) return "emerging";
  return "not_ready";
}

export const useComputePromotionReadiness = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      performance_score: number;
      skills_score: number;
      training_score: number;
      audit_score: number;
      department_recommendation: boolean;
      notes?: string;
    }) => {
      const overall =
        input.performance_score * 0.4 +
        input.skills_score * 0.25 +
        input.training_score * 0.2 +
        input.audit_score * 0.15;
      const readiness = deriveReadiness(overall, input.department_recommendation);
      const { data, error } = await supabase
        .from("promotion_readiness_snapshots")
        .insert({
          employee_id: input.employee_id,
          performance_score: input.performance_score,
          skills_score: input.skills_score,
          training_score: input.training_score,
          audit_score: input.audit_score,
          department_recommendation: input.department_recommendation,
          readiness_level: readiness,
          overall_score: Number(overall.toFixed(2)),
          notes: input.notes ?? null,
          computed_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, "promotion.computed", "promotion_readiness", data.id, null, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "perf", "promotion"] }),
  });
};

/* ---------- Dashboard aggregate ---------- */

export const usePerformanceDashboard = () => {
  const cycles = usePerformanceCycles();
  const goals = useGoals();
  const reviews = useReviews();
  const recognitions = useRecognitions();
  const pip = useImprovementPlans();

  const activeCycle = (cycles.data ?? []).find((c) => c.status === "active" || c.status === "in_review");

  const goalsList = goals.data ?? [];
  const completedGoals = goalsList.filter((g) => g.status === "completed").length;
  const atRiskGoals = goalsList.filter((g) => g.status === "at_risk" || g.status === "missed").length;
  const avgProgress =
    goalsList.length === 0
      ? 0
      : Math.round(goalsList.reduce((s, g) => s + g.progress, 0) / goalsList.length);

  const reviewsList = reviews.data ?? [];
  const finalized = reviewsList.filter((r) => r.finalized).length;
  const inFlight = reviewsList.filter((r) => !r.finalized).length;
  const avgRating =
    reviewsList.filter((r) => r.overall_rating != null).length === 0
      ? null
      : Number(
          (
            reviewsList
              .filter((r) => r.overall_rating != null)
              .reduce((s, r) => s + Number(r.overall_rating), 0) /
            reviewsList.filter((r) => r.overall_rating != null).length
          ).toFixed(2),
        );

  const activePip = (pip.data ?? []).filter((p) =>
    ["active", "on_track", "off_track"].includes(p.status),
  ).length;

  return {
    isLoading:
      cycles.isLoading || goals.isLoading || reviews.isLoading || recognitions.isLoading || pip.isLoading,
    error: cycles.error || goals.error || reviews.error || recognitions.error || pip.error,
    activeCycle,
    metrics: {
      totalGoals: goalsList.length,
      completedGoals,
      atRiskGoals,
      avgProgress,
      reviewsFinalized: finalized,
      reviewsInFlight: inFlight,
      avgRating,
      recognitions: (recognitions.data ?? []).length,
      activePip,
    },
    recentRecognitions: (recognitions.data ?? []).slice(0, 5),
  };
};
