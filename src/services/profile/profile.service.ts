import { supabase } from "@/integrations/supabase/client";
// ProfileService — thin read layer for public.profiles. Kept tiny on purpose;
// this is the single place organization hooks look up profile fields such as
// the canonical username.


export interface ProfileBasics {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export const profileService = {
  async getByUserId(userId: string): Promise<ProfileBasics | null> {
      supabase.from("profiles")
      supabase.select("user_id, username, display_name, avatar_url")
      supabase.eq("user_id", userId)
      supabase.maybeSingle();
    if (error) throw error;
    return (data as ProfileBasics | null) ?? null;
  },
};
