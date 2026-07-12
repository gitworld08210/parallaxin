/**
 * Aurelix Admin OS — Learning, Skills & Certification hooks (Phase 2.7).
 *
 * All learning surfaces query and mutate through this single hook module.
 * Every mutation writes admin_audit_logs under module=people_ops with
 * action prefixes: course.*, path.*, enrollment.*, skill.*, cert.*, roadmap.*
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

/* ---------- Types ---------- */

export type CourseCategory =
  | "department"
  | "policy"
  | "technical"
  | "leadership"
  | "security"
  | "compliance"
  | "ai"
  | "onboarding";
export type CourseDifficulty = "beginner" | "intermediate" | "advanced" | "expert";
export type CourseStatus = "draft" | "published" | "archived";
export type EnrollmentStatus = "assigned" | "in_progress" | "completed" | "overdue" | "cancelled";
export type SkillVerifyStatus = "pending" | "assessing" | "dept_head_review" | "verified" | "rejected";
export type CertCategory =
  | "technical"
  | "leadership"
  | "compliance"
  | "security"
  | "department"
  | "process";
export type CertStatus = "active" | "expired" | "revoked";
export type RoadmapReqType = "course" | "skill" | "certification";

export interface LearningCourse {
  id: string;
  title: string;
  description: string | null;
  department_id: string | null;
  category: CourseCategory;
  difficulty: CourseDifficulty;
  duration_minutes: number;
  prerequisites: string[];
  status: CourseStatus;
  is_mandatory: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  department?: { id: string; name: string } | null;
}

export interface LearningPath {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  target_role: string | null;
  status: CourseStatus;
  created_at: string;
  updated_at: string;
  department?: { id: string; name: string } | null;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;
  employee_id: string;
  status: EnrollmentStatus;
  progress: number;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  due_date: string | null;
  notes: string | null;
  employee?: { id: string; full_name: string; employee_number: string } | null;
  course?: { id: string; title: string; is_mandatory: boolean; category: CourseCategory } | null;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  department_id: string | null;
  description: string | null;
  department?: { id: string; name: string } | null;
}

export interface SkillVerification {
  id: string;
  employee_id: string;
  skill_id: string;
  requested_level: string;
  status: SkillVerifyStatus;
  assessor_id: string | null;
  dept_head_id: string | null;
  decided_at: string | null;
  evidence: string | null;
  notes: string | null;
  created_at: string;
  employee?: { id: string; full_name: string; employee_number: string } | null;
  skill?: { id: string; name: string; category: string | null } | null;
}

export interface Certification {
  id: string;
  title: string;
  category: CertCategory;
  department_id: string | null;
  description: string | null;
  validity_months: number | null;
  is_mandatory: boolean;
  department?: { id: string; name: string } | null;
}

export interface EmployeeCertification {
  id: string;
  employee_id: string;
  certification_id: string;
  issued_at: string;
  expires_at: string | null;
  status: CertStatus;
  issued_by: string | null;
  notes: string | null;
  employee?: { id: string; full_name: string; employee_number: string } | null;
  certification?: { id: string; title: string; category: CertCategory } | null;
}

export interface CareerRoadmap {
  id: string;
  name: string;
  target_level: string;
  department_id: string | null;
  description: string | null;
  department?: { id: string; name: string } | null;
}

export interface RoadmapRequirement {
  id: string;
  roadmap_id: string;
  requirement_type: RoadmapReqType;
  course_id: string | null;
  skill_id: string | null;
  certification_id: string | null;
  notes: string | null;
  sequence: number;
  course?: { id: string; title: string } | null;
  skill?: { id: string; name: string } | null;
  certification?: { id: string; title: string } | null;
}

/* ---------- audit ---------- */

async function writeAudit(
  actor_user_id: string | null,
  action: string,
  target_type: string,
  target_id: string | null,
  after: any = null,
) {
  await supabase.from("admin_audit_logs").insert({
    actor_user_id,
    module: "people_ops",
    action,
    target_type,
    target_id,
    after,
  });
}

/* ---------- Courses ---------- */

