// useOrganizationPermissions — effective permissions for the signed-in user,
// full permission catalogue, per-role permission matrix, and mutation to save
// a role's permission set.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { permissionService } from "@/services/organization/permission.service";
import { roleService } from "@/services/organization/role.service";
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

/** role_id -> permission_key[] for every role in the current org (one query). */
export const useRolePermissionsMatrix = () => {
  const { organizationId } = useOrganizationContext();
  const query = useQuery({
    queryKey: organizationId
      ? orgKeys.rolePermissions(organizationId)
      : ["organization", "__none__", "role-permissions"],
    queryFn: () => permissionService.matrixForOrg(organizationId!),
    enabled: !!organizationId,
    staleTime: 60_000,
  });
  return {
    matrix: query.data ?? {},
    loading: query.isLoading,
    error: query.error as Error | null,
  };
};

/** Save the exact permission set for one role. Optimistic. */
export const useRolePermissionMutations = () => {
  const { organizationId } = useOrganizationContext();
  const qc = useQueryClient();

  const setPermissions = useMutation({
    mutationFn: ({ roleId, keys }: { roleId: string; keys: string[] }) =>
      roleService.setPermissions(roleId, keys),
    onMutate: async ({ roleId, keys }) => {
      if (!organizationId) return;
      const matrixKey = orgKeys.rolePermissions(organizationId);
      const prev = qc.getQueryData<Record<string, string[]>>(matrixKey);
      if (prev) {
        qc.setQueryData<Record<string, string[]>>(matrixKey, { ...prev, [roleId]: [...keys] });
      }
      return { prev, matrixKey };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && ctx.matrixKey) qc.setQueryData(ctx.matrixKey, ctx.prev);
    },
    onSettled: () => {
      if (!organizationId) return;
      qc.invalidateQueries({ queryKey: orgKeys.rolePermissions(organizationId) });
      // effective perms of every member (including current user) may change
      qc.invalidateQueries({ queryKey: orgKeys.detail(organizationId) });
    },
  });

  return { setPermissions };
};
