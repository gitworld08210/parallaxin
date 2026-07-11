// Organization core types. Kept minimal — extend as new columns are surfaced.
import type { OrgPermissionKey } from "@/features/organization/permissions.registry";

export type OrganizationId = string;

export type OrgType = "startup" | "company" | "education" | "ngo" | "government" | "creator" | "community" | "other";

export interface Organization {
  id: OrganizationId;
  slug: string;
  name: string;
  username: string;
  description: string | null;
  bio: string | null;
  logo_url: string | null;
  cover_url: string | null;
  website: string | null;
  email: string | null;
  industry: string | null;
  location: string | null;
  org_type: OrgType | null;
  verified: boolean;
  member_count: number;
  follower_count: number;
  following_count: number;
  post_count: number;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export type MembershipStatus = "active" | "pending" | "suspended" | "left";

export interface OrganizationMembership {
  id: string;
  organization_id: OrganizationId;
  user_id: string;
  department_id: string | null;
  status: MembershipStatus;
  joined_at: string | null;
  invited_by: string | null;
  is_owner: boolean;
}

export interface WorkspaceSummary {
  id: OrganizationId;
  slug: string;
  name: string;
  logo_url: string | null;
  is_owner: boolean;
  role_names: string[];
  /** Canonical membership row id when the user has one; synthesised
   *  "owner:<orgId>" placeholder when the user is only the owner. */
  membership_id: string;
  joined_at: string | null;
  verified: boolean;
  org_type: OrgType | null;
  owner_user_id: string;
}

/** Canonical verification "kind" used by <VerificationBadge/>.
 *  Derived from Organization.org_type so the badge is data-driven. */
export type OrganizationVerificationKind =
  | "verified"
  | "business"
  | "gov"
  | "creator";


export type ResolvedPermissionSet = ReadonlySet<OrgPermissionKey | string>;
