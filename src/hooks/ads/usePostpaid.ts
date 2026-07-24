import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CreditStatus = {
  mode: string;
  status: string;
  currency: string;
  wallet_balance: number;
  credit_limit: number;
  outstanding: number;
  current_cycle_spend: number;
  available_credit: number;
  over_limit: boolean;
};

export function useCreditStatus(advertiserId?: string) {
  return useQuery({
    queryKey: ["aap_credit_status", advertiserId],
    enabled: !!advertiserId,
    queryFn: async (): Promise<CreditStatus | null> => {
      const { data, error } = await supabase.rpc("aap_postpaid_credit_status" as any, { _advertiser_id: advertiserId });
      if (error) throw error;
      return (data as any) ?? null;
    },
  });
}

export function useMyCreditApplications(advertiserId?: string) {
  return useQuery({
    queryKey: ["aap_credit_apps", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("aap_credit_applications")
        .select("*")
        .eq("advertiser_id", advertiserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubmitCreditApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      advertiser_id: string;
      requested_limit: number;
      requested_cycle: string;
      reason?: string;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Sign in required");
      const { data, error } = await (supabase as any)
        .from("aap_credit_applications")
        .insert({ ...input, requested_by: uid })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      toast.success("Credit application submitted for Finance review");
      qc.invalidateQueries({ queryKey: ["aap_credit_apps", v.advertiser_id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Submit failed"),
  });
}

export function usePendingCreditApplications() {
  return useQuery({
    queryKey: ["aap_credit_apps_pending"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("aap_credit_applications")
        .select("*, advertiser:aap_advertisers(id, display_name, type)")
        .in("status", ["pending", "under_review"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useApproveCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      application_id: string;
      approved_limit: number;
      approved_cycle: string;
      risk_level: string;
      security_deposit: number;
      payment_method: string;
      autopay: boolean;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("aap_finance_approve_credit" as any, {
        _application_id: args.application_id,
        _approved_limit: args.approved_limit,
        _approved_cycle: args.approved_cycle,
        _risk_level: args.risk_level,
        _security_deposit: args.security_deposit,
        _payment_method: args.payment_method,
        _autopay: args.autopay,
        _notes: args.notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Credit approved · advertiser switched to postpaid");
      qc.invalidateQueries({ queryKey: ["aap_credit_apps_pending"] });
      qc.invalidateQueries({ queryKey: ["aap_founder_finance"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Approve failed"),
  });
}

export function useRejectCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { application_id: string; notes: string }) => {
      const { error } = await supabase.rpc("aap_finance_reject_credit" as any, {
        _application_id: args.application_id,
        _notes: args.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application rejected");
      qc.invalidateQueries({ queryKey: ["aap_credit_apps_pending"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Reject failed"),
  });
}

export function useFounderFinanceOverview() {
  return useQuery({
    queryKey: ["aap_founder_finance"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("aap_founder_finance_overview")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useFinancialLedger(advertiserId?: string, limit = 100) {
  return useQuery({
    queryKey: ["aap_ledger", advertiserId, limit],
    queryFn: async () => {
      let q = (supabase as any).from("aap_financial_ledger").select("*").order("occurred_at", { ascending: false }).limit(limit);
      if (advertiserId) q = q.eq("advertiser_id", advertiserId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
