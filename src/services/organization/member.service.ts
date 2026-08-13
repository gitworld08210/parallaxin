import { supabase } from "@/integrations/supabase/client";
// MemberService — organization member reads + mutations (via RPC).

import type { Member, MemberWithProfile } from "@/types/organization/member";
import { organizationApi } from "./organization.api";

export interface MemberPage {
  members: MemberWithProfile[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface ProfileRow {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  verified: boolean;
}

interface RoleLinkRow {
  member_id: string;
  organization_roles: { id: string; name: string } | null;
}

async function hydrateMembers(members: Member[]): Promise<MemberWithProfile[]> {
  if (members.length === 0) return [];
  const userIds = members.map((m) => m.user_id);
  const memberIds = members.map((m) => m.id);
  const [{ data: profiles }, { data: roleLinks }] = await Promise.all([
    supabase.from("profiles").select("user_id, username, display_name, avatar_url, verified").in("user_id", userIds),
    supabase.from("organization_member_roles").select("member_id, organization_roles(id, name)").in("member_id", memberIds) as any,
  ]);

  const profileMap = new Map<string, MemberWithProfile["profile"]>(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.user_id, p]));
  const roleMap = new Map<string, string[]>();
  for (const link of (roleLinks ?? []) as RoleLinkRow[]) {
    const bucket = roleMap.get(link.member_id) ?? [];
    if (link.organization_roles?.name) bucket.push(link.organization_roles.name);
    roleMap.set(link.member_id, bucket);
  }

  return members.map((m) => ({
    ...m,
    profile: profileMap.get(m.user_id) ?? null,
    role_names: roleMap.get(m.id) ?? [],
  }));
}

export const memberService = {
  /** Full (unpaginated) list — retained for callers that need everyone. */
  async list(orgId: string): Promise<MemberWithProfile[]> {
    const { data: rows, error } = await supabase.from("organization_members").select(
      "id, organization_id, user_id, department_id, status, joined_at, invited_by, created_at, updated_at",
    ).eq("organization_id", orgId).order("joined_at", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return hydrateMembers((rows ?? []) as Member[]);
  },

  /**
   * Server-side paginated members list. Optionally filters by search text
   * (matched client-side against hydrated profile because org_members has no
   * text columns of its own).
   */
  async listPage(
    orgId: string,
    { page = 0, pageSize = 12, search = "" }: { page?: number; pageSize?: number; search?: string } = {},
  ): Promise<MemberPage> {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const {
      data: rows,
      error,
      count,
    } = await supabase.from("organization_members").select(
      "id, organization_id, user_id, department_id, status, joined_at, invited_by, created_at, updated_at",
      { count: "exact" },
    ).eq("organization_id", orgId).order("joined_at", { ascending: false, nullsFirst: false }).range(from, to);

    if (error) throw error;

    let members = await hydrateMembers((rows ?? []) as Member[]);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      members = members.filter(
        (m) =>
          m.profile?.username?.toLowerCase().includes(q) ||
          m.profile?.display_name?.toLowerCase().includes(q));
    }
    const total = count ?? members.length;
    return { members, total, page, pageSize, hasMore: to + 1 < total };
  },

  async recent(orgId: string, limit = 4): Promise<MemberWithProfile[]> {
    const { data: rows, error } = await supabase.from("organization_members").select(
      "id, organization_id, user_id, department_id, status, joined_at, invited_by, created_at, updated_at",
    ).eq("organization_id", orgId).eq("status", "active").order("joined_at", { ascending: false, nullsFirst: false }).limit(limit);
    if (error) throw error;
    return hydrateMembers((rows ?? []) as Member[]);
  },

  async getById(orgId: string, memberId: string): Promise<MemberWithProfile | null> {
    const { data, error } = await supabase.from("organization_members").select(
      "id, organization_id, user_id, department_id, status, joined_at, invited_by, created_at, updated_at",
    ).eq("organization_id", orgId).eq("id", memberId).maybeSingle();

    if (error) throw error;
    if (!data) return null;
    const [hydrated] = await hydrateMembers([data as Member]);
    return hydrated ?? null;
  },

  /**
   * All active memberships for a given user id.
   *
   * NOTE: This is now a thin delegator over
   * `organizationApi.listWorkspacesForUser` — the single canonical
   * membership source shared by Profile, WorkspaceSwitcher, SideMenu and
   * OrganizationProvider. Owners without an explicit organization_members
   * row are included there, keeping every consumer consistent.
   */
  async listUserMemberships(userId: string) {
    return organizationApi.listWorkspacesForUser(userId);
  },


  // ---------- Mutations (permission-checked RPCs) ----------

  async changeRole(orgId: string, memberId: string, roleId: string): Promise<void> {
    const { error } = await supabase.rpc("org_change_member_role" as never, {
      _organization_id: orgId,
      _member_id: memberId,
      _role_id: roleId,
    } as never);
    if (error) throw error;
  },

  async remove(orgId: string, memberId: string): Promise<void> {
    const { error } = await supabase.rpc("org_remove_member" as never, {
      _organization_id: orgId,
      _member_id: memberId,
    } as never);
    if (error) throw error;
  },

  async transferOwnership(orgId: string, newOwnerUserId: string): Promise<void> {
    const { error } = await supabase.rpc("org_transfer_ownership" as never, {
      _organization_id: orgId,
      _new_owner_user_id: newOwnerUserId,
    } as never);
    if (error) throw error;
  },
};

