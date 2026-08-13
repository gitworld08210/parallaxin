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

  /**
   * Partial update. Only keys present on `patch` are sent — this preserves
   * "undefined = keep" while allowing `null` to clear nullable fields.
   */
  update: (id: string, patch: UpdateDepartmentInput): Promise<void> => {
    const jsonPatch: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(patch, "name")) jsonPatch.name = patch.name;
    if (Object.prototype.hasOwnProperty.call(patch, "description"))
      jsonPatch.description = patch.description;
    if (Object.prototype.hasOwnProperty.call(patch, "color")) jsonPatch.color = patch.color;
    if (Object.prototype.hasOwnProperty.call(patch, "icon")) jsonPatch.icon = patch.icon;
    if (Object.prototype.hasOwnProperty.call(patch, "parentDepartmentId"))
      jsonPatch.parent_department_id = patch.parentDepartmentId;
    return organizationDepartmentApi.update(id, jsonPatch);
  },

  remove: (id: string): Promise<void> => organizationDepartmentApi.remove(id),

  assignMember: (memberId: string, departmentId: string): Promise<void> =>
    organizationDepartmentApi.assignMember(memberId, departmentId),

  removeMember: (memberId: string): Promise<void> =>
    organizationDepartmentApi.removeMember(memberId),

  /**
   * Return { department_id -> active_member_count } for a given org.
   * Uses a server-side aggregate RPC so we never download raw member rows.
   */
  async memberCountsByDepartment(orgId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase.rpc("org_member_counts_by_department" as never, {
      _organization_id: orgId,
    } as never);

    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ department_id: string; member_count: number }>) {
      if (!row.department_id) continue;
      counts[row.department_id] = Number(row.member_count) || 0;
    }
    return counts;
  },
};
