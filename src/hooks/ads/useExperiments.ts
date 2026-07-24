import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Experiment {
  id: string;
  advertiser_id: string;
  campaign_id: string | null;
  name: string;
  hypothesis: string | null;
  kind: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  winner_variant_id: string | null;
  created_at: string;
}

export const useExperiments = (advertiserId?: string) =>
  useQuery({
    queryKey: ["aap", "experiments", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_experiments")
        .select("*")
        .eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Experiment[];
    },
  });

export const useExperimentVariants = (experimentId?: string) =>
  useQuery({
    queryKey: ["aap", "experiment_variants", experimentId],
    enabled: !!experimentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_experiment_variants")
        .select("*")
        .eq("experiment_id", experimentId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useExperimentSummary = (experimentId?: string) =>
  useQuery({
    queryKey: ["aap", "experiment_summary", experimentId],
    enabled: !!experimentId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("aap_experiment_summary" as any, {
        _experiment_id: experimentId,
      });
      if (error) throw error;
      return (data ?? []) as Array<{
        variant_id: string; variant_name: string;
        metric: string | null; total_value: number; sample_size: number;
      }>;
    },
  });

export const useCreateExperiment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      advertiser_id: string; name: string; hypothesis?: string;
      campaign_id?: string | null; variants: { name: string; allocation: number; spec?: any }[];
    }) => {
      const { data: exp, error } = await supabase
        .from("aap_experiments")
        .insert({
          advertiser_id: input.advertiser_id,
          name: input.name,
          hypothesis: input.hypothesis ?? null,
          campaign_id: input.campaign_id ?? null,
          kind: "ab",
          status: "draft",
        } as any)
        .select().single();
      if (error) throw error;

      const rows = input.variants.map((v) => ({
        experiment_id: exp!.id,
        name: v.name,
        allocation: v.allocation,
        spec: v.spec ?? {},
      }));
      const { error: vErr } = await supabase.from("aap_experiment_variants").insert(rows as any);
      if (vErr) throw vErr;
      return exp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "experiments"] });
      toast.success("Experiment created");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};

export const useSetExperimentStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "running" | "paused" | "completed" }) => {
      const patch: any = { status, updated_at: new Date().toISOString() };
      if (status === "running") patch.started_at = new Date().toISOString();
      if (status === "completed") patch.ended_at = new Date().toISOString();
      const { error } = await supabase.from("aap_experiments").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "experiments"] });
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};

export const usePromoteWinner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, metric }: { id: string; metric: string }) => {
      const { data, error } = await supabase.rpc("aap_promote_experiment_winner" as any, {
        _experiment_id: id,
        _metric: metric,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "experiments"] });
      qc.invalidateQueries({ queryKey: ["aap", "experiment_summary"] });
      toast.success("Winner promoted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};

/* ---------- Brand safety ---------- */

export const useBlockedCategories = (advertiserId?: string) =>
  useQuery({
    queryKey: ["aap", "blocked_categories", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_blocked_categories")
        .select("*")
        .eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAddBlockedCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ advertiser_id, category }: { advertiser_id: string; category: string }) => {
      const { error } = await supabase
        .from("aap_blocked_categories")
        .insert({ advertiser_id, category } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "blocked_categories"] });
      toast.success("Category blocked");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};

export const useRemoveBlockedCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aap_blocked_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "blocked_categories"] });
      toast.success("Removed");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};

export const useUpdateAdGroupSafety = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ad_group_id: string;
      blocked_categories?: string[];
      blocked_keywords?: string[];
      min_content_rating?: string | null;
    }) => {
      const { ad_group_id, ...patch } = input;
      const { error } = await supabase
        .from("aap_ad_groups")
        .update(patch as any)
        .eq("id", ad_group_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "ad_groups"] });
      toast.success("Brand safety saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};