export const useCourses = (filters: { category?: CourseCategory; departmentId?: string; status?: CourseStatus } = {}) =>
  useQuery({
    queryKey: ["admin-os", "learn", "courses", filters],
    queryFn: async (): Promise<LearningCourse[]> => {
      let q = supabase
        .from("learning_courses")
        .select("*, department:admin_departments!learning_courses_department_id_fkey(id,name)")
        .order("title");
      if (filters.category) q = q.eq("category", filters.category);
      if (filters.departmentId) q = q.eq("department_id", filters.departmentId);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as LearningCourse[];
    },
  });

export const useUpsertCourse = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<LearningCourse> & { id?: string }) => {
      const payload: any = {
        title: input.title,
        description: input.description ?? null,
        department_id: input.department_id ?? null,
        category: input.category ?? "department",
        difficulty: input.difficulty ?? "beginner",
        duration_minutes: input.duration_minutes ?? 30,
        prerequisites: input.prerequisites ?? [],
        status: input.status ?? "draft",
        is_mandatory: input.is_mandatory ?? false,
        owner_id: input.owner_id ?? null,
      };
      if (!input.id) payload.created_by = user?.id ?? null;
      const q = input.id
        ? supabase.from("learning_courses").update(payload).eq("id", input.id).select().single()
        : supabase.from("learning_courses").insert(payload).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await writeAudit(user?.id ?? null, input.id ? "course.updated" : "course.created", "learning_course", (data as any).id, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "courses"] }),
  });
};

/* ---------- Paths ---------- */

export const useLearningPaths = () =>
  useQuery({
    queryKey: ["admin-os", "learn", "paths"],
    queryFn: async (): Promise<LearningPath[]> => {
      const { data, error } = await supabase
        .from("learning_paths")
        .select("*, department:admin_departments!learning_paths_department_id_fkey(id,name)")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as LearningPath[];
    },
  });

export const useUpsertPath = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<LearningPath> & { id?: string }) => {
      const payload: any = {
        name: input.name,
        description: input.description ?? null,
        department_id: input.department_id ?? null,
        target_role: input.target_role ?? null,
        status: input.status ?? "draft",
      };
      if (!input.id) payload.created_by = user?.id ?? null;
      const q = input.id
        ? supabase.from("learning_paths").update(payload).eq("id", input.id).select().single()
        : supabase.from("learning_paths").insert(payload).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await writeAudit(user?.id ?? null, input.id ? "path.updated" : "path.created", "learning_path", (data as any).id, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "paths"] }),
  });
};

export const usePathCourses = (pathId?: string) =>
  useQuery({
    queryKey: ["admin-os", "learn", "path-courses", pathId],
    enabled: !!pathId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_path_courses")
        .select("*, course:learning_courses!learning_path_courses_course_id_fkey(id,title,category,duration_minutes)")
        .eq("path_id", pathId!)
        .order("sequence");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAddPathCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { path_id: string; course_id: string; sequence: number; is_required?: boolean }) => {
      const { data, error } = await supabase.from("learning_path_courses").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "path-courses", v.path_id] }),
  });
};

/* ---------- Enrollments ---------- */

export const useEnrollments = (filters: { employeeId?: string; status?: EnrollmentStatus; courseId?: string } = {}) =>
  useQuery({
    queryKey: ["admin-os", "learn", "enrollments", filters],
    queryFn: async (): Promise<CourseEnrollment[]> => {
      let q = supabase
        .from("course_enrollments")
        .select(
          `*,
           employee:employees!course_enrollments_employee_id_fkey(id,full_name,employee_number),
           course:learning_courses!course_enrollments_course_id_fkey(id,title,is_mandatory,category)`,
        )
        .order("assigned_at", { ascending: false })
        .limit(500);
      if (filters.employeeId) q = q.eq("employee_id", filters.employeeId);
      if (filters.courseId) q = q.eq("course_id", filters.courseId);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as CourseEnrollment[];
    },
  });

export const useEnroll = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { course_id: string; employee_ids: string[]; due_date?: string | null }) => {
      const rows = input.employee_ids.map((eid) => ({
        course_id: input.course_id,
        employee_id: eid,
        assigned_by: user?.id ?? null,
        due_date: input.due_date ?? null,
      }));
      const { data, error } = await supabase
        .from("course_enrollments")
        .upsert(rows, { onConflict: "course_id,employee_id", ignoreDuplicates: true })
        .select();
      if (error) throw error;
      await writeAudit(user?.id ?? null, "enrollment.created", "course_enrollment", input.course_id, {
        assigned: input.employee_ids.length,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "enrollments"] }),
  });
};

