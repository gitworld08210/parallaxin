// Thin API layer for organizations. All Supabase queries live in the service files;
// this barrel is retained for compatibility and re-exports the read primitives
// used by the OrganizationProvider.
import { supabase } from "@/integrations/supabase/client";
import type { Organization, WorkspaceSummary } from "@/types/organization/organization";

export const organizationApi = {
  /** Resolve org UUID + membership flags from a URL slug (RPC — server-authoritative). */
  async resolveBySlug(slug: string) {
    const { data, error } = await supabase.rpc("resolve_organization_by_slug", { _slug: slug });
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

  /** Every workspace the signed-in user belongs to (owner or active member). */
  async listWorkspacesForUser(userId: string): Promise<WorkspaceSummary[]> {
    // Fetch member-based and owner-based workspaces in parallel, then merge.
    // Owner rows guarantee owners see their org even without an explicit
    // organization_members entry.
    const [memberRes, ownerRes] = await Promise.all([
      supabase
        .from("organization_members")
        .select("organization_id, organizations(id, slug, name, logo_url, owner_user_id)")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("organizations")
        .select("id, slug, name, logo_url, owner_user_id")
        .eq("owner_user_id", userId),
    ]);
    if (memberRes.error) throw memberRes.error;
    if (ownerRes.error) throw ownerRes.error;

    const byId = new Map<string, WorkspaceSummary>();

    for (const r of (memberRes.data ?? []) as Array<{
      organization_id: string;
      organizations: {
        id: string;
        slug: string;
        name: string;
        logo_url: string | null;
        owner_user_id: string;
      } | null;
    }>) {
      const o = r.organizations;
      if (!o) continue;
      byId.set(o.id, {
        id: o.id,
        slug: o.slug,
        name: o.name,
        logo_url: o.logo_url,
        is_owner: o.owner_user_id === userId,
        role_names: [],
      });
    }

    for (const o of (ownerRes.data ?? []) as Array<{
      id: string;
      slug: string;
      name: string;
      logo_url: string | null;
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
      });
    }

    return Array.from(byId.values());
  },
};
