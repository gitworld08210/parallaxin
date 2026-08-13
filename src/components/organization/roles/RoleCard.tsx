// RoleCard — displays one organization role with edit / delete affordances.
// System roles are non-deletable and cannot be renamed. All actions require
// the `roles.manage` permission (enforced client-side via PermissionGate and
// server-side via RPC).
import { Shield, Pencil, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { useRoleMutations } from "@/hooks/organization/useOrganizationRoles";
import { ORG_PERMISSIONS } from "@/features/organization/permissions.registry";
import type { Role } from "@/types/organization/role";

interface RoleCardProps {
  role: Role;
  memberCount?: number;
  onEdit?: (role: Role) => void;
}

export const RoleCard = ({ role, memberCount, onEdit }: RoleCardProps) => {
  const { hasPermission } = useOrganizationContext();
  const { remove } = useRoleMutations();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canManage = hasPermission(ORG_PERMISSIONS.ROLES_MANAGE);
  const canDelete = canManage && !role.is_system;
  const canEdit = canManage;

  const handleDelete = () => {
    remove.mutate(
      { roleId: role.id },
      {
        onSuccess: () => {
          toast.success("Role deleted");
          setConfirmOpen(false);
        },
        onError: (err: Error) => toast.error(err.message ?? "Failed to delete role"),
      });
  };

  return (
    <>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: role.color ?? "#e2e8f0", color: "white" }}
              >
                <Shield className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 truncate">{role.name}</h3>
                  {role.is_system && (
                    <Badge variant="outline" className="rounded-full text-xs">
                      <Lock className="mr-1 h-3 w-3" /> System
                    </Badge>
                  )}
                  {role.is_default && (
                    <Badge variant="outline" className="rounded-full text-xs">
                      Default
                    </Badge>
                  )}
                </div>
                {role.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {role.description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Priority {role.priority}</span>
                  {typeof memberCount === "number" && <span>· {memberCount} members</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit role"
                  onClick={() => onEdit?.(role)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete role"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{role.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Members currently assigned to this role will be moved to the default role. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RoleCard;
