// useUserOrganizations — list a given user's active organization memberships
// (org + role names + owner flag). Safe to call outside OrganizationProvider,
// so profile / global-menu / notification surfaces can use it.
import { useQuery } from "@tanstack/react-query";
import { memberService } from "@/services/organization/member.service";
import { orgKeys } from "@/services/organization/queryKeys";

export const useUserOrganizations = (userId: string | null | undefined) => {
  const query = useQuery({
    queryKey: userId
      ? orgKeys.userMemberships(userId)
      : ["organization", "user-memberships", "__none__"],
    queryFn: () => memberService.listUserMemberships(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
  return {
    memberships: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
  };
};