export const useUpdateEnrollment = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; progress?: number; status?: EnrollmentStatus }) => {
      const patch: any = {};
      if (input.progress != null) patch.progress = input.progress;
      if (input.status) {
        patch.status = input.status;
        if (input.status === "in_progress") patch.started_at = new Date().toISOString();
        if (input.status === "completed") {
          patch.completed_at = new Date().toISOString();
          patch.progress = 100;
        }
      } else if (input.progress === 100) {
        patch.status = "completed";
        patch.completed_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("course_enrollments")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, "enrollment.updated", "course_enrollment", input.id, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "enrollments"] }),
  });
};

/* ---------- Skills ---------- */

export const useSkillsCatalog = (departmentId?: string) =>
  useQuery({
    queryKey: ["admin-os", "learn", "skills", departmentId ?? "all"],
    queryFn: async (): Promise<Skill[]> => {
      let q = supabase
        .from("skills_catalog")
        .select("*, department:admin_departments!skills_catalog_department_id_fkey(id,name)")
        .order("name");
      if (departmentId) q = q.eq("department_id", departmentId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Skill[];
    },
  });

export const useUpsertSkill = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Skill> & { id?: string }) => {
      const payload: any = {
        name: input.name,
        category: input.category ?? null,
        department_id: input.department_id ?? null,
        description: input.description ?? null,
      };
      if (!input.id) payload.created_by = user?.id ?? null;
      const q = input.id
        ? supabase.from("skills_catalog").update(payload).eq("id", input.id).select().single()
        : supabase.from("skills_catalog").insert(payload).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await writeAudit(user?.id ?? null, input.id ? "skill.catalog_updated" : "skill.catalog_created", "skill", (data as any).id, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "skills"] }),
  });
};

export const useSkillVerifications = (filters: { employeeId?: string; status?: SkillVerifyStatus } = {}) =>
  useQuery({
    queryKey: ["admin-os", "learn", "verifications", filters],
    queryFn: async (): Promise<SkillVerification[]> => {
      let q = supabase
        .from("skill_verifications")
        .select(
          `*,
           employee:employees!skill_verifications_employee_id_fkey(id,full_name,employee_number),
           skill:skills_catalog!skill_verifications_skill_id_fkey(id,name,category)`,
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (filters.employeeId) q = q.eq("employee_id", filters.employeeId);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SkillVerification[];
    },
  });

export const useSubmitSkillRequest = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { employee_id: string; skill_id: string; requested_level: string; evidence?: string }) => {
      const { data, error } = await supabase
        .from("skill_verifications")
        .insert({
          employee_id: input.employee_id,
          skill_id: input.skill_id,
          requested_level: input.requested_level,
          evidence: input.evidence ?? null,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, "skill.requested", "skill_verification", data.id, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "verifications"] }),
  });
};

export const useDecideSkillVerification = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; status: SkillVerifyStatus; notes?: string }) => {
      const patch: any = { status: input.status, notes: input.notes ?? null };
      if (["verified", "rejected"].includes(input.status)) {
        patch.decided_at = new Date().toISOString();
        patch.dept_head_id = user?.id ?? null;
      } else if (input.status === "assessing") {
        patch.assessor_id = user?.id ?? null;
      }
      const { data, error } = await supabase
        .from("skill_verifications")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, `skill.${input.status}`, "skill_verification", input.id, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "verifications"] }),
  });
};

/* ---------- Certifications ---------- */

export const useCertificationsCatalog = () =>
  useQuery({
    queryKey: ["admin-os", "learn", "certs-catalog"],
    queryFn: async (): Promise<Certification[]> => {
      const { data, error } = await supabase
        .from("certifications_catalog")
        .select("*, department:admin_departments!certifications_catalog_department_id_fkey(id,name)")
        .order("title");
      if (error) throw error;
      return (data ?? []) as unknown as Certification[];
    },
  });

