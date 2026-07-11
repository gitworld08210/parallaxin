// RoleService — organization role reads.
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/types/organization/role";

export const roleService = {
  async list(orgId: string): Promise<Role[]> {
    const { data, error } = await supabase
      .from("organization_roles")
      .select("*")
      .eq("organization_id", orgId)
      .order("priority", { ascending: true });
    if (error) throw error;
    return (data as Role[]) ?? [];
  },

  async rolesForMember(memberId: string): Promise<Role[]> {
    const { data, error } = await supabase
      .from("organization_member_roles")
      .select("organization_roles(*)")
      .eq("member_id", memberId);
    if (error) throw error;
    return ((data ?? []) as any[])
      .map((r) => r.organization_roles as Role)
      .filter(Boolean);
  },
};
