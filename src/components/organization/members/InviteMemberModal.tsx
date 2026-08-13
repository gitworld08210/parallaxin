// InviteMemberModal — invite a user by email OR username, with optional role.
// Uses org_invite_member RPC via useInviteMutations.
import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useOrganizationRoles } from "@/hooks/organization/useOrganizationRoles";
import { useInviteMutations } from "@/hooks/organization/useOrganizationInvites";
import { isOwnerRole } from "@/types/organization/role";

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_ROLE_VALUE = "__default__";

export const InviteMemberModal = ({ open, onOpenChange }: InviteMemberModalProps) => {
  const { roles } = useOrganizationRoles();
  const { invite } = useInviteMutations();
  const [tab, setTab] = useState<"email" | "username">("email");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [roleId, setRoleId] = useState<string>(DEFAULT_ROLE_VALUE);

  const reset = () => {
    setEmail("");
    setUsername("");
    setRoleId(DEFAULT_ROLE_VALUE);
    setTab("email");
  };

  const canSubmit = tab === "email" ? email.trim().length > 0 : username.trim().length > 0;

  const handleSubmit = () => {
    invite.mutate(
      {
        email: tab === "email" ? email.trim() : undefined,
        username: tab === "username" ? username.trim() : undefined,
        roleId: roleId === DEFAULT_ROLE_VALUE ? null : roleId,
      },
      {
        onSuccess: () => {
          toast.success("Invitation sent");
          reset();
          onOpenChange(false);
        },
        onError: (err: Error) => toast.error(err.message ?? "Failed to send invitation"),
      });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-5 w-5 text-sky-500" />
            Invite Member
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "email" | "username")}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="username">Username</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="pt-4">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              className="mt-2"
              placeholder="member@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              They'll receive an invitation to join this organization.
            </p>
          </TabsContent>
          <TabsContent value="username" className="pt-4">
            <Label htmlFor="invite-username">Username</Label>
            <Input
              id="invite-username"
              className="mt-2"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              The user must already have an account.
            </p>
          </TabsContent>
        </Tabs>

        <div className="pt-4">
          <Label>Role</Label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Default role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_ROLE_VALUE}>Default (Member)</SelectItem>
              {roles.filter((r) => !isOwnerRole(r))
                .map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={invite.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-sky-500 hover:bg-sky-600"
            onClick={handleSubmit}
            disabled={!canSubmit || invite.isPending}
          >
            {invite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberModal;
