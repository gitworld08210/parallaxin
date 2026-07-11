// useOrganizationMembers — cached member list for the current org.
import { useQuery } from "@tanstack/react-query";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { memberService } from "@/services/organization/member.service";
import { orgKeys } from "@/services/organization/queryKeys";

export const useOrganizationMembers = () => {
  const { organizationId } = useOrganizationContext();
  const query = useQuery({
    queryKey: organizationId ? orgKeys.members(organizationId) : ["organization", "__none__", "members"],
    queryFn: () => memberService.list(organizationId!),
    enabled: !!organizationId,
    staleTime: 30_000,
  });
  return {
    members: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
};
