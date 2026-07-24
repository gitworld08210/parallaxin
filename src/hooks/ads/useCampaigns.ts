import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CampaignObjective =
  | "awareness" | "reach" | "engagement" | "traffic"
  | "app_promotion" | "video_views" | "conversions";
export type CampaignStatus =
  | "draft" | "pending_review" | "approved" | "rejected"
  | "running" | "paused" | "completed" | "archived";
export type AdFormat =
  | "image" | "video" | "carousel" | "story" | "feed"
  | "reels" | "search" | "sponsored_profile" | "sponsored_organization";
export type Placement =
  | "feed" | "reels" | "stories" | "explore" | "search" | "profile" | "organization";

/* ------------------------------ Campaigns ------------------------------ */

export const useCampaigns = (advertiserId?: string) =>
  useQuery({
    queryKey: ["aap", "campaigns", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_campaigns")
        .select("*")
        .eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCampaign = (campaignId?: string) =>
  useQuery({
    queryKey: ["aap", "campaign", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_campaigns").select("*").eq("id", campaignId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export interface CreateCampaignInput {
  advertiser_id: string;
  name: string;
  objective: CampaignObjective;
  total_budget?: number | null;
  daily_budget?: number | null;
  start_at?: string | null;
  end_at?: string | null;
}

export const useCreateCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("aap_campaigns")
        .insert({ ...input, status: "draft", created_by: user.id } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "campaigns"] });
      toast.success("Campaign created");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create campaign"),
  });
};

export const useUpdateCampaignStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CampaignStatus }) => {
      const { error } = await supabase
        .from("aap_campaigns").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap"] });
      toast.success("Campaign updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });
};

/* ------------------------------ Ad Groups ------------------------------ */

export const useAdGroups = (campaignId?: string) =>
  useQuery({
    queryKey: ["aap", "ad_groups", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_ad_groups").select("*").eq("campaign_id", campaignId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export interface CreateAdGroupInput {
  advertiser_id: string;
  campaign_id: string;
  name: string;
  audience_id?: string | null;
  placements: Placement[];
  daily_budget?: number | null;
  bid_strategy?: string | null;
  bid_amount?: number | null;
  optimization_goal?: string | null;
}

export const useCreateAdGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAdGroupInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("aap_ad_groups")
        .insert({
          ...input,
          status: "draft",
          schedule: {},
          created_by: user?.id ?? null,
        } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "ad_groups"] });
      toast.success("Ad group created");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};

/* --------------------------------- Ads --------------------------------- */

export const useAds = (adGroupId?: string) =>
  useQuery({
    queryKey: ["aap", "ads", adGroupId],
    enabled: !!adGroupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_ads").select("*").eq("ad_group_id", adGroupId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export interface CreateAdInput {
  advertiser_id: string;
  campaign_id: string;
  ad_group_id: string;
  creative_id?: string | null;
  name: string;
  format: AdFormat;
  headline?: string | null;
  description?: string | null;
  cta?: string | null;
  destination_url?: string | null;
}

export const useCreateAd = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAdInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("aap_ads")
        .insert({
          ...input,
          status: "draft",
          review_state: "pending",
          payload: {},
          created_by: user?.id ?? null,
        } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "ads"] });
      toast.success("Ad created");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};

export const useSubmitAdForReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (adId: string) => {
      const { error } = await supabase
        .from("aap_ads")
        .update({
          status: "pending_review",
          review_state: "pending",
          submitted_at: new Date().toISOString(),
        } as any)
        .eq("id", adId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap"] });
      toast.success("Submitted for review");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};

/* ------------------------------ Creatives ------------------------------ */

export const useCreatives = (advertiserId?: string) =>
  useQuery({
    queryKey: ["aap", "creatives", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_creatives").select("*").eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export interface CreateCreativeInput {
  advertiser_id: string;
  name: string;
  format: AdFormat;
  media_url?: string | null;
  media_path?: string | null;
  media_mime?: string | null;
  thumbnail_url?: string | null;
  metadata?: Record<string, unknown>;
}


export const useCreateCreative = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCreativeInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("aap_creatives")
        .insert({
          ...input,
          metadata: input.metadata ?? {},
          created_by: user?.id ?? null,
        } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "creatives"] });
      toast.success("Creative saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};

/* ------------------------------ Audiences ------------------------------ */

export const useAudiences = (advertiserId?: string) =>
  useQuery({
    queryKey: ["aap", "audiences", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_audiences").select("*").eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export interface CreateAudienceInput {
  advertiser_id: string;
  name: string;
  description?: string | null;
  targeting: Record<string, unknown>;
  is_saved?: boolean;
}

export const useCreateAudience = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAudienceInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("aap_audiences")
        .insert({
          ...input,
          is_saved: input.is_saved ?? true,
          created_by: user?.id ?? null,
        } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "audiences"] });
      toast.success("Audience saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};
