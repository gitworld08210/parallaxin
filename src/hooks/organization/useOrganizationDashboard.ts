// useOrganizationDashboard — real data via DashboardService, keyed on org id.
import { useQuery } from "@tanstack/react-query";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { dashboardService } from "@/services/organization/dashboard.service";
import { orgKeys } from "@/services/organization/queryKeys";

export const useOrganizationDashboard = () => {
  const { organizationId, loading: ctxLoading } = useOrganizationContext();

  const stats = useQuery({
    queryKey: organizationId ? orgKeys.dashboard(organizationId) : ["organization", "__none__", "dashboard"],
    queryFn: () => dashboardService.stats(organizationId!),
    enabled: !!organizationId,
    staleTime: 30_000,
  });

  const recentMembers = useQuery({
    queryKey: organizationId
      ? orgKeys.recentMembers(organizationId)
      : ["organization", "__none__", "recent-members"],
    queryFn: () => dashboardService.recentMembers(organizationId!),
    enabled: !!organizationId,
    staleTime: 30_000,
  });

  const recentActivity = useQuery({
    queryKey: organizationId
      ? orgKeys.recentActivity(organizationId)
      : ["organization", "__none__", "recent-activity"],
    queryFn: () => dashboardService.recentActivity(organizationId!),
    enabled: !!organizationId,
    staleTime: 30_000,
  });

  return {
    loading: ctxLoading || stats.isLoading,
    stats: stats.data ?? null,
    statsError: stats.error as Error | null,
    recentMembers: recentMembers.data ?? [],
    recentActivity: recentActivity.data ?? [],
    isFetching: stats.isFetching || recentMembers.isFetching || recentActivity.isFetching,
  };
};
