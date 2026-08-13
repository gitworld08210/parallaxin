// MemberActionsMenu — kebab menu with change-role / remove / transfer-ownership
// actions. Each action is gated by a permission (or owner-only) and calls a
// server-authoritative RPC via useMemberMutations.
import { useState } from "react";
import { MoreVertical, Shield, UserMinus, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { useOrganizationRoles } from "@/hooks/organization/useOrganizationRoles";
import { useMemberMutations } from "@/hooks/organization/useOrganizationMembers";
import { ORG_PERMISSIONS } from "@/features/organization/permissions.registry";
import { isOwnerRole } from "@/types/organization/role";
import type { MemberWithProfile } from "@/types/organization/member";

interface MemberActionsMenuProps {
  member: MemberWithProfile;
  /** True when this row represents the current organization owner. */
  isOwnerRow: boolean;
}

export const MemberActionsMenu = ({ member, isOwnerRow }: MemberActionsMenuProps) => {
  const { hasPermission, role, membership } = useOrganizationContext();
  const { roles } = useOrganizationRoles();
  const { changeRole, remove, transferOwnership } = useMemberMutations();

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);

  const canChangeRole =
    hasPermission(ORG_PERMISSIONS.MEMBERS_CHANGE_ROLE) && !isOwnerRow;
  const canRemove = hasPermission(ORG_PERMISSIONS.MEMBERS_REMOVE) && !isOwnerRow;
  // Ownership transfer is owner-only, and cannot target the current owner.
  const canTransfer = role.isOwner && !isOwnerRow && membership?.user_id !== member.user_id;

  if (!canChangeRole && !canRemove && !canTransfer) return null;

  const handleChangeRole = () => {
    if (!pendingRoleId) return;
    changeRole.mutate(
      { memberId: member.id, roleId: pendingRoleId },
      {
        onSuccess: () => {
          toast.success("Role updated");
          setRoleDialogOpen(false);
        },
        onError: (err: Error) => toast.error(err.message ?? "Failed to update role"),
      });
  };

  const handleRemove = () => {
    remove.mutate(
      { memberId: member.id },
      {
        onSuccess: () => {
          toast.success("Member removed");
          setRemoveDialogOpen(false);
        },
        onError: (err: Error) => toast.error(err.message ?? "Failed to remove member"),
      });
  };

  const handleTransfer = () => {
    transferOwnership.mutate(
      { newOwnerUserId: member.user_id },
      {
        onSuccess: () => {
          toast.success("Ownership transferred");
          setTransferDialogOpen(false);
        },
        onError: (err: Error) => toast.error(err.message ?? "Failed to transfer ownership"),
      });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Member actions">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canChangeRole && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setPendingRoleId(null);
                setRoleDialogOpen(true);
              }}
            >
              <Shield className="mr-2 h-4 w-4" /> Change role
            </DropdownMenuItem>
          )}
          {canTransfer && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setTransferDialogOpen(true);
              }}
            >
              <Crown className="mr-2 h-4 w-4" /> Transfer ownership
            </DropdownMenuItem>
          )}
          {canRemove && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  setRemoveDialogOpen(true);
                }}
              >
                <UserMinus className="mr-2 h-4 w-4" /> Remove from organization
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change role */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Select value={pendingRoleId ?? undefined} onValueChange={setPendingRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.filter((r) => !isOwnerRole(r))
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={!pendingRoleId || changeRole.isPending}>
              {changeRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll lose access to this organization immediately. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer ownership */}
      <AlertDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
            <AlertDialogDescription>
              {member.profile?.display_name ?? member.profile?.username ?? "This member"} will
              become the new owner. You'll lose owner privileges and won't be able to reverse
              this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransfer}
              disabled={transferOwnership.isPending}
            >
              {transferOwnership.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MemberActionsMenu;
