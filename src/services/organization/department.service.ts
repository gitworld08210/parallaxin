// DepartmentService — organization department reads + mutations.
// UI components must go through the hook layer; hooks call this service.
import { supabase } from "@/integrations/supabase/client";
import { organizationDepartmentApi } from "./organizationDepartment.api";
import type {
  CreateDepartmentInput,
  Department,
  UpdateDepartmentInput,
} from "@/types/organization/department";

export const departmentService = {
  api: organizationDepartmentApi,

  list: (orgId: string): Promise<Department[]> => organizationDepartmentApi.list(orgId),
  getById: (id: string): Promise<Department | null> => organizationDepartmentApi.getById(id),

  create: (orgId: string, input: CreateDepartmentInput): Promise<string> =>
    organizationDepartmentApi.create(orgId, {
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      parentDepartmentId: input.parentDepartmentId ?? null,
    }),

  update: (id: string, patch: UpdateDepartmentInput): Promise<void> =>
    organizationDepartmentApi.update(id, {
      name: patch.name,
      description: patch.description ?? null,
      color: patch.color ?? null,
      icon: patch.icon ?? null,
      parentDepartmentId: patch.parentDepartmentId ?? null,
    }),

  remove: (id: string): Promise<void> => organizationDepartmentApi.remove(id),

  assignMember: (memberId: string, departmentId: string): Promise<void> =>
    organizationDepartmentApi.assignMember(memberId, departmentId),

  removeMember: (memberId: string): Promise<void> =>
    organizationDepartmentApi.removeMember(memberId),

  /**
   * Return { department_id -> active_member_count } for a given org.
   * Uses a bounded aggregate query so the tree page doesn't fetch full members.
   */
  async memberCountsByDepartment(orgId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from("organization_members")
      .select("department_id")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .not("department_id", "is", null);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ department_id: string | null }>) {
      if (!row.department_id) continue;
      counts[row.department_id] = (counts[row.department_id] ?? 0) + 1;
    }
    return counts;
  },
};
