/**
 * React Query key factory for the organization workspace.
 * Every hook must build keys through this factory so cache invalidation
 * stays surgical (only affected slices are invalidated).
 */
export const orgKeys = {
  all: ["organization"] as const,
  bySlug: (slug: string | null | undefined) => ["organization", "slug", slug ?? "__none__"] as const,
  detail: (orgId: string) => ["organization", orgId] as const,
  membership: (orgId: string, userId: string) => ["organization", orgId, "membership", userId] as const,
  members: (orgId: string) => ["organization", orgId, "members"] as const,
  member: (orgId: string, memberId: string) => ["organization", orgId, "members", memberId] as const,
  roles: (orgId: string) => ["organization", orgId, "roles"] as const,
  permissions: (orgId: string) => ["organization", orgId, "permissions"] as const,
  rolePermissions: (orgId: string) => ["organization", orgId, "role-permissions"] as const,
  memberRoles: (orgId: string, memberId: string) =>
    ["organization", orgId, "members", memberId, "roles"] as const,
  settings: (orgId: string) => ["organization", orgId, "settings"] as const,
  departments: (orgId: string) => ["organization", orgId, "departments"] as const,
  dashboard: (orgId: string) => ["organization", orgId, "dashboard"] as const,
  recentMembers: (orgId: string) => ["organization", orgId, "dashboard", "recent-members"] as const,
  recentActivity: (orgId: string) => ["organization", orgId, "dashboard", "recent-activity"] as const,
  workspaces: (userId: string) => ["organization", "workspaces", userId] as const,
};
