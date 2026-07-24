import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* -------- Rollups / analytics -------- */

export type RollupRow = {
  day: string;
  advertiser_id: string;
  campaign_id: string | null;
  ad_id: string | null;
  surface: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
};

export function useRollupsForAdvertiser(advertiserId?: string, days = 30) {
  return useQuery({
    queryKey: ["aap_rollups", advertiserId, days],
    enabled: !!advertiserId,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("aap_daily_rollups")
        .select("*")
        .eq("advertiser_id", advertiserId!)
        .gte("day", since)
        .order("day", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RollupRow[];
    },
  });
}

/* -------- Wallet -------- */

export function useWallet(advertiserId?: string) {
  return useQuery({
    queryKey: ["aap_wallet", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_wallets")
        .select("*")
        .eq("advertiser_id", advertiserId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useWalletLedger(advertiserId?: string) {
  return useQuery({
    queryKey: ["aap_wallet_ledger", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_wallet_ledger")
        .select("*")
        .eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* -------- Payments (UPI top-up with UTR) -------- */

export function useSubmitTopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      advertiser_id: string;
      amount: number;
      utr: string;
      method?: string;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("aap_payments")
        .insert({
          advertiser_id: p.advertiser_id,
          amount: p.amount,
          utr: p.utr,
          method: p.method ?? "upi",
          status: "pending",
          notes: p.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      toast.success("Top-up submitted for verification");
      qc.invalidateQueries({ queryKey: ["aap_payments", v.advertiser_id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to submit top-up"),
  });
}

export function usePayments(advertiserId?: string) {
  return useQuery({
    queryKey: ["aap_payments", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_payments")
        .select("*")
        .eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* -------- Invoices -------- */

export function useInvoices(advertiserId?: string) {
  return useQuery({
    queryKey: ["aap_invoices", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_invoices")
        .select("*, aap_invoice_lines(*)")
        .eq("advertiser_id", advertiserId!)
        .order("issued_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
