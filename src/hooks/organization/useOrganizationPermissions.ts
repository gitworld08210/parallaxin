// useOrganizationPermissions — effective permissions for the signed-in user
// plus the full permission catalogue for role editors.
import { useQuery } from "@tanstack/react-query";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { permissionService } from "@/services/organization/permission.service";
import { orgKeys } from "@/services/organization/queryKeys";
import type { OrgPermissionKey } from "@/features/organization/permissions.registry";

export const useOrganizationPermissions = () => {
  const { organizationId, permissions, hasPermission, loading } = useOrganizationContext();
  const catalogue = useQuery({
    queryKey: organizationId
      ? orgKeys.permissions(organizationId)
      : ["organization", "__none__", "permissions"],
    queryFn: () => permissionService.listCatalogue(),
    enabled: !!organizationId,
    staleTime: 5 * 60_000,
  });
  return {
    permissions,
    catalogue: catalogue.data ?? [],
    loading: loading || catalogue.isLoading,
    error: catalogue.error as Error | null,
    has: (key: OrgPermissionKey | string) => hasPermission(key),
  };
};
