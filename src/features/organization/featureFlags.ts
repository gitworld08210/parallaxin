/**
 * Organization feature flags. Toggle unfinished modules from a single place
 * so sidebar, routes, and page-level guards stay in sync.
 *
 * Rules:
 *  - Only flip a flag to `true` once the module has real services + hooks + UI.
 *  - Sidebar and any page-level guard must call `isOrgFeatureEnabled(key)`.
 */
export const ORG_FEATURE_FLAGS = {
  dashboard: true,
  feed: false,
  reels: false,
  stories: false,
  announcements: false,
  members: false,
  departments: false,
  roles: false,
  permissions: false,
  projects: false,
  tasks: false,
  calendar: false,
  drive: false,
  hiring: false,
  analytics: false,
  ai: false,
  settings: true,
  profile: true,
  search: false,
  notifications: false,
} as const;

export type OrgFeatureKey = keyof typeof ORG_FEATURE_FLAGS;

export const isOrgFeatureEnabled = (key: OrgFeatureKey): boolean =>
  ORG_FEATURE_FLAGS[key] === true;
