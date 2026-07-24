import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ApiKey {
  id: string; advertiser_id: string; name: string;
  key_prefix: string; scopes: string[];
  last_used_at: string | null; revoked_at: string | null;
  expires_at: string | null; created_at: string;
}

export interface Webhook {
  id: string; advertiser_id: string; name: string | null;
  url: string; events: string[]; secret: string | null; is_active: boolean;
  last_success_at: string | null; last_failure_at: string | null; failure_count: number;
}

export interface WebhookDelivery {
  id: string; webhook_id: string; event: string;
  status: number | null; response: string | null;
  attempt: number; duration_ms: number | null; attempted_at: string;
}

export const useApiKeys = (advertiserId?: string) =>
  useQuery({
    queryKey: ["aap", "api_keys", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase.from("aap_api_keys")
        .select("*").eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ApiKey[];
    },
  });

export const useIssueApiKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { advertiser_id: string; name: string; scopes: string[]; expires_at?: string | null }) => {
      const { data, error } = await supabase.rpc("aap_issue_api_key" as any, {
        p_advertiser_id: i.advertiser_id, p_name: i.name,
        p_scopes: i.scopes, p_expires_at: i.expires_at ?? null,
      });
      if (error) throw error;
      return data as { id: string; key_prefix: string; secret: string };
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["aap", "api_keys", v.advertiser_id] });
      toast.success("API key issued");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useRevokeApiKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { id: string; advertiser_id: string }) => {
      const { error } = await supabase.from("aap_api_keys")
        .update({ revoked_at: new Date().toISOString() } as any).eq("id", i.id);
      if (error) throw error;
      return i;
    },
    onSuccess: (i) => qc.invalidateQueries({ queryKey: ["aap", "api_keys", i.advertiser_id] }),
  });
};

export const useWebhooks = (advertiserId?: string) =>
  useQuery({
    queryKey: ["aap", "webhooks", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase.from("aap_webhooks")
        .select("*").eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Webhook[];
    },
  });

export const useCreateWebhook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { advertiser_id: string; name: string; url: string; events: string[] }) => {
      const { data, error } = await supabase.from("aap_webhooks")
        .insert(i as any).select("*").single();
      if (error) throw error;
      return data as unknown as Webhook;
    },
    onSuccess: (w) => {
      qc.invalidateQueries({ queryKey: ["aap", "webhooks", w.advertiser_id] });
      toast.success("Webhook created");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useToggleWebhook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { id: string; is_active: boolean; advertiser_id: string }) => {
      const { error } = await supabase.from("aap_webhooks")
        .update({ is_active: i.is_active } as any).eq("id", i.id);
      if (error) throw error;
      return i;
    },
    onSuccess: (i) => qc.invalidateQueries({ queryKey: ["aap", "webhooks", i.advertiser_id] }),
  });
};

export const useWebhookDeliveries = (webhookId?: string) =>
  useQuery({
    queryKey: ["aap", "webhook_deliveries", webhookId],
    enabled: !!webhookId,
    queryFn: async () => {
      const { data, error } = await supabase.from("aap_webhook_deliveries")
        .select("*").eq("webhook_id", webhookId!)
        .order("attempted_at", { ascending: false }).limit(25);
      if (error) throw error;
      return (data ?? []) as unknown as WebhookDelivery[];
    },
  });
