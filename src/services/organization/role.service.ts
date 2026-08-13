// RoleService — organization role reads + mutations (permission-checked RPCs).
// Supabase removed
import type { Role } from "@/types/organization/role";

interface RoleLinkRow {
  organization_roles: Role | null;
}

export interface CreateRoleInput {
  name: string;
  description?: string | null;
  color?: string | null;
  priority?: number;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  priority?: number;
}

export const roleService = {
  async list(orgId: string): Promise<Role[]> {
      .from("organization_roles")
      .select("*")
      .eq("organization_id", orgId)
      .order("priority", { ascending: true });
    if (error) throw error;
    return (data as Role[]) ?? [];
  },

  async rolesForMember(memberId: string): Promise<Role[]> {
      .from("organization_member_roles")
      .select("organization_roles(*)")
      .eq("member_id", memberId);
    if (error) throw error;
    return ((data ?? []) as RoleLinkRow[])
      .map((r) => r.organization_roles)
      .filter((r): r is Role => !!r);
  },

  // ---------- Mutations ----------

  async create(orgId: string, input: CreateRoleInput): Promise<string> {
      _organization_id: orgId,
      _name: input.name,
      _description: input.description ?? null,
      _color: input.color ?? null,
      _priority: input.priority ?? 100,
    });
    if (error) throw error;
    return data as string;
  },

  async update(roleId: string, patch: UpdateRoleInput): Promise<void> {
      _role_id: roleId,
      _name: patch.name ?? null,
      _description: patch.description ?? null,
      _color: patch.color ?? null,
      _priority: patch.priority ?? null,
    });
    if (error) throw error;
  },

  async remove(roleId: string): Promise<void> {
    if (error) throw error;
  },

  async setPermissions(roleId: string, permissionKeys: string[]): Promise<void> {
      _role_id: roleId,
      _permission_keys: permissionKeys,
    });
    if (error) throw error;
  },
};
