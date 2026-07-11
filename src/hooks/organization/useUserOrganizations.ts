// useUserOrganizations — canonical membership hook for ANY user id.
// Delegates to organizationService.listWorkspacesForUser so Profile,
// WorkspaceSwitcher and SideMenu all share one source of truth.
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organization/organization.service";
import { orgKeys } from "@/services/organization/queryKeys";

export const useUserOrganizations = (userId: string | null | undefined) => {
  const query = useQuery({
    queryKey: userId
      ? orgKeys.workspaces(userId)
      : orgKeys.workspaces("__none__"),
    queryFn: () => organizationService.listWorkspacesForUser(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
  return {
    memberships: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
  };
};
