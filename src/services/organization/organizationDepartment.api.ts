import { supabase } from "@/integrations/supabase/client";
// organizationDepartment.api — thin Supabase adapter for departments.
// All UI/hook code must go through department.service.ts, not this file.

import type { Department } from "@/types/organization/department";

export const organizationDepartmentApi = {
  async list(orgId: string): Promise<Department[]> {
    const { data, error } = await supabase.from("organization_departments").select("*").eq("organization_id", orgId).order("name", { ascending: true });
    if (error) throw error;
    return (data as Department[]) ?? [];
  },

  async getById(id: string): Promise<Department | null> {
    const { data, error } = await supabase.from("organization_departments").select("*").eq("id", id).maybeSingle();
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
    const { data, error } = await supabase.rpc("org_create_department" as never, {
      _organization_id: orgId,
      _name: input.name,
      _description: input.description ?? null,
      _color: input.color ?? null,
      _icon: input.icon ?? null,
      _parent_department_id: input.parentDepartmentId ?? null,
    } as never);
    if (error) throw error;
    return data as string;
  },

  /**
   * Update a department. Uses JSONB patch semantics:
   *   - key present  → apply value (nullable fields accept `null` to clear)
   *   - key absent   → preserve current value
   */
  async update(id: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.rpc("org_update_department" as never, {
      _department_id: id,
      _patch: patch as never,
    } as never);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.rpc("org_delete_department" as never, { _department_id: id } as never);
    if (error) throw error;
  },

  async assignMember(memberId: string, departmentId: string): Promise<void> {
    const { error } = await supabase.rpc("org_assign_member_department" as never, {
      _member_id: memberId,
      _department_id: departmentId,
    } as never);
    if (error) throw error;
  },

  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase.rpc("org_remove_member_department" as never, { _member_id: memberId } as never);
    if (error) throw error;
  },
};

