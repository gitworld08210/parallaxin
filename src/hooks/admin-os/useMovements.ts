/**
 * Workforce movement hooks — Phase 2.4.
 *
 * Central engine for every employee movement: transfers, promotions,
 * leaves, suspensions, exit, rejoin, temporary assignments, and knowledge
 * transfers. Every mutation writes an `admin_audit_logs` row and applied
 * movements automatically update the employee record (which propagates to
 * Passport + timeline via existing triggers).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import type { Database } from "@/integrations/supabase/types";

export type MovementKind = Database["public"]["Enums"]["movement_kind"];
export type MovementStatus = Database["public"]["Enums"]["movement_status"];
export type ApprovalDecision = Database["public"]["Enums"]["approval_decision"];
export type LeaveKind = Database["public"]["Enums"]["leave_kind"];

const audit = async (a: {
  actor: string | null; action: string; targetId: string; after?: unknown;
}) => {
  await supabase.from("admin_audit_logs").insert({
    actor_user_id: a.actor, module: "people_ops", action: a.action,
    target_type: "employee_movement", target_id: a.targetId,
    after: (a.after as any) ?? null,
  });
};

const APPROVAL_CHAINS: Record<MovementKind, string[]> = {
  department_transfer: ["source_dept_head", "receiving_dept_head", "hr", "founder_office"],
  team_transfer: ["dept_head"],
  manager_change: ["dept_head", "hr"],
  promotion: ["dept_head", "hr", "founder_office"],
  demotion: ["dept_head", "hr", "founder_office"],
  temporary_assignment: ["dept_head", "hr"],
  cross_department_assignment: ["source_dept_head", "receiving_dept_head", "hr"],
  acting_assignment: ["dept_head", "hr"],
  leave: ["manager", "hr"],
  suspension: ["hr", "founder_office"],
  reinstatement: ["hr", "dept_head", "founder_office"],
  resignation: ["manager", "hr"],
  exit: ["hr", "founder_office"],
  rejoin: ["hr", "founder_office"],
  workload_transfer: ["dept_head"],
  knowledge_transfer: ["dept_head", "hr"],
};

export const movementChain = (k: MovementKind) => APPROVAL_CHAINS[k] ?? ["hr"];

const key = ["admin-os", "movements"];

// ---- Queries ----
export const useMovementList = (filter?: {
  employee_id?: string; status?: MovementStatus; kind?: MovementKind;
}) =>
  useQuery({
    queryKey: [...key, "list", filter],
    queryFn: async () => {
      let q = supabase
        .from("employee_movements")
        .select(
          `id, employee_id, kind, status, effective_date, end_date, reason,
           target_department_id, target_manager_id, target_level, requested_by,
           created_at, updated_at,
           employee:employees!employee_movements_employee_id_fkey(id,full_name,employee_number,employment_status,photo_url)`,
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter?.employee_id) q = q.eq("employee_id", filter.employee_id);
      if (filter?.status) q = q.eq("status", filter.status);
      if (filter?.kind) q = q.eq("kind", filter.kind);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useMovement = (id?: string) =>
  useQuery({
    enabled: !!id,
    queryKey: [...key, id],
    queryFn: async () => {
      const [mov, appr] = await Promise.all([
        supabase
          .from("employee_movements")
          .select(
            `*, employee:employees!employee_movements_employee_id_fkey(id,full_name,employee_number,employment_status,photo_url,reporting_manager_id,
               department:admin_departments!employees_department_id_fkey(id,name),
               role:admin_roles!employees_role_id_fkey(id,name)),
             target_department:admin_departments!employee_movements_target_department_id_fkey(id,name),
             target_role:admin_roles!employee_movements_target_role_id_fkey(id,name),
             target_manager:employees!employee_movements_target_manager_id_fkey(id,full_name,employee_number)`,
          )
          .eq("id", id!).maybeSingle(),
        supabase
          .from("movement_approvals")
          .select("*")
          .eq("movement_id", id!)
          .order("step_order", { ascending: true }),
      ]);
      if (mov.error) throw mov.error;
      if (appr.error) throw appr.error;
      return { movement: mov.data, approvals: appr.data ?? [] };
    },
  });

// ---- Mutations ----
export const useCreateMovement = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      kind: MovementKind;
      reason?: string;
      business_justification?: string;
      effective_date?: string | null;
      end_date?: string | null;
      target_department_id?: string | null;
      target_role_id?: string | null;
      target_level?: string | null;
      target_manager_id?: string | null;
      target_team_name?: string | null;
      payload?: Record<string, unknown>;
      auto_submit?: boolean;
    }) => {
      // Capture source snapshot
      const { data: src } = await supabase
        .from("employees")
        .select("department_id, role_id, level, reporting_manager_id, employment_status")
        .eq("id", input.employee_id)
        .maybeSingle();

      const { data: movement, error } = await supabase
        .from("employee_movements")
        .insert({
          employee_id: input.employee_id,
          kind: input.kind,
          status: input.auto_submit ? "pending_approval" : "draft",
          requested_by: user?.id ?? null,
          reason: input.reason ?? null,
          business_justification: input.business_justification ?? null,
          effective_date: input.effective_date ?? null,
          end_date: input.end_date ?? null,
          target_department_id: input.target_department_id ?? null,
          target_role_id: input.target_role_id ?? null,
          target_level: input.target_level ?? null,
          target_manager_id: input.target_manager_id ?? null,
          target_team_name: input.target_team_name ?? null,
          payload: (input.payload ?? {}) as any,
          source_snapshot: src ?? {},
        })
        .select("*")
        .single();
      if (error) throw error;

      // Seed approval chain
      const chain = movementChain(input.kind);
      const approvals = chain.map((role, i) => ({
        movement_id: movement.id,
        step_order: i + 1,
        role_key: role,
        decision: "pending" as ApprovalDecision,
      }));
      if (approvals.length) {
        await supabase.from("movement_approvals").insert(approvals);
      }
      await audit({ actor: user?.id ?? null, action: "movement.created", targetId: movement.id, after: movement });
      return movement;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
};

export const useDecideApproval = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (a: { approval_id: string; decision: "approved" | "rejected"; note?: string; movement_id: string }) => {
      const { data, error } = await supabase
        .from("movement_approvals")
        .update({
          decision: a.decision,
          decided_at: new Date().toISOString(),
          approver_user_id: user?.id ?? null,
          note: a.note ?? null,
        })
        .eq("id", a.approval_id)
        .select("*")
        .single();
      if (error) throw error;
      await audit({
        actor: user?.id ?? null,
        action: `movement.${a.decision}`,
        targetId: a.movement_id,
        after: data,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
};

export const useApplyMovement = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (movement_id: string) => {
      const { error } = await supabase.rpc("apply_movement", { _movement_id: movement_id });
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "movement.applied", targetId: movement_id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
};

export const useCancelMovement = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (movement_id: string) => {
      const { data, error } = await supabase
        .from("employee_movements")
        .update({ status: "cancelled" })
        .eq("id", movement_id)
        .select("*")
        .single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "movement.cancelled", targetId: movement_id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
};

// ---- Specialised sub-tables ----
export const useEmployeeLeaves = (employeeId?: string) =>
  useQuery({
    enabled: !!employeeId,
    queryKey: [...key, "leaves", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_leaves")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useEmployeeSuspensions = (employeeId?: string) =>
  useQuery({
    enabled: !!employeeId,
    queryKey: [...key, "suspensions", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_suspensions")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useEmployeeAssignments = (employeeId?: string) =>
  useQuery({
    enabled: !!employeeId,
    queryKey: [...key, "assignments", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temporary_assignments")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useKnowledgeTransfers = (employeeId?: string) =>
  useQuery({
    enabled: !!employeeId,
    queryKey: [...key, "kt", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_transfers")
        .select("*")
        .or(`from_employee_id.eq.${employeeId},to_employee_id.eq.${employeeId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateKnowledgeTransfer = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: {
      movement_id?: string | null;
      from_employee_id: string;
      to_employee_id?: string | null;
      checklist?: Array<{ item: string; done: boolean }>;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("knowledge_transfers")
        .insert({
          movement_id: p.movement_id ?? null,
          from_employee_id: p.from_employee_id,
          to_employee_id: p.to_employee_id ?? null,
          checklist: p.checklist ?? [],
          notes: p.notes ?? null,
        })
        .select("*").single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "kt.created", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
};

export const useCreateTemporaryAssignment = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: {
      employee_id: string;
      assignment_kind: string;
      start_date: string;
      end_date: string;
      target_department_id?: string | null;
      target_project?: string | null;
      acting_role?: string | null;
      reason?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("temporary_assignments")
        .insert({ ...p, approver_user_id: user?.id ?? null })
        .select("*").single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "assignment.created", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
};
