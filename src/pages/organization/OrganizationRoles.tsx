import { supabase } from "@/integrations/supabase/client";
// OrganizationRoles — list + create/edit/delete roles. All actions gated by
// roles.manage (enforced server-side by every RPC too).
import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOrganizationRoles } from "@/hooks/organization/useOrganizationRoles";
import RoleCard from "@/components/organization/roles/RoleCard";
import RoleFormModal from "@/components/organization/roles/RoleFormModal";
import { PermissionGate } from "@/components/organization/PermissionGate";
import { ORG_PERMISSIONS } from "@/features/organization/permissions.registry";
import type { Role } from "@/types/organization/role";

export default function OrganizationRoles() {
  const { roles, loading, error } = useOrganizationRoles();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const openCreate = () => {
    setEditingRole(null);
    setFormOpen(true);
  };
  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6 p-6" data-page="OrganizationRoles">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Define which permissions belong to which role.
          </p>
        </div>
        <PermissionGate permission={ORG_PERMISSIONS.ROLES_MANAGE}>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New role
          </Button>
        </PermissionGate>
      </header>

      {error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          {error.message}
        </div>
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-xl font-semibold text-slate-900">No roles yet</h3>
          <p className="mt-2 text-slate-500">Create your first role to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} onEdit={openEdit} />
          ))}
        </div>
      )}

      <RoleFormModal open={formOpen} onOpenChange={setFormOpen} role={editingRole} />
    </div>
  );
}
