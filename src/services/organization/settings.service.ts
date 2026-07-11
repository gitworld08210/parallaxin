// SettingsService — organization_settings row (1:1 with organization) +
// server-side update RPC covering both the organization profile and the
// settings row atomically. All writes go through `org_update_settings`.
import { supabase } from "@/integrations/supabase/client";

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
    const { data, error } = await supabase
      .from("organization_settings")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle();
    if (error) throw error;
    return (data as OrganizationSettings | null) ?? null;
  },

  async update(orgId: string, patch: OrganizationSettingsUpdate): Promise<void> {
    const { error } = await supabase.rpc("org_update_settings", {
      _organization_id: orgId,
      _name: patch.name ?? null,
      _slug: patch.slug ?? null,
      _description: patch.description ?? null,
      _logo_url: patch.logoUrl ?? null,
      _cover_url: patch.coverUrl ?? null,
      _website: patch.website ?? null,
      _email: patch.email ?? null,
      _org_type: patch.orgType ?? null,
      _timezone: patch.timezone ?? null,
      _visibility: patch.visibility ?? null,
      _enabled_modules: patch.enabledModules ?? null,
    });
    if (error) throw error;
  },
};
