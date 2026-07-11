// OrganizationMembers — real, paginated members list with invite modal and
// pending invitations section. All data comes from OrganizationProvider +
// dedicated hooks; there are no direct Supabase calls in this file.
import { useState } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import MemberList from "@/components/organization/members/MemberList";
import PendingInvitesList from "@/components/organization/members/PendingInvitesList";
import InviteMemberModal from "@/components/organization/members/InviteMemberModal";
import { PermissionGate } from "@/components/organization/PermissionGate";
import { ORG_PERMISSIONS } from "@/features/organization/permissions.registry";

export default function OrganizationMembers() {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="space-y-8 p-6" data-page="OrganizationMembers">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">
            Manage everyone who has access to this workspace.
          </p>
        </div>
        <PermissionGate permission={ORG_PERMISSIONS.MEMBERS_INVITE}>
          <Button onClick={() => setInviteOpen(true)} className="bg-sky-500 hover:bg-sky-600">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite member
          </Button>
        </PermissionGate>
      </header>

      <PermissionGate permission={ORG_PERMISSIONS.MEMBERS_INVITE}>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Pending invitations</h2>
          <PendingInvitesList />
        </section>
      </PermissionGate>

      <section>
        <MemberList />
      </section>

      <InviteMemberModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
