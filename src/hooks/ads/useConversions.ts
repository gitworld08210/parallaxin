import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Pixel {
  id: string;
  advertiser_id: string;
  name: string;
  domain: string | null;
  secret: string;
  is_active: boolean;
  last_event_at: string | null;
  created_at: string;
}

export interface ConversionEventDef {
  id: string;
  advertiser_id: string;
  name: string;
  kind: string;
  event_code: string | null;
  default_value: number;
  currency: string;
  pixel_id: string | null;
  is_active: boolean;
}

export interface AttributionRow {
  event_code: string;
  total_conversions: number;
  click_conversions: number;
  view_conversions: number;
  unattributed: number;
  total_value: number;
}

export const usePixels = (advertiserId?: string) =>
  useQuery({
    queryKey: ["aap", "pixels", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_pixels" as any)
        .select("*")
        .eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Pixel[];
    },
  });

export const useCreatePixel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { advertiser_id: string; name: string; domain?: string }) => {
      const { data, error } = await supabase
        .from("aap_pixels" as any)
        .insert(input as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as Pixel;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["aap", "pixels", p.advertiser_id] });
      toast.success("Pixel created");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create pixel"),
  });
};

export const useTogglePixel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; is_active: boolean; advertiser_id: string }) => {
      const { error } = await supabase
        .from("aap_pixels" as any)
        .update({ is_active: input.is_active } as any)
        .eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (p) => qc.invalidateQueries({ queryKey: ["aap", "pixels", p.advertiser_id] }),
  });
};

export const useConversionEvents = (advertiserId?: string) =>
  useQuery({
    queryKey: ["aap", "conv_events", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_conversion_events")
        .select("*")
        .eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ConversionEventDef[];
    },
  });

export const useCreateConversionEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      advertiser_id: string;
      name: string;
      event_code: string;
      default_value?: number;
      currency?: string;
      pixel_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("aap_conversion_events")
        .insert(input as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as ConversionEventDef;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["aap", "conv_events", r.advertiser_id] });
      toast.success("Conversion event created");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useAttributionSummary = (advertiserId?: string, days = 30) =>
  useQuery({
    queryKey: ["aap", "attribution_summary", advertiserId, days],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("aap_attribution_summary" as any, {
        p_advertiser_id: advertiserId!,
        p_days: days,
      });
      if (error) throw error;
      return (data ?? []) as unknown as AttributionRow[];
    },
  });

export const useUpdateAdGroupAttribution = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      campaign_id: string;
      attribution_click_days: number;
      attribution_view_days: number;
    }) => {
      const { error } = await supabase
        .from("aap_ad_groups")
        .update({
          attribution_click_days: input.attribution_click_days,
          attribution_view_days: input.attribution_view_days,
        } as any)
        .eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (i) => {
      qc.invalidateQueries({ queryKey: ["aap", "ad_groups", i.campaign_id] });
      toast.success("Attribution window updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};