export const useUpsertCertification = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Certification> & { id?: string }) => {
      const payload: any = {
        title: input.title,
        category: input.category ?? "technical",
        department_id: input.department_id ?? null,
        description: input.description ?? null,
        validity_months: input.validity_months ?? null,
        is_mandatory: input.is_mandatory ?? false,
      };
      if (!input.id) payload.created_by = user?.id ?? null;
      const q = input.id
        ? supabase.from("certifications_catalog").update(payload).eq("id", input.id).select().single()
        : supabase.from("certifications_catalog").insert(payload).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await writeAudit(user?.id ?? null, input.id ? "cert.catalog_updated" : "cert.catalog_created", "certification", (data as any).id, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "certs-catalog"] }),
  });
};

export const useEmployeeCertifications = (filters: { employeeId?: string; status?: CertStatus } = {}) =>
  useQuery({
    queryKey: ["admin-os", "learn", "employee-certs", filters],
    queryFn: async (): Promise<EmployeeCertification[]> => {
      let q = supabase
        .from("employee_certifications")
        .select(
          `*,
           employee:employees!employee_certifications_employee_id_fkey(id,full_name,employee_number),
           certification:certifications_catalog!employee_certifications_certification_id_fkey(id,title,category)`,
        )
        .order("issued_at", { ascending: false })
        .limit(500);
      if (filters.employeeId) q = q.eq("employee_id", filters.employeeId);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as EmployeeCertification[];
    },
  });

export const useIssueCertification = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      certification_id: string;
      issued_at?: string;
      expires_at?: string | null;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("employee_certifications")
        .insert({
          employee_id: input.employee_id,
          certification_id: input.certification_id,
          issued_at: input.issued_at ?? new Date().toISOString().slice(0, 10),
          expires_at: input.expires_at ?? null,
          issued_by: user?.id ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, "cert.issued", "employee_certification", data.id, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "employee-certs"] }),
  });
};

export const useRevokeCertification = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("employee_certifications")
        .update({ status: "revoked", notes: input.notes ?? null })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      await writeAudit(user?.id ?? null, "cert.revoked", "employee_certification", input.id, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "employee-certs"] }),
  });
};

/* ---------- Career roadmaps ---------- */

export const useCareerRoadmaps = () =>
  useQuery({
    queryKey: ["admin-os", "learn", "roadmaps"],
    queryFn: async (): Promise<CareerRoadmap[]> => {
      const { data, error } = await supabase
        .from("career_roadmaps")
        .select("*, department:admin_departments!career_roadmaps_department_id_fkey(id,name)")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as CareerRoadmap[];
    },
  });

export const useRoadmapRequirements = (roadmapId?: string) =>
  useQuery({
    queryKey: ["admin-os", "learn", "roadmap-reqs", roadmapId],
    enabled: !!roadmapId,
    queryFn: async (): Promise<RoadmapRequirement[]> => {
      const { data, error } = await supabase
        .from("career_roadmap_requirements")
        .select(
          `*,
           course:learning_courses!career_roadmap_requirements_course_id_fkey(id,title),
           skill:skills_catalog!career_roadmap_requirements_skill_id_fkey(id,name),
           certification:certifications_catalog!career_roadmap_requirements_certification_id_fkey(id,title)`,
        )
        .eq("roadmap_id", roadmapId!)
        .order("sequence");
      if (error) throw error;
      return (data ?? []) as unknown as RoadmapRequirement[];
    },
  });

export const useUpsertRoadmap = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CareerRoadmap> & { id?: string }) => {
      const payload: any = {
        name: input.name,
        target_level: input.target_level,
        department_id: input.department_id ?? null,
        description: input.description ?? null,
      };
      if (!input.id) payload.created_by = user?.id ?? null;
      const q = input.id
        ? supabase.from("career_roadmaps").update(payload).eq("id", input.id).select().single()
        : supabase.from("career_roadmaps").insert(payload).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await writeAudit(user?.id ?? null, input.id ? "roadmap.updated" : "roadmap.created", "career_roadmap", (data as any).id, data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "roadmaps"] }),
  });
};

