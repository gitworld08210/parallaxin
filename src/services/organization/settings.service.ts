// SettingsService — organization_settings row (1:1 with organization).
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
  created_at: string;
  updated_at: string;
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
};
