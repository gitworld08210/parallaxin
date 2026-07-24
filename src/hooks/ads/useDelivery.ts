import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ------------------------------ Reach estimator ------------------------------ */

export const useEstimateReach = (targeting: Record<string, unknown> | null) =>
  useQuery({
    queryKey: ["aap", "reach", targeting],
    enabled: !!targeting,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("aap_estimate_reach" as any, {
        _targeting: targeting as any,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
  });

/* ------------------------------ Lookalike ------------------------------ */

export interface CreateLookalikeInput {
  advertiser_id: string;
  seed_audience_id: string;
  name: string;
  similarity: number; // 0.1 - 1.0
}

export const useCreateLookalike = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLookalikeInput) => {
      const { data: seed, error: seedErr } = await supabase
        .from("aap_audiences")
        .select("targeting")
        .eq("id", input.seed_audience_id)
        .single();
      if (seedErr) throw seedErr;

      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("aap_audiences")
        .insert({
          advertiser_id: input.advertiser_id,
          name: input.name,
          description: `Lookalike of seed audience (${Math.round(input.similarity * 100)}% similarity)`,
          targeting: (seed?.targeting as any) ?? {},
          is_saved: true,
          audience_type: "lookalike",
          lookalike_seed_audience_id: input.seed_audience_id,
          lookalike_similarity: input.similarity,
          created_by: user?.id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "audiences"] });
      toast.success("Lookalike audience created");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};

/* ------------------------------ Pacing + freq caps ------------------------------ */

export interface PacingInput {
  ad_group_id: string;
  pacing_type?: "standard" | "accelerated";
  daily_impression_cap?: number | null;
  frequency_cap_per_user?: number | null;
  frequency_cap_window_hours?: number;
  daily_budget?: number | null;
}

export const useUpdatePacing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ad_group_id, ...patch }: PacingInput) => {
      const { data, error } = await supabase
        .from("aap_ad_groups")
        .update({
          ...patch,
          auto_paused_reason: null,
          auto_paused_at: null,
        } as any)
        .eq("id", ad_group_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "ad_groups"] });
      toast.success("Delivery settings saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};

export const useResumeAdGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ad_group_id: string) => {
      const { error } = await supabase
        .from("aap_ad_groups")
        .update({
          status: "active",
          auto_paused_reason: null,
          auto_paused_at: null,
        } as any)
        .eq("id", ad_group_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "ad_groups"] });
      toast.success("Ad group resumed");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};
