import { supabase } from "@/integrations/supabase/client";
// RolePermissionsTable — permission matrix (roles × permissions). Toggling a
// cell edits a working copy; the Save button per-role commits via the
// permission-checked RPC. Owner role is displayed as fully granted and
// read-only (server also rejects edits).
import { Fragment, useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { useOrganizationRoles } from "@/hooks/organization/useOrganizationRoles";
import {
  useOrganizationPermissions,
  useRolePermissionsMatrix,
  useRolePermissionMutations,
} from "@/hooks/organization/useOrganizationPermissions";
import { ORG_PERMISSIONS } from "@/features/organization/permissions.registry";
import { isOwnerRole, type Role } from "@/types/organization/role";
import type { Permission } from "@/types/organization/permission";


interface Draft {
  [roleId: string]: Set<string>;
}

export const RolePermissionsTable = () => {
  const { hasPermission } = useOrganizationContext();
  const { roles, loading: rolesLoading } = useOrganizationRoles();
  const { catalogue, loading: catLoading } = useOrganizationPermissions();
  const { matrix, loading: matrixLoading } = useRolePermissionsMatrix();
  const { setPermissions } = useRolePermissionMutations();

  const canManage = hasPermission(ORG_PERMISSIONS.ROLES_MANAGE);
  const loading = rolesLoading || catLoading || matrixLoading;

  const grouped = useMemo(() => {
    const g: Record<string, Permission[]> = {};
    for (const p of catalogue) (g[p.module] ??= []).push(p);
    return g;
  }, [catalogue]);

  const [draft, setDraft] = useState<Draft>({});
  useEffect(() => {
    // Hydrate the draft whenever the source matrix changes (after save or refetch).
    const next: Draft = {};
    for (const role of roles) next[role.id] = new Set(matrix[role.id] ?? []);
    setDraft(next);
  }, [roles, matrix]);

  const toggle = (roleId: string, key: string) => {
    setDraft((prev) => {
      const set = new Set(prev[roleId] ?? []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, [roleId]: set };
    });
  };

  const isDirty = (roleId: string) => {
    const current = new Set(matrix[roleId] ?? []);
    const next = draft[roleId] ?? new Set<string>();
    if (current.size !== next.size) return true;
    for (const k of next) if (!current.has(k)) return true;
    return false;
  };

  const savingRoleId =
    setPermissions.isPending && setPermissions.variables?.roleId
      ? setPermissions.variables.roleId
      : null;

  const handleSave = (role: Role) => {
    const keys = Array.from(draft[role.id] ?? []);
    setPermissions.mutate(
      { roleId: role.id, keys },
      {
        onSuccess: () => toast.success(`Updated ${role.name} permissions`),
        onError: (err: Error) => toast.error(err.message ?? "Failed to save permissions"),
      });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        </CardContent>
      </Card>
    );
  }

  if (roles.length === 0 || catalogue.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No roles or permissions to configure yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {roles.map((role) => {
          if (isOwnerRole(role)) return null;
          const dirty = isDirty(role.id);
          if (!dirty) return null;
          return (
            <Button
              key={role.id}
              size="sm"
              disabled={!canManage || savingRoleId === role.id}
              onClick={() => handleSave(role)}
            >
              {savingRoleId === role.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save {role.name}
            </Button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Permission</TableHead>
                {roles.map((role) => (
                  <TableHead key={role.id} className="text-center">
                    <div className="font-semibold">{role.name}</div>
                    {isOwnerRole(role) && (
                      <div className="text-[10px] font-normal text-muted-foreground">
                        Full access
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(grouped).map(([module, perms]) => (
                <Fragment key={module}>
                  <TableRow key={`m-${module}`} className="bg-slate-50">
                    <TableCell
                      colSpan={1 + roles.length}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {module}
                    </TableCell>
                  </TableRow>
                  {perms.map((perm) => (
                    <TableRow key={perm.id}>
                      <TableCell>
                        <div className="font-medium">{perm.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {perm.description ?? perm.permission_key}
                        </div>
                      </TableCell>
                      {roles.map((role) => {
                        const ownerRow = isOwnerRole(role);
                        const checked = ownerRow
                          ? true
                          : draft[role.id]?.has(perm.permission_key) ?? false;
                        const disabled = ownerRow || !canManage;
                        return (
                          <TableCell key={role.id} className="text-center">
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={() => toggle(role.id, perm.permission_key)}
                              aria-label={`Toggle ${perm.name} for ${role.name}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RolePermissionsTable;
