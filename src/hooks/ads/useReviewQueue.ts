import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ReviewDecision = "approved" | "rejected" | "need_changes";

export const useReviewQueue = (state: "pending" | "approved" | "rejected" | "all" = "pending") =>
  useQuery({
    queryKey: ["aap", "review_queue", state],
    queryFn: async () => {
      let q = supabase
        .from("aap_review_queue")
        .select("*, aap_ads(*), aap_advertisers(display_name, type)")
        .order("priority", { ascending: false })
        .order("submitted_at", { ascending: true })
        .limit(100);
      if (state !== "all") q = q.eq("state", state);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useDecideReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      review_id: string; ad_id: string;
      decision: ReviewDecision; reason_code?: string; notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("aap_review_decisions").insert({
        review_id: input.review_id,
        ad_id: input.ad_id,
        decision: input.decision,
        reason_code: input.reason_code ?? null,
        notes: input.notes ?? null,
        decided_by: user?.id ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap"] });
      toast.success("Decision recorded");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
};

export const useRollupsForAdvertiser = (advertiserId?: string, days = 14) =>
  useQuery({
    queryKey: ["aap", "rollups", advertiserId, days],
    enabled: !!advertiserId,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("aap_daily_rollups")
        .select("*")
        .eq("advertiser_id", advertiserId!)
        .gte("day", since)
        .order("day", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

/** Log an ad event (impression/click/conversion). Amount = CPM/CPC price if any. */
export const logAdEvent = async (input: {
  ad_id: string;
  campaign_id: string;
  advertiser_id: string;
  surface: "feed" | "reels" | "stories" | "explore" | "search" | "profile" | "organization";
  kind: "impression" | "click" | "view" | "conversion" | "skip";
  amount?: number;
  meta?: Record<string, unknown>;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("aap_events").insert({
    ad_id: input.ad_id,
    campaign_id: input.campaign_id,
    advertiser_id: input.advertiser_id,
    user_id: user?.id ?? null,
    surface: input.surface,
    kind: input.kind,
    amount: input.amount ?? 0,
    meta: input.meta ?? {},
  } as any);
};
