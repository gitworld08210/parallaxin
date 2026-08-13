import { supabase } from "@/integrations/supabase/client";
// InviteService — organization invitation reads + mutations (via RPC).

import type { Invite, InviteWithMeta } from "@/types/organization/invite";

interface InviterProfileRow {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface RoleRow {
  id: string;
  name: string;
}

export const inviteService = {
  /** Pending invitations for an organization (admin-facing). */
  async listPending(orgId: string): Promise<InviteWithMeta[]> {
    const { data, error } = await supabase.from("organization_invites").select(
      "id, organization_id, invited_by, email, username, role_id, invite_token, status, expires_at, accepted_at, created_at",
    ).eq("organization_id", orgId).eq("status", "pending").order("created_at", { ascending: false });
    if (error) throw error;
    return hydrateInvites((data ?? []) as Invite[]);
  },

  /**
   * Pending invitations targeted at the signed-in user. Uses a security-definer
   * RPC because the base table's SELECT policy is scoped to org members;
   * the RPC filters by the caller's auth email + profile username server-side.
   */
  async listIncomingForUser(_opts?: {
    username?: string | null;
    email?: string | null;
  }): Promise<InviteWithMeta[]> {
    const { data, error } = await supabase.rpc("org_list_incoming_invites" as never, {
      _username: _opts?.username ?? null,
      _email: _opts?.email ?? null,
    } as never);
    if (error) throw error;
    const rows = (data ?? []) as any[];
    return rows.map((r) => ({
      id: r.id,
      organization_id: r.organization_id,
      invited_by: r.invited_by,
      email: r.email,
      username: r.username,
      role_id: r.role_id,
      invite_token: r.invite_token,
      status: r.status,
      expires_at: r.expires_at,
      accepted_at: null,
      created_at: r.created_at,
      inviter: r.inviter_user_id
        ? {
            user_id: r.inviter_user_id,
            username: r.inviter_username,
            display_name: r.inviter_display_name,
            avatar_url: r.inviter_avatar_url,
          }
        : null,
      role_name: r.role_name ?? null,
      // Also expose org name/logo directly on the row for banner rendering.
      organization: {
        id: r.organization_id,
        name: r.organization_name,
        slug: r.organization_slug,
        logo_url: r.organization_logo_url,
      },
    })) as any;
  },


  // ---------- Mutations (permission-checked RPCs) ----------

  async invite(
    orgId: string,
    { email, username, roleId }: { email?: string; username?: string; roleId?: string | null },
  ): Promise<string> {
    const { data, error } = await supabase.rpc("org_invite_member" as never, {
      _organization_id: orgId,
      _email: email ?? null,
      _username: username ?? null,
      _role_id: roleId ?? null,
    } as never);
    if (error) throw error;
    return data as string;
  },

  async accept(inviteToken: string): Promise<string> {
    const { data, error } = await supabase.rpc("org_accept_invite" as never, { _token: inviteToken } as never);
    if (error) throw error;
    return data as string;
  },

  async decline(inviteToken: string): Promise<void> {
    const { error } = await supabase.rpc("org_decline_invite" as never, { _token: inviteToken } as never);
    if (error) throw error;
  },

  async cancel(inviteId: string): Promise<void> {
    const { error } = await supabase.rpc("org_cancel_invite" as never, { _invite_id: inviteId } as never);
    if (error) throw error;
  },

};

async function hydrateInvites(invites: Invite[]): Promise<InviteWithMeta[]> {
  if (invites.length === 0) return [];
  const inviterIds = Array.from(new Set(invites.map((i) => i.invited_by)));
  const roleIds = Array.from(
    new Set(invites.map((i) => i.role_id).filter((v): v is string => !!v)));

  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", inviterIds),
    roleIds.length
      ? supabase.from("organization_roles").select("id, name").in("id", roleIds)
      : Promise.resolve({ data: [] as RoleRow[] }),
  ]);


  const profileMap = new Map<string, InviterProfileRow>(
    ((profiles ?? []) as InviterProfileRow[]).map((p) => [p.user_id, p]));
  const roleMap = new Map<string, string>(
    ((roles ?? []) as RoleRow[]).map((r) => [r.id, r.name]));

  return invites.map((inv) => ({
    ...inv,
    inviter: profileMap.get(inv.invited_by) ?? null,
    role_name: inv.role_id ? roleMap.get(inv.role_id) ?? null : null,
  }));
}
