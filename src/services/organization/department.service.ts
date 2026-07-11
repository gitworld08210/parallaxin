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
};
