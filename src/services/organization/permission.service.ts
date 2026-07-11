// PermissionService — catalogue + effective permissions for a user in an org.
import { supabase } from "@/integrations/supabase/client";
import type { Permission } from "@/types/organization/permission";

export const permissionService = {
  /** Full permission catalogue (module + key). */
  async listCatalogue(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from("organization_permissions")
      .select("*")
      .order("module", { ascending: true })
      .order("permission_key", { ascending: true });
    if (error) throw error;
    return (data as Permission[]) ?? [];
  },

  /** All permission keys attached to a role (via organization_role_permissions). */
  async listForRole(roleId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("organization_role_permissions")
      .select("organization_permissions(permission_key)")
      .eq("role_id", roleId);
    if (error) throw error;
    return ((data ?? []) as any[])
      .map((r) => r.organization_permissions?.permission_key)
      .filter(Boolean) as string[];
  },

  /**
   * Effective permissions for a user in an org.
   * - Owner: implicitly gets every catalogue permission.
   * - Otherwise: union of permissions across their assigned roles.
   */
  async listForMember(orgId: string, userId: string): Promise<string[]> {
    const { data: orgRow } = await supabase
      .from("organizations")
      .select("owner_user_id")
      .eq("id", orgId)
      .maybeSingle();

    if (orgRow?.owner_user_id === userId) {
      const catalogue = await this.listCatalogue();
      return catalogue.map((p) => p.permission_key);
    }

    const { data: memberRow, error: memberErr } = await supabase
      .from("organization_members")
      .select("id, status")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (memberErr) throw memberErr;
    if (!memberRow || memberRow.status !== "active") return [];

    const { data: rolePerms, error: rpErr } = await supabase
      .from("organization_member_roles")
      .select(
        "organization_roles!inner(id, organization_role_permissions(organization_permissions(permission_key)))",
      )
      .eq("member_id", memberRow.id);
    if (rpErr) throw rpErr;

    const keys = new Set<string>();
    for (const row of (rolePerms ?? []) as any[]) {
      const role = row.organization_roles;
      if (!role) continue;
      for (const rp of role.organization_role_permissions ?? []) {
        const key = rp.organization_permissions?.permission_key;
        if (key) keys.add(key);
      }
    }
    return Array.from(keys);
  },
};
