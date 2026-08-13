import { supabase } from "@/integrations/supabase/client";
// SettingsService — organization_settings row (1:1 with organization) +
// server-side update RPC covering both the organization profile and the
// settings row atomically. All writes go through `org_update_settings`.


export interface OrganizationSettings {
  organization_id: string;
  visibility: string;
  allow_member_invites: boolean;
  allow_public_posts: boolean;
  allow_direct_messages: boolean;
  require_join_approval: boolean;
  language: string | null;
  timezone: string | null;
  theme_color: string | null;
  accent_color: string | null;
  logo_shape: string | null;
  ai_enabled: boolean;
  enabled_modules: string[];
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettingsUpdate {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  website?: string | null;
  email?: string | null;
  orgType?: string | null;
  timezone?: string | null;
  visibility?: string | null;
  enabledModules?: string[] | null;
}

export const settingsService = {
  async get(orgId: string): Promise<OrganizationSettings | null> {
    const { data, error } = await supabase.from("organization_settings" as any).select("*").eq("organization_id", orgId).maybeSingle();
    if (error) throw error;
    return (data as OrganizationSettings | null) ?? null;
  },

  /**
   * Partial update. Semantics per key:
   *   - key omitted / value `undefined` → preserve current value
   *   - explicit `null`                  → clear (for nullable columns)
   *   - explicit `[]` on `enabledModules`→ save an empty array (disables all)
   * Server (`org_update_settings`) enforces permissions, slug rules, and audit.
   */
  async update(orgId: string, patch: OrganizationSettingsUpdate): Promise<void> {
    const j: Record<string, unknown> = {};
    const put = (key: string, value: unknown) => {
      if (value !== undefined) j[key] = value;
    };
    put("name", patch.name);
    put("slug", patch.slug);
    put("description", patch.description);
    put("logo_url", patch.logoUrl);
    put("cover_url", patch.coverUrl);
    put("website", patch.website);
    put("email", patch.email);
    put("org_type", patch.orgType);
    put("timezone", patch.timezone);
    put("visibility", patch.visibility);
    if (patch.enabledModules !== undefined) j.enabled_modules = patch.enabledModules;

    if (Object.keys(j).length === 0) return; // Nothing to update.

    const { error } = await supabase.rpc("org_update_settings" as never, {
      _organization_id: orgId,
      _patch: j as never,
    } as never);

    if (error) throw error;
  },
};