export const useAddRoadmapRequirement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      roadmap_id: string;
      requirement_type: RoadmapReqType;
      course_id?: string;
      skill_id?: string;
      certification_id?: string;
      notes?: string;
      sequence?: number;
    }) => {
      const { data, error } = await supabase
        .from("career_roadmap_requirements")
        .insert({
          roadmap_id: input.roadmap_id,
          requirement_type: input.requirement_type,
          course_id: input.course_id ?? null,
          skill_id: input.skill_id ?? null,
          certification_id: input.certification_id ?? null,
          notes: input.notes ?? null,
          sequence: input.sequence ?? 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["admin-os", "learn", "roadmap-reqs", v.roadmap_id] }),
  });
};

/* ---------- Dashboard ---------- */

export const useLearningDashboard = () => {
  const courses = useCourses();
  const enrollments = useEnrollments();
  const verifs = useSkillVerifications();
  const certs = useEmployeeCertifications();

  const enrollList = enrollments.data ?? [];
  const completed = enrollList.filter((e) => e.status === "completed").length;
  const inProgress = enrollList.filter((e) => e.status === "in_progress").length;
  const overdue = enrollList.filter((e) => e.status === "overdue").length;
  const mandatoryPending = enrollList.filter(
    (e) => e.course?.is_mandatory && e.status !== "completed",
  ).length;

  const verifList = verifs.data ?? [];
  const pendingVerifs = verifList.filter((v) => ["pending", "assessing", "dept_head_review"].includes(v.status)).length;
  const verified = verifList.filter((v) => v.status === "verified").length;

  const certList = certs.data ?? [];
  const active = certList.filter((c) => c.status === "active").length;
  const expiringSoon = certList.filter((c) => {
    if (!c.expires_at || c.status !== "active") return false;
    const days = (new Date(c.expires_at).getTime() - Date.now()) / (86400 * 1000);
    return days >= 0 && days <= 30;
  }).length;

  return {
    isLoading: courses.isLoading || enrollments.isLoading || verifs.isLoading || certs.isLoading,
    error: courses.error || enrollments.error || verifs.error || certs.error,
    metrics: {
      publishedCourses: (courses.data ?? []).filter((c) => c.status === "published").length,
      totalEnrollments: enrollList.length,
      completed,
      inProgress,
      overdue,
      mandatoryPending,
      pendingVerifs,
      verified,
      active,
      expiringSoon,
    },
  };
};

/* ---------- Department skill matrix ---------- */

export const useDepartmentSkillMatrix = (departmentId?: string) =>
  useQuery({
    queryKey: ["admin-os", "learn", "matrix", departmentId ?? "all"],
    enabled: !!departmentId,
    queryFn: async () => {
      // pull employees in dept + verified skills for those employees
      const { data: emps, error: eErr } = await supabase
        .from("employees")
        .select("id, full_name, employee_number, level")
        .eq("department_id", departmentId!)
        .in("employment_status", ["active", "on_leave", "joining_today"]);
      if (eErr) throw eErr;

      const { data: skills, error: sErr } = await supabase
        .from("skills_catalog")
        .select("id, name, category")
        .eq("department_id", departmentId!);
      if (sErr) throw sErr;

      const empIds = (emps ?? []).map((e: any) => e.id);
      const skillIds = (skills ?? []).map((s: any) => s.id);
      let verified: any[] = [];
      if (empIds.length && skillIds.length) {
        const { data: v, error: vErr } = await supabase
          .from("skill_verifications")
          .select("employee_id, skill_id, status, requested_level")
          .in("employee_id", empIds)
          .in("skill_id", skillIds)
          .eq("status", "verified");
        if (vErr) throw vErr;
        verified = v ?? [];
      }

      // build matrix map
      const map = new Map<string, Set<string>>();
      verified.forEach((v) => {
        const key = v.skill_id;
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(v.employee_id);
      });

      return {
        employees: emps ?? [],
        skills: skills ?? [],
        coverage: (skills ?? []).map((s: any) => ({
          skill: s,
          verified: map.get(s.id)?.size ?? 0,
          totalEmployees: emps?.length ?? 0,
          coveragePct: emps && emps.length > 0 ? Math.round(((map.get(s.id)?.size ?? 0) / emps.length) * 100) : 0,
        })),
      };
    },
  });
