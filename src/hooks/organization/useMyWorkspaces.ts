// useMyWorkspaces — workspaces the signed-in user belongs to (owner OR member).
// Safe to call outside OrganizationProvider; sourced from organizationService.
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthProvider";
import { organizationService } from "@/services/organization/organization.service";
import { orgKeys } from "@/services/organization/queryKeys";

export const useMyWorkspaces = () => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: orgKeys.workspaces(user?.id ?? "__anon__"),
    queryFn: () => organizationService.listWorkspacesForUser(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  return {
    workspaces: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
  };
};
