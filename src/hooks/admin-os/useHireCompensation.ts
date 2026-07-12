import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

export type HireCompStatus =
  | "draft"
  | "pending_finance_l1"
  | "pending_finance_l2"
  | "approved"
  | "rejected"
  | "sent_back";

export type HireOnboardingStatus =
  | "awaiting_employee"
  | "submitted_by_employee"
  | "verified_by_finance"
  | "rejected";

export interface HireCompProposal {
  id: string;
  proposal_number: string;
  employee_id: string | null;
  candidate_id: string | null;
  hiring_request_id: string | null;
  role_title: string;
  level: string | null;
  currency: string;
  base_monthly: number;
  joining_bonus: number;
  variable_bonus: number;
  allowances: Record<string, number> | null;
  notes: string | null;
  status: HireCompStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  l1_reviewer_id: string | null;
  l1_decision: string | null;
  l1_reason: string | null;
  l1_at: string | null;
  l2_reviewer_id: string | null;
  l2_decision: string | null;
  l2_reason: string | null;
  l2_at: string | null;
  created_at: string;
  updated_at: string;
}

const KEY = ["admin-os", "hire-comp"];

export const useHireCompProposals = (filter?: { status?: HireCompStatus }) =>
  useQuery({
    queryKey: [...KEY, "list", filter],
    queryFn: async () => {
      let q = supabase
        .from("hire_compensation_proposals" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (filter?.status) q = q.eq("status", filter.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as HireCompProposal[];
    },
  });

export const useCreateHireComp = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      input: Partial<HireCompProposal> & { role_title: string },
    ) => {
      const { data, error } = await supabase
        .from("hire_compensation_proposals" as any)
        .insert({
          ...input,
          submitted_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as HireCompProposal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useUpdateHireComp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<HireCompProposal>;
    }) => {
      const { data, error } = await supabase
        .from("hire_compensation_proposals" as any)
        .update(patch as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as HireCompProposal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useSubmitToFinance = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hire_compensation_proposals" as any)
        .update({
          status: "pending_finance_l1",
          submitted_by: user?.id,
          submitted_at: new Date().toISOString(),
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useFinanceDecision = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      level,
      decision,
      reason,
    }: {
      id: string;
      level: "l1" | "l2";
      decision: "approve" | "reject" | "send_back";
      reason?: string;
    }) => {
      const now = new Date().toISOString();
      let patch: Partial<HireCompProposal> = {};
      if (level === "l1") {
        patch = {
          l1_reviewer_id: user?.id ?? null,
          l1_decision: decision,
          l1_reason: reason ?? null,
          l1_at: now,
          status:
            decision === "approve"
              ? "pending_finance_l2"
              : decision === "reject"
                ? "rejected"
                : "sent_back",
        };
      } else {
        patch = {
          l2_reviewer_id: user?.id ?? null,
          l2_decision: decision,
          l2_reason: reason ?? null,
          l2_at: now,
          status:
            decision === "approve"
              ? "approved"
              : decision === "reject"
                ? "rejected"
                : "sent_back",
        };
      }
      const { error } = await supabase
        .from("hire_compensation_proposals" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

// ------------------- Finance onboarding -------------------

export interface HireFinanceOnboarding {
  id: string;
  employee_id: string;
  proposal_id: string | null;
  status: HireOnboardingStatus;
  bank_account_holder_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_swift: string | null;
  branch: string | null;
  pan_number: string | null;
  aadhaar_last4: string | null;
  tax_id: string | null;
  address: string | null;
  emergency_contact: string | null;
  cancelled_cheque_path: string | null;
  pan_doc_path: string | null;
  aadhaar_doc_path: string | null;
  address_proof_path: string | null;
  submitted_at: string | null;
  finance_verified_by: string | null;
  finance_verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

const OKEY = ["admin-os", "hire-finance-onb"];

export const useMyFinanceOnboarding = (employeeId?: string) =>
  useQuery({
    queryKey: [...OKEY, "mine", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hire_finance_onboarding" as any)
        .select("*")
        .eq("employee_id", employeeId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as HireFinanceOnboarding | null;
    },
  });

export const useAllFinanceOnboarding = () =>
  useQuery({
    queryKey: [...OKEY, "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hire_finance_onboarding" as any)
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as HireFinanceOnboarding[];
    },
  });

export const useUpsertFinanceOnboarding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<HireFinanceOnboarding> & { employee_id: string }) => {
      const { data, error } = await supabase
        .from("hire_finance_onboarding" as any)
        .upsert(row as any, { onConflict: "employee_id" })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as HireFinanceOnboarding;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: OKEY }),
  });
};

export const useVerifyFinanceOnboarding = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      reason,
    }: {
      id: string;
      decision: "verify" | "reject";
      reason?: string;
    }) => {
      const patch: Partial<HireFinanceOnboarding> =
        decision === "verify"
          ? {
              status: "verified_by_finance",
              finance_verified_by: user?.id ?? null,
              finance_verified_at: new Date().toISOString(),
              rejection_reason: null,
            }
          : {
              status: "rejected",
              rejection_reason: reason ?? "Rejected by finance",
            };
      const { error } = await supabase
        .from("hire_finance_onboarding" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: OKEY }),
  });
};

export async function uploadHireFinanceDoc(
  userId: string,
  employeeId: string,
  kind: "cheque" | "pan" | "aadhaar" | "address",
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${employeeId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("hire-finance-docs")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function signedDocUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("hire-finance-docs")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
