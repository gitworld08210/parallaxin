import { supabase } from "@/integrations/supabase/client";
// Thin API layer for organizations. All Supabase queries live in the service files;
// this barrel is retained for compatibility and re-exports the read primitives
// used by the OrganizationProvider.

import type {
  Organization,
  OrgType,
  WorkspaceSummary,
} from "@/types/organization/organization";

interface RoleLinkRow {
  member_id: string;
  organization_roles: { id: string; name: string } | null;
}

export const organizationApi = {
  /** Resolve org UUID + membership flags from a URL slug (RPC — server-authoritative). */
  async resolveBySlug(slug: string) {
    const { data, error } = await supabase.rpc("org_resolve_by_slug" as never, { _slug: slug } as never);
    if (error) throw error;
    return (Array.isArray(data) ? data[0] : data) as
      | {
          id: string;
          slug: string;
          name: string;
          username: string;
          logo_url: string | null;
          cover_url: string | null;
          org_type: string | null;
          is_member: boolean;
          is_owner: boolean;
        }
      | null;
  },

  /** Full organization row by id. */
  async getById(id: string): Promise<Organization | null> {
    const { data, error } = await supabase.from("organizations").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data as Organization | null) ?? null;
  },

  /**
   * Canonical membership source: every workspace `userId` belongs to,
   * whether as an active member OR as the organization owner (owners
   * without an explicit `organization_members` row are included so every
   * consumer — Profile chips, WorkspaceSwitcher, SideMenu — agrees).
   *
   * Returns a rich `WorkspaceSummary` (org identity + verified + org_type
   * + role_names + joined_at) so downstream surfaces don't need parallel
   * queries.
   */
  async listWorkspacesForUser(userId: string): Promise<WorkspaceSummary[]> {
    const [memberRes, ownerRes] = await Promise.all([
        supabase.from("organization_members").select(
          "id, joined_at, organization_id, organizations(id, slug, name, logo_url, verified, org_type, owner_user_id)",
        ).eq("user_id", userId).eq("status", "active") as any,
        supabase.from("organizations").select("id, slug, name, logo_url, verified, org_type, owner_user_id").eq("owner_user_id", userId) as any,

    ]);
    if (memberRes.error) throw memberRes.error;
    if (ownerRes.error) throw ownerRes.error;

    const memberRows = (memberRes.data ?? []) as Array<{
      id: string;
      joined_at: string | null;
      organization_id: string;
      organizations: {
        id: string;
        slug: string;
        name: string;
        logo_url: string | null;
        verified: boolean;
        org_type: OrgType | null;
        owner_user_id: string;
      } | null;
    }>;

    // Fetch role names for the member rows so consumers can render role chips.
    const memberIds = memberRows.map((r) => r.id);
    let roleMap = new Map<string, string[]>();
    if (memberIds.length > 0) {
      const { data: roleRows, error: roleErr } = await supabase.from("organization_member_roles").select("member_id, organization_roles(id, name)").in("member_id", memberIds) as any;
      if (roleErr) throw roleErr;
      for (const l of ((roleRows ?? []) as RoleLinkRow[])) {
        const bucket = roleMap.get(l.member_id) ?? [];
        if (l.organization_roles?.name) bucket.push(l.organization_roles.name);
        roleMap.set(l.member_id, bucket);
      }
    }

    const byId = new Map<string, WorkspaceSummary>();
    for (const r of memberRows) {
      const o = r.organizations;
      if (!o) continue;
      byId.set(o.id, {
        id: o.id,
        slug: o.slug,
        name: o.name,
        logo_url: o.logo_url,
        is_owner: o.owner_user_id === userId,
        role_names: roleMap.get(r.id) ?? [],
        membership_id: r.id,
        joined_at: r.joined_at,
        verified: !!o.verified,
        org_type: o.org_type,
        owner_user_id: o.owner_user_id,
      });
    }

    // Owner-only workspaces (no organization_members row): synthesise one so
    // owners never disappear from Profile / SideMenu / WorkspaceSwitcher.
    for (const o of (ownerRes.data ?? []) as Array<{
      id: string;
      slug: string;
      name: string;
      logo_url: string | null;
      verified: boolean;
      org_type: OrgType | null;
      owner_user_id: string;
    }>) {
      if (byId.has(o.id)) continue;
      byId.set(o.id, {
        id: o.id,
        slug: o.slug,
        name: o.name,
        logo_url: o.logo_url,
        is_owner: true,
        role_names: [],
        membership_id: `owner:${o.id}`,
        joined_at: null,
        verified: !!o.verified,
        org_type: o.org_type,
        owner_user_id: o.owner_user_id,
      });
    }

    return Array.from(byId.values());
  },
};
