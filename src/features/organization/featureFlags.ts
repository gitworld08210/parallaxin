/**
 * Organization feature flags.
 *
 * Enablement is stored per-organization in `organization_settings.enabled_modules`
 * (server-authoritative). Consumers should call `useOrgFeatureFlag(key)` /
 * `useOrgFeatureFlags()` so the sidebar, routes, and page guards react to org
 * settings changes.
 *
 * The static `DEFAULT_ORG_FEATURES` map here only describes which modules ship
 * with Phase 4/5. It is the fallback used while settings are loading (or when
 * no settings row exists yet). It is NOT the source of truth at runtime.
 */
import { useMemo } from "react";
import { useOrganizationSettings } from "@/hooks/organization/useOrganizationSettings";

export const ORG_FEATURE_KEYS = [
  "dashboard",
  "feed",
  "reels",
  "stories",
  "announcements",
  "members",
  "departments",
  "roles",
  "permissions",
  "projects",
  "tasks",
  "calendar",
  "drive",
  "hiring",
  "analytics",
  "ai",
  "settings",
  "profile",
  "search",
  "notifications",
] as const;

export type OrgFeatureKey = (typeof ORG_FEATURE_KEYS)[number];

/**
 * Fallback feature flags used before the settings row loads (or when the org
 * has none). Keep this in sync with the migration default for
 * `organization_settings.enabled_modules` so first-run experience matches.
 */
export const DEFAULT_ORG_FEATURES: Record<OrgFeatureKey, boolean> = {
  dashboard: true,
  feed: false,
  reels: true,
  stories: true,
  announcements: false,
  members: true,
  departments: true,
  roles: true,
  permissions: true,
  projects: true,
  tasks: true,
  calendar: false,
  drive: false,
  hiring: false,
  analytics: false,
  ai: true,
  settings: true,
  profile: true,
  search: false,
  notifications: false,
};

/** Legacy static check — retained for narrow internal callers only. */
export const isOrgFeatureEnabled = (key: OrgFeatureKey): boolean =>
  DEFAULT_ORG_FEATURES[key] === true;

/** Reactive feature-flag map for the current organization. */
export const useOrgFeatureFlags = (): Record<OrgFeatureKey, boolean> => {
  const { settings } = useOrganizationSettings();
  return useMemo(() => {
    const enabled = settings?.enabled_modules;
    if (!enabled || enabled.length === 0) return { ...DEFAULT_ORG_FEATURES };
    const set = new Set(enabled);
    const out = { ...DEFAULT_ORG_FEATURES };
    (Object.keys(out) as OrgFeatureKey[]).forEach((k) => {
      out[k] = set.has(k);
    });
    // Always keep foundational surfaces reachable.
    out.dashboard = true;
    out.settings = true;
    out.profile = true;
    return out;
  }, [settings?.enabled_modules]);
};

export const useOrgFeatureEnabled = (key: OrgFeatureKey): boolean => {
  const flags = useOrgFeatureFlags();
  return flags[key];
};
