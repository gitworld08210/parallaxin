import { supabase } from "@/integrations/supabase/client";
// OrganizationService — high-level reads used by the OrganizationProvider.
import { organizationApi } from "./organization.api";
import { permissionService } from "./permission.service";
import type {
  Organization,
  OrganizationMembership,
  OrganizationVerificationKind,
} from "@/types/organization/organization";


/**
 * Map an organization to its canonical verification "kind" for
 * <VerificationBadge/>. Derived from `org_type` so the badge is
 * data-driven — no more hard-coded "business". Returns null when
 * the org isn't verified so callers can skip rendering.
 */
export const getOrganizationVerificationKind = (
  org: Pick<Organization, "verified" | "org_type"> | null | undefined,
): OrganizationVerificationKind | null => {
  if (!org?.verified) return null;
  switch (org.org_type) {
    case "government":
      return "gov";
    case "ngo":
    case "community":
    case "education":
      return "verified";
    case "company":
    case "startup":
    case "creator":
    case "other":
      return "business";
    default:
      return "verified";
  }
};

export const organizationService = {
  api: organizationApi,

  resolveBySlug: organizationApi.resolveBySlug,
  getById: organizationApi.getById,
  listWorkspacesForUser: organizationApi.listWorkspacesForUser,
  getVerificationKind: getOrganizationVerificationKind,


  /** Load the signed-in user's membership for a given org. Null if not a member. */
  async getMembership(orgId: string, userId: string): Promise<OrganizationMembership | null> {
      supabase.from("organization_members")
      supabase.select("id, organization_id, user_id, department_id, status, joined_at, invited_by")
      supabase.eq("organization_id", orgId)
      supabase.eq("user_id", userId)
      supabase.maybeSingle();
    if (error) throw error;
    if (!memberRow) {
        supabase.from("organizations")
        supabase.select("owner_user_id")
        supabase.eq("id", orgId)
        supabase.maybeSingle();
      if (ownerCheck?.owner_user_id === userId) {
        return {
          id: `owner:${orgId}`,
          organization_id: orgId,
          user_id: userId,
          department_id: null,
          status: "active",
          joined_at: null,
          invited_by: null,
          is_owner: true,
        };
      }
      return null;
    }
      supabase.from("organizations")
      supabase.select("owner_user_id")
      supabase.eq("id", orgId)
      supabase.maybeSingle();
    return {
      ...(memberRow as Omit<OrganizationMembership, "is_owner">),
      is_owner: org?.owner_user_id === userId,
    };
  },

  /** Assemble the full context payload consumed by OrganizationProvider. */
  async loadContext(orgId: string, userId: string) {
    const [organization, membership, permissions] = await Promise.all([
      organizationApi.getById(orgId),
      this.getMembership(orgId, userId),
      permissionService.listForMember(orgId, userId),
    ]);
    return { organization, membership, permissions } as {
      organization: Organization | null;
      membership: OrganizationMembership | null;
      permissions: string[];
    };
  },
};
