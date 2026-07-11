// useOrganizationSettings — cached settings row for the current org.
import { useQuery } from "@tanstack/react-query";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { settingsService } from "@/services/organization/settings.service";
import { orgKeys } from "@/services/organization/queryKeys";

export const useOrganizationSettings = () => {
  const { organizationId } = useOrganizationContext();
  const query = useQuery({
    queryKey: organizationId ? orgKeys.settings(organizationId) : ["organization", "__none__", "settings"],
    queryFn: () => settingsService.get(organizationId!),
    enabled: !!organizationId,
    staleTime: 60_000,
  });
  return {
    settings: query.data ?? null,
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
};
