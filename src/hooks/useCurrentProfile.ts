// useCurrentProfile — cached basic profile (canonical username, display name,
// avatar) for the signed-in user. Sourced from public.profiles, never from
// auth.user_metadata.
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthProvider";
import { profileService } from "@/services/profile/profile.service";

export const currentProfileKey = (userId: string) => ["profile", "me", userId] as const;

export const useCurrentProfile = () => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: user?.id ? currentProfileKey(user.id) : ["profile", "me", "__anon__"],
    queryFn: () => profileService.getByUserId(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });
  return {
    profile: query.data ?? null,
    loading: query.isLoading,
    error: query.error as Error | null,
  };
};
