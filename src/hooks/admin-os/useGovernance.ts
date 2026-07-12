/**
 * Phase 3.4 — Company Governance Center hooks.
 * Covers policies, versions, acknowledgements, governance rules,
 * authority & approval matrices, authority delegations, and
 * department charters. Reads use RLS; writes are Founder-Office only.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

const audit = async (action: string, target_type: string, target_id: string | null, meta: any = {}) => {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    await supabase.from("admin_audit_logs").insert({
      actor_user_id: userRes.user?.id ?? null,
      module: "governance",
      action,
      target_type,
      target_id: target_id ?? undefined,
      after: meta,
    });
  } catch (e) {
    console.warn("[governance] audit failed", e);
  }
};

/* =====================================================
 * POLICIES
 * ===================================================== */
export type PolicyStatus =
  | "draft" | "review" | "approved" | "published" | "revision" | "archived";

export interface PolicyRow {
  id: string;
  code: string;
  title: string;
  category: string;
  summary: string | null;
  status: PolicyStatus;
  current_version: number;
  effective_date: string | null;
  review_date: string | null;
  published_at: string | null;
  owner_id: string | null;
  department_id: string | null;
  tags: string[];
  updated_at: string;
  created_at: string;
}

export const usePolicies = (filters?: {
  status?: PolicyStatus | "all";
  category?: string;
  search?: string;
}) =>
  useQuery({
    queryKey: ["gov.policies", filters],
    queryFn: async () => {
      let q = supabase
        .from("governance_policies" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.category) q = q.eq("category", filters.category);
      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(`title.ilike.${s},code.ilike.${s},summary.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PolicyRow[];
    },
  });

export const usePolicy = (id?: string) =>
  useQuery({
    enabled: !!id,
    queryKey: ["gov.policy", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_policies" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PolicyRow | null;
    },
  });

export const usePolicyVersions = (policyId?: string) =>
  useQuery({
    enabled: !!policyId,
    queryKey: ["gov.policy.versions", policyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_policy_versions" as any)
        .select("*")
        .eq("policy_id", policyId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useCreatePolicy = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      code: string; title: string; category: string; summary?: string;
      effective_date?: string | null; review_date?: string | null;
      department_id?: string | null; tags?: string[]; content?: string;
    }) => {
      const { data: policy, error } = await supabase
        .from("governance_policies" as any)
        .insert({
          code: input.code,
          title: input.title,
          category: input.category,
          summary: input.summary ?? null,
          effective_date: input.effective_date ?? null,
          review_date: input.review_date ?? null,
          department_id: input.department_id ?? null,
          tags: input.tags ?? [],
          created_by: user?.id ?? null,
          owner_id: user?.id ?? null,
          status: "draft",
          current_version: 1,
        })
        .select()
        .single();
      if (error) throw error;
      const { error: vErr } = await supabase
        .from("governance_policy_versions" as any)
        .insert({
          policy_id: (policy as any).id,
          version: 1,
          content: input.content ?? "",
          status: "draft",
          created_by: user?.id ?? null,
        });
      if (vErr) throw vErr;
      await audit("governance.policy.created", "governance_policy", (policy as any).id, {
        code: input.code, title: input.title,
      });
      return policy;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gov.policies"] }),
  });
};

export const useUpdatePolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PolicyRow> }) => {
      const { error } = await supabase
        .from("governance_policies" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
      await audit("governance.policy.updated", "governance_policy", id, patch);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["gov.policies"] });
      qc.invalidateQueries({ queryKey: ["gov.policy", v.id] });
    },
  });
};

export const useTransitionPolicy = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id, to, note,
    }: { id: string; to: PolicyStatus; note?: string }) => {
      const patch: any = { status: to };
      if (to === "published") {
        patch.published_at = new Date().toISOString();
        patch.published_by = user?.id ?? null;
      }
      const { error } = await supabase
        .from("governance_policies" as any)
        .update(patch)
        .eq("id", id);
      if (error) throw error;
      // sync latest version's status roughly
      if (to === "approved" || to === "published") {
        const { data: v } = await supabase
          .from("governance_policy_versions" as any)
          .select("id,version")
          .eq("policy_id", id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (v) {
          await supabase.from("governance_policy_versions" as any).update({
            status: to === "published" ? "published" : "approved",
            approved_by: user?.id ?? null,
            approved_at: new Date().toISOString(),
            published_at: to === "published" ? new Date().toISOString() : null,
          }).eq("id", (v as any).id);
        }
      }
      await audit(`governance.policy.${to}`, "governance_policy", id, { note });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["gov.policies"] });
      qc.invalidateQueries({ queryKey: ["gov.policy", v.id] });
    },
  });
};

export const useCreatePolicyRevision = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ policyId, content, changelog }: {
      policyId: string; content: string; changelog?: string;
    }) => {
      const { data: p } = await supabase
        .from("governance_policies" as any)
        .select("current_version")
        .eq("id", policyId)
        .maybeSingle();
      const nextV = ((p as any)?.current_version ?? 0) + 1;
      const { error } = await supabase
        .from("governance_policy_versions" as any)
        .insert({
          policy_id: policyId,
          version: nextV,
          content,
          changelog: changelog ?? null,
          status: "draft",
          created_by: user?.id ?? null,
        });
      if (error) throw error;
      await supabase
        .from("governance_policies" as any)
        .update({ current_version: nextV, status: "revision" })
        .eq("id", policyId);
      await audit("governance.policy.revision", "governance_policy", policyId, { version: nextV });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["gov.policy.versions", v.policyId] });
      qc.invalidateQueries({ queryKey: ["gov.policy", v.policyId] });
    },
  });
};

export const useAcknowledgePolicy = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ policyId, version }: { policyId: string; version: number }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("governance_policy_acknowledgements" as any)
        .insert({ policy_id: policyId, version, user_id: user.id });
      if (error && !String(error.message).includes("duplicate")) throw error;
      await audit("governance.policy.acknowledged", "governance_policy", policyId, { version });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gov.acks"] }),
  });
};

export const useMyAcknowledgements = () => {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["gov.acks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_policy_acknowledgements" as any)
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
};

/* =====================================================
 * GOVERNANCE RULES
 * ===================================================== */
export const useGovernanceRules = () =>
  useQuery({
    queryKey: ["gov.rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_rules" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useUpsertGovernanceRule = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, created_by: user?.id ?? null };
      if (input.id) {
        const { error } = await supabase
          .from("governance_rules" as any)
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("governance_rules" as any)
          .insert(payload);
        if (error) throw error;
      }
      await audit(input.id ? "governance.rule.updated" : "governance.rule.created", "governance_rule", input.id ?? null, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gov.rules"] }),
  });
};

/* =====================================================
 * AUTHORITY MATRIX
 * ===================================================== */
export const useAuthorityMatrix = () =>
  useQuery({
    queryKey: ["gov.authority"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_authority_matrix" as any)
        .select("*")
        .order("role_key", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useUpsertAuthority = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, created_by: user?.id ?? null };
      if (input.id) {
        const { error } = await supabase
          .from("governance_authority_matrix" as any)
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("governance_authority_matrix" as any)
          .insert(payload);
        if (error) throw error;
      }
      await audit(input.id ? "governance.authority.updated" : "governance.authority.created", "governance_authority", input.id ?? null, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gov.authority"] }),
  });
};

export const useDeleteAuthority = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("governance_authority_matrix" as any).delete().eq("id", id);
      if (error) throw error;
      await audit("governance.authority.deleted", "governance_authority", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gov.authority"] }),
  });
};

/* =====================================================
 * APPROVAL MATRIX
 * ===================================================== */
export const useApprovalMatrix = () =>
  useQuery({
    queryKey: ["gov.approval-matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_approval_matrix" as any)
        .select("*")
        .order("request_type", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useUpsertApprovalRule = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, created_by: user?.id ?? null };
      if (input.id) {
        const { error } = await supabase
          .from("governance_approval_matrix" as any)
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("governance_approval_matrix" as any)
          .insert(payload);
        if (error) throw error;
      }
      await audit(input.id ? "governance.approval_matrix.updated" : "governance.approval_matrix.created", "governance_approval_matrix", input.id ?? null, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gov.approval-matrix"] }),
  });
};

export const useDeleteApprovalRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("governance_approval_matrix" as any).delete().eq("id", id);
      if (error) throw error;
      await audit("governance.approval_matrix.deleted", "governance_approval_matrix", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gov.approval-matrix"] }),
  });
};

/* =====================================================
 * DELEGATIONS
 * ===================================================== */
export const useAuthorityDelegations = () =>
  useQuery({
    queryKey: ["gov.delegations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_authority_delegations" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useCreateDelegation = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      delegate_id: string; scope: string; reason?: string;
      start_date?: string; end_date?: string | null;
    }) => {
      const { error } = await supabase.from("governance_authority_delegations" as any).insert({
        delegator_id: user?.id,
        delegate_id: input.delegate_id,
        scope: input.scope,
        reason: input.reason ?? null,
        start_date: input.start_date ?? new Date().toISOString(),
        end_date: input.end_date ?? null,
        status: "active",
        approver_id: user?.id ?? null,
        approved_at: new Date().toISOString(),
      });
      if (error) throw error;
      await audit("governance.delegation.created", "governance_delegation", null, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gov.delegations"] }),
  });
};

export const useUpdateDelegationStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("governance_authority_delegations" as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      await audit(`governance.delegation.${status}`, "governance_delegation", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gov.delegations"] }),
  });
};

/* =====================================================
 * DEPARTMENT CHARTERS
 * ===================================================== */
export const useCharters = () =>
  useQuery({
    queryKey: ["gov.charters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_department_charters" as any)
        .select("*, department:admin_departments(id,name,key)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useUpsertCharter = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, created_by: user?.id ?? null };
      if (input.id) {
        const { error } = await supabase
          .from("governance_department_charters" as any)
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("governance_department_charters" as any)
          .insert(payload);
        if (error) throw error;
      }
      await audit(input.id ? "governance.charter.updated" : "governance.charter.created", "governance_charter", input.id ?? null, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gov.charters"] }),
  });
};

export const useApproveCharter = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("governance_department_charters" as any).update({
        status: "approved",
        approved_by: user?.id ?? null,
        approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      await audit("governance.charter.approved", "governance_charter", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gov.charters"] }),
  });
};
