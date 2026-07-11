// InviteService — organization invitation reads + mutations (via RPC).
import { supabase } from "@/integrations/supabase/client";
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
    const { data, error } = await supabase
      .from("organization_invites")
      .select(
        "id, organization_id, invited_by, email, username, role_id, invite_token, status, expires_at, accepted_at, created_at",
      )
      .eq("organization_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return hydrateInvites((data ?? []) as Invite[]);
  },

  /** Pending invitations targeted at the signed-in user (by username or email). */
  async listIncomingForUser(userId: string): Promise<InviteWithMeta[]> {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, email")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) return [];

    const orClauses: string[] = [];
    if (profile.username) orClauses.push(`username.eq.${profile.username.toLowerCase()}`);
    if (profile.email) orClauses.push(`email.eq.${profile.email.toLowerCase()}`);
    if (orClauses.length === 0) return [];

    const { data, error } = await supabase
      .from("organization_invites")
      .select(
        "id, organization_id, invited_by, email, username, role_id, invite_token, status, expires_at, accepted_at, created_at",
      )
      .eq("status", "pending")
      .or(orClauses.join(","))
      .order("created_at", { ascending: false });
    if (error) throw error;
    return hydrateInvites((data ?? []) as Invite[]);
  },

  // ---------- Mutations (permission-checked RPCs) ----------

  async invite(
    orgId: string,
    { email, username, roleId }: { email?: string; username?: string; roleId?: string | null },
  ): Promise<string> {
    const { data, error } = await supabase.rpc("org_invite_member", {
      _organization_id: orgId,
      _email: email ?? null,
      _username: username ?? null,
      _role_id: roleId ?? null,
    });
    if (error) throw error;
    return data as string;
  },

  async accept(inviteToken: string): Promise<string> {
    const { data, error } = await supabase.rpc("org_accept_invite", { _invite_token: inviteToken });
    if (error) throw error;
    return data as string;
  },

  async decline(inviteToken: string): Promise<void> {
    const { error } = await supabase.rpc("org_decline_invite", { _invite_token: inviteToken });
    if (error) throw error;
  },

  async cancel(inviteId: string): Promise<void> {
    const { error } = await supabase.rpc("org_cancel_invite", { _invite_id: inviteId });
    if (error) throw error;
  },
};

async function hydrateInvites(invites: Invite[]): Promise<InviteWithMeta[]> {
  if (invites.length === 0) return [];
  const inviterIds = Array.from(new Set(invites.map((i) => i.invited_by)));
  const roleIds = Array.from(
    new Set(invites.map((i) => i.role_id).filter((v): v is string => !!v)),
  );

  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", inviterIds),
    roleIds.length
      ? supabase.from("organization_roles").select("id, name").in("id", roleIds)
      : Promise.resolve({ data: [] as RoleRow[] }),
  ]);

  const profileMap = new Map<string, InviterProfileRow>(
    ((profiles ?? []) as InviterProfileRow[]).map((p) => [p.user_id, p]),
  );
  const roleMap = new Map<string, string>(
    ((roles ?? []) as RoleRow[]).map((r) => [r.id, r.name]),
  );

  return invites.map((inv) => ({
    ...inv,
    inviter: profileMap.get(inv.invited_by) ?? null,
    role_name: inv.role_id ? roleMap.get(inv.role_id) ?? null : null,
  }));
}
