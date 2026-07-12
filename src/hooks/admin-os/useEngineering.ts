import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const inv = (qc: ReturnType<typeof useQueryClient>, keys: string[]) =>
  keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

// ===== Projects =====
export const useEngProjects = () =>
  useQuery({
    queryKey: ["eng_projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eng_projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useEngProject = (id?: string) =>
  useQuery({
    queryKey: ["eng_project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("eng_projects").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useCreateEngProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("eng_projects").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Project created");
      inv(qc, ["eng_projects"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useUpdateEngProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { data, error } = await supabase.from("eng_projects").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Project updated");
      inv(qc, ["eng_projects", "eng_project"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

// ===== Sprints =====
export const useEngSprints = (projectId?: string) =>
  useQuery({
    queryKey: ["eng_sprints", projectId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("eng_sprints").select("*").order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateEngSprint = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("eng_sprints").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Sprint created");
      inv(qc, ["eng_sprints"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

// ===== Tasks =====
export const useEngTasks = (filters?: { projectId?: string; sprintId?: string; status?: string; assignee?: string }) =>
  useQuery({
    queryKey: ["eng_tasks", filters],
    queryFn: async () => {
      let q = supabase.from("eng_tasks").select("*").order("created_at", { ascending: false });
      if (filters?.projectId) q = q.eq("project_id", filters.projectId);
      if (filters?.sprintId) q = q.eq("sprint_id", filters.sprintId);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.assignee) q = q.eq("assignee_id", filters.assignee);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateEngTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("eng_tasks").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Task created");
      inv(qc, ["eng_tasks"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useUpdateEngTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { data, error } = await supabase.from("eng_tasks").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => inv(qc, ["eng_tasks"]),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

// ===== Bugs =====
export const useEngBugs = (filters?: { projectId?: string; status?: string; severity?: string }) =>
  useQuery({
    queryKey: ["eng_bugs", filters],
    queryFn: async () => {
      let q = supabase.from("eng_bugs").select("*").order("created_at", { ascending: false });
      if (filters?.projectId) q = q.eq("project_id", filters.projectId);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.severity) q = q.eq("severity", filters.severity);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateEngBug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("eng_bugs").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Bug filed");
      inv(qc, ["eng_bugs"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useUpdateEngBug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { data, error } = await supabase.from("eng_bugs").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => inv(qc, ["eng_bugs"]),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

// ===== Releases =====
export const useEngReleases = () =>
  useQuery({
    queryKey: ["eng_releases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eng_releases").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateEngRelease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (!payload.release_notes || !payload.release_notes.trim()) {
        throw new Error("Release notes are required");
      }
      const { data, error } = await supabase.from("eng_releases").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Release created");
      inv(qc, ["eng_releases"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useUpdateEngRelease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { data, error } = await supabase.from("eng_releases").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => inv(qc, ["eng_releases"]),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useApproveReleaseQA = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("eng_releases")
        .update({
          qa_approved: true,
          qa_approved_by: userRes.user?.id ?? null,
          qa_approved_at: new Date().toISOString(),
          status: "qa_approved",
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("QA approval recorded");
      inv(qc, ["eng_releases"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useApproveReleaseFounder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("eng_releases")
        .update({
          founder_approved: true,
          founder_approved_by: userRes.user?.id ?? null,
          founder_approved_at: new Date().toISOString(),
          status: "approved",
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Founder approval recorded");
      inv(qc, ["eng_releases"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

// ===== Deployments =====
export const useEngDeployments = () =>
  useQuery({
    queryKey: ["eng_deployments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eng_deployments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateEngDeployment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("eng_deployments").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Deployment logged");
      inv(qc, ["eng_deployments"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

// ===== Documents =====
export const useEngDocuments = () =>
  useQuery({
    queryKey: ["eng_documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eng_documents").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateEngDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("eng_documents").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Document saved");
      inv(qc, ["eng_documents"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

// ===== Dashboard KPIs =====
export const useEngDashboardKpis = () =>
  useQuery({
    queryKey: ["eng_dashboard_kpis"],
    queryFn: async () => {
      const [projects, tasks, bugs, releases, deployments] = await Promise.all([
        supabase.from("eng_projects").select("id, status, health"),
        supabase.from("eng_tasks").select("id, status"),
        supabase.from("eng_bugs").select("id, status, severity"),
        supabase.from("eng_releases").select("id, status, is_production, qa_approved, founder_approved"),
        supabase.from("eng_deployments").select("id, status, deployed_at"),
      ]);
      return {
        activeProjects: (projects.data ?? []).filter((p: any) => p.status === "active" || p.status === "planning").length,
        totalProjects: (projects.data ?? []).length,
        openTasks: (tasks.data ?? []).filter((t: any) => t.status !== "done" && t.status !== "cancelled").length,
        inProgressTasks: (tasks.data ?? []).filter((t: any) => t.status === "in_progress").length,
        criticalBugs: (bugs.data ?? []).filter((b: any) => b.severity === "critical" && b.status !== "resolved" && b.status !== "closed").length,
        openBugs: (bugs.data ?? []).filter((b: any) => b.status !== "resolved" && b.status !== "closed").length,
        pendingReleases: (releases.data ?? []).filter((r: any) => r.status !== "released" && r.status !== "cancelled").length,
        upcomingProdReleases: (releases.data ?? []).filter((r: any) => r.is_production && r.status !== "released").length,
        recentDeployments: (deployments.data ?? []).slice(0, 5),
      };
    },
  });
