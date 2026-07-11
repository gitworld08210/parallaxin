// MemberService — organization member reads.
import { supabase } from "@/integrations/supabase/client";
import type { Member, MemberWithProfile } from "@/types/organization/member";

export const memberService = {
  async list(orgId: string): Promise<MemberWithProfile[]> {
    const { data: rows, error } = await supabase
      .from("organization_members")
      .select(
        "id, organization_id, user_id, department_id, status, joined_at, invited_by, created_at, updated_at",
      )
      .eq("organization_id", orgId)
      .order("joined_at", { ascending: false, nullsFirst: false });
    if (error) throw error;
    const members = (rows ?? []) as Member[];
    if (members.length === 0) return [];

    const userIds = members.map((m) => m.user_id);
    const [{ data: profiles }, { data: roleLinks }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, verified")
        .in("user_id", userIds),
      supabase
        .from("organization_member_roles")
        .select("member_id, organization_roles(id, name)")
        .in(
          "member_id",
          members.map((m) => m.id),
        ),
    ]);

    const profileMap = new Map(
      (profiles ?? []).map((p: any) => [
        p.user_id as string,
        p as MemberWithProfile["profile"],
      ]),
    );
    const roleMap = new Map<string, string[]>();
    for (const link of (roleLinks ?? []) as any[]) {
      const bucket = roleMap.get(link.member_id) ?? [];
      if (link.organization_roles?.name) bucket.push(link.organization_roles.name as string);
      roleMap.set(link.member_id, bucket);
    }

    return members.map((m) => ({
      ...m,
      profile: profileMap.get(m.user_id) ?? null,
      role_names: roleMap.get(m.id) ?? [],
    }));
  },

  async recent(orgId: string, limit = 4): Promise<MemberWithProfile[]> {
    const all = await this.list(orgId);
    return all.slice(0, limit);
  },
};
