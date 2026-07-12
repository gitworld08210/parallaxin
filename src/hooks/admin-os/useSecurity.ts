import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type IncidentInput = {
  title: string;
  description?: string;
  severity?: string;
  category?: string;
  affected_systems?: string[];
  policy_refs?: string[];
};

export const useSecurityIncidents = (status?: string) => {
  return useQuery({
    queryKey: ["sec_incidents", status ?? "all"],
    queryFn: async () => {
      let q = supabase.from("sec_incidents").select("*").order("detected_at", { ascending: false }).limit(200);
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useSecurityIncident = (id?: string) => {
  return useQuery({
    queryKey: ["sec_incident", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("sec_incidents").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};

export const useIncidentUpdates = (incidentId?: string) => {
  return useQuery({
    queryKey: ["sec_incident_updates", incidentId],
    enabled: !!incidentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sec_incident_updates")
        .select("*")
        .eq("incident_id", incidentId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateIncident = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: IncidentInput) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("sec_incidents")
        .insert({ ...input, reporter_id: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sec_incidents"] });
      toast.success("Incident opened");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateIncident = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { data, error } = await supabase.from("sec_incidents").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["sec_incidents"] });
      qc.invalidateQueries({ queryKey: ["sec_incident", v.id] });
      toast.success("Incident updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useAddIncidentUpdate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ incidentId, body, updateType = "note" }: { incidentId: string; body: string; updateType?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("sec_incident_updates")
        .insert({ incident_id: incidentId, body, update_type: updateType, author_id: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["sec_incident_updates", v.incidentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useThreatEvents = () => {
  return useQuery({
    queryKey: ["sec_threat_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sec_threat_events")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateThreatEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { threat_type: string; severity?: string; source_ip?: string; target_resource?: string }) => {
      const { data, error } = await supabase.from("sec_threat_events").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sec_threat_events"] });
      toast.success("Threat event logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useResolveThreat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sec_threat_events")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sec_threat_events"] });
      toast.success("Threat resolved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useAccessReviews = () => {
  return useQuery({
    queryKey: ["sec_access_reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sec_access_reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateAccessReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; scope?: string; due_date?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("sec_access_reviews")
        .insert({ ...input, owner_id: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sec_access_reviews"] });
      toast.success("Access review created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useSecurityPolicies = () => {
  return useQuery({
    queryKey: ["sec_policies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sec_policies").select("*").order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useComplianceRecords = () => {
  return useQuery({
    queryKey: ["sec_compliance_records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sec_compliance_records")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useInvestigations = () => {
  return useQuery({
    queryKey: ["sec_investigations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sec_investigations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateInvestigation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; incident_id?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("sec_investigations")
        .insert({ ...input, lead_investigator_id: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sec_investigations"] });
      toast.success("Investigation opened");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useSecurityDashboardStats = () => {
  return useQuery({
    queryKey: ["sec_dashboard_stats"],
    queryFn: async () => {
      const [incidents, threats, reviews, investigations] = await Promise.all([
        supabase.from("sec_incidents").select("id,status,severity", { count: "exact" }),
        supabase.from("sec_threat_events").select("id,status,severity", { count: "exact" }),
        supabase.from("sec_access_reviews").select("id,status", { count: "exact" }),
        supabase.from("sec_investigations").select("id,status", { count: "exact" }),
      ]);
      const inc = incidents.data ?? [];
      const thr = threats.data ?? [];
      const rev = reviews.data ?? [];
      const inv = investigations.data ?? [];
      return {
        openIncidents: inc.filter((i) => i.status !== "closed").length,
        criticalIncidents: inc.filter((i) => i.severity === "critical" && i.status !== "closed").length,
        activeThreats: thr.filter((t) => t.status !== "resolved").length,
        openInvestigations: inv.filter((i) => i.status !== "closed").length,
        pendingReviews: rev.filter((r) => r.status !== "completed").length,
        totalIncidents: inc.length,
      };
    },
  });
};
