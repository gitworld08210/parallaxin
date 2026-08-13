// useOrganizationRoles — cached role list + mutations (create / update /
// delete / assign default). All mutations go through permission-checked RPCs.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import {
  roleService,
  type CreateRoleInput,
  type UpdateRoleInput,
} from "@/services/organization/role.service";
import { orgKeys } from "@/services/organization/queryKeys";
import type { Role } from "@/types/organization/role";

export const useOrganizationRoles = () => {
  const { organizationId } = useOrganizationContext();
  const query = useQuery({
    queryKey: organizationId ? orgKeys.roles(organizationId) : ["organization", "__none__", "roles"],
    queryFn: () => roleService.list(organizationId!),
    enabled: !!organizationId,
    staleTime: 60_000,
  });
  return {
    roles: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
};

/** Role CRUD mutations for the current organization. */
export const useRoleMutations = () => {
  const { organizationId } = useOrganizationContext();
  const qc = useQueryClient();

  const invalidateRoles = () => {
    if (!organizationId) return;
    qc.invalidateQueries({ queryKey: orgKeys.roles(organizationId) });
    // matrix depends on roles too
    qc.invalidateQueries({ queryKey: orgKeys.rolePermissions(organizationId) });
    // effective perms for the current user may have changed
    qc.invalidateQueries({ queryKey: orgKeys.detail(organizationId) });
  };

  const create = useMutation({
    mutationFn: (input: CreateRoleInput) => roleService.create(organizationId!, input),
    onSettled: invalidateRoles,
  });

  const update = useMutation({
    mutationFn: ({ roleId, patch }: { roleId: string; patch: UpdateRoleInput }) =>
      roleService.update(roleId, patch),
    onMutate: async ({ roleId, patch }) => {
      if (!organizationId) return;
      const key = orgKeys.roles(organizationId);
      const prev = qc.getQueryData<Role[]>(key);
      if (prev) {
        qc.setQueryData<Role[]>(
          key,
          prev.map((r) =>
            r.id === roleId
              ? {
                  ...r,
                  name: patch.name ?? r.name,
                  description: patch.description ?? r.description,
                  color: patch.color ?? r.color,
                  priority: patch.priority ?? r.priority,
                }
              : r,
          ));
      }
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && ctx.key) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: invalidateRoles,
  });

  const remove = useMutation({
    mutationFn: ({ roleId }: { roleId: string }) => roleService.remove(roleId),
    onMutate: async ({ roleId }) => {
      if (!organizationId) return;
      const key = orgKeys.roles(organizationId);
      const prev = qc.getQueryData<Role[]>(key);
      if (prev) qc.setQueryData<Role[]>(key, prev.filter((r) => r.id !== roleId));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && ctx.key) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: () => {
      invalidateRoles();
      if (organizationId) {
        // member role names may have changed
        qc.invalidateQueries({ queryKey: ["organization", organizationId, "members"] });
      }
    },
  });

  return { create, update, remove };
};
