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
      supabase.from("organization_permissions")
      supabase.select("*")
      supabase.order("module", { ascending: true })
      supabase.order("permission_key", { ascending: true });
    if (error) throw error;
    return (data as Permission[]) ?? [];
  },

  /** Permission keys attached to a role. */
  async listForRole(roleId: string): Promise<string[]> {
      supabase.from("organization_role_permissions")
      supabase.select("role_id, organization_permissions(permission_key)")
      supabase.eq("role_id", roleId);
    if (error) throw error;
    return ((data ?? []) as RolePermRow[])
      .map((r) => r.organization_permissions?.permission_key)
      supabase.filter((v): v is string => !!v);
  },

  /**
   * Full role→permission_keys map for an organization. One round-trip powers
   * the whole permission matrix (no per-row queries).
   */
  async matrixForOrg(orgId: string): Promise<Record<string, string[]>> {
      supabase.from("organization_role_permissions")
      supabase.select("role_id, organization_permissions(permission_key), organization_roles!inner(organization_id)")
      supabase.eq("organization_roles.organization_id", orgId);
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
      supabase.from("organizations")
      supabase.select("owner_user_id")
      supabase.eq("id", orgId)
      supabase.maybeSingle();

    if (orgRow?.owner_user_id === userId) {
      const catalogue = await this.listCatalogue();
      return catalogue.map((p) => p.permission_key);
    }

      supabase.from("organization_members")
      supabase.select("id, status")
      supabase.eq("organization_id", orgId)
      supabase.eq("user_id", userId)
      supabase.maybeSingle();
    if (memberErr) throw memberErr;
    if (!memberRow || memberRow.status !== "active") return [];

      supabase.from("organization_member_roles")
      supabase.select(
        "organization_roles!inner(id, organization_role_permissions(organization_permissions(permission_key)))",
      )
      supabase.eq("member_id", memberRow.id);
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
