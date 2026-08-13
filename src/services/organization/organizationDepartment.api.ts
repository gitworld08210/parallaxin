// organizationDepartment.api — thin Supabase adapter for departments.
// All UI/hook code must go through department.service.ts, not this file.

import type { Department } from "@/types/organization/department";

export const organizationDepartmentApi = {
  async list(orgId: string): Promise<Department[]> {
      .from("organization_departments")
      .select("*")
      .eq("organization_id", orgId)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as Department[]) ?? [];
  },

  async getById(id: string): Promise<Department | null> {
      .from("organization_departments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as Department | null) ?? null;
  },

  async create(orgId: string, input: {
    name: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
    parentDepartmentId?: string | null;
  }): Promise<string> {
      _organization_id: orgId,
      _name: input.name,
      _description: input.description ?? null,
      _color: input.color ?? null,
      _icon: input.icon ?? null,
      _parent_department_id: input.parentDepartmentId ?? null,
    });
    if (error) throw error;
    return data as string;
  },

  /**
   * Update a department. Uses JSONB patch semantics:
   *   - key present  → apply value (nullable fields accept `null` to clear)
   *   - key absent   → preserve current value
   */
  async update(id: string, patch: Record<string, unknown>): Promise<void> {
      _department_id: id,
      _patch: patch as never,
    });
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    if (error) throw error;
  },

  async assignMember(memberId: string, departmentId: string): Promise<void> {
      _member_id: memberId,
      _department_id: departmentId,
    });
    if (error) throw error;
  },

  async removeMember(memberId: string): Promise<void> {
    if (error) throw error;
  },
};
