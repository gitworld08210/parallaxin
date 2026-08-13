import { supabase } from "@/integrations/supabase/client";
// PermissionService — catalogue, per-role permissions, and effective
// permissions for a user in an org.

import type { Permission } from "@/types/organization/permission";

interface RolePermRow {
  role_id: string;
  organization_permissions: { permission_key: string } | null;
}

interface MemberRolesPermRow {
  organization_roles: {
    id: string;
    organization_role_permissions:
      | Array<{ organization_permissions: { permission_key: string } | null }>
      | null;
  } | null;
}

export const permissionService = {
  /** Full permission catalogue (module + key). */
  async listCatalogue(): Promise<Permission[]> {
    const { data, error } = await supabase.from("organization_permissions").select("*").order("module", { ascending: true }).order("permission_key", { ascending: true });
    if (error) throw error;
    return (data as Permission[]) ?? [];
  },

  /** Permission keys attached to a role. */
  async listForRole(roleId: string): Promise<string[]> {
    const { data, error } = await supabase.from("organization_role_permissions").select("role_id, organization_permissions(permission_key)").eq("role_id", roleId) as any;
    if (error) throw error;
    return ((data ?? []) as RolePermRow[])
      .map((r) => r.organization_permissions?.permission_key).filter((v): v is string => !!v);
  },

  /**
   * Full role→permission_keys map for an organization. One round-trip powers
   * the whole permission matrix (no per-row queries).
   */
  async matrixForOrg(orgId: string): Promise<Record<string, string[]>> {
    const { data, error } = await supabase.from("organization_role_permissions").select("role_id, organization_permissions(permission_key), organization_roles!inner(organization_id)").eq("organization_roles.organization_id", orgId) as any;
    if (error) throw error;

    const map: Record<string, string[]> = {};
    for (const row of (data ?? []) as RolePermRow[]) {
      const key = row.organization_permissions?.permission_key;
      if (!key) continue;
      (map[row.role_id] ??= []).push(key);
    }
    return map;
  },

  async listForMember(orgId: string, userId: string): Promise<string[]> {
    const { data: orgRow } = await supabase.from("organizations").select("owner_user_id").eq("id", orgId).maybeSingle();

    if (orgRow?.owner_user_id === userId) {
      const catalogue = await this.listCatalogue();
      return catalogue.map((p) => p.permission_key);
    }

    const { data: memberRow, error: memberErr } = await supabase.from("organization_members").select("id, status").eq("organization_id", orgId).eq("user_id", userId).maybeSingle();
    if (memberErr) throw memberErr;
    if (!memberRow || memberRow.status !== "active") return [];

    const { data: rolePerms, error: rpErr } = await supabase.from("organization_member_roles").select(
        "organization_roles!inner(id, organization_role_permissions(organization_permissions(permission_key)))",
      ).eq("member_id", memberRow.id) as any;

    if (rpErr) throw rpErr;

    const keys = new Set<string>();
    for (const row of (rolePerms ?? []) as MemberRolesPermRow[]) {
      const role = row.organization_roles;
      if (!role) continue;
      for (const rp of role.organization_role_permissions ?? []) {
        const k = rp.organization_permissions?.permission_key;
        if (k) keys.add(k);
      }
    }
    return Array.from(keys);
  },
};
