// IncomingInvitesList — invitations addressed to the signed-in user, with
// accept and decline actions. Renders nothing when there are no invites so it
// can be dropped into any dashboard corner.
import { Check, X, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIncomingInvites, useInviteMutations } from "@/hooks/organization/useOrganizationInvites";

export const IncomingInvitesList = () => {
  const { invites, loading, error } = useIncomingInvites();
  const { accept, decline } = useInviteMutations();

  if (loading || error || invites.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">Pending invitations</h2>
      {invites.map((inv) => {
        const pendingAccept = accept.isPending && accept.variables?.token === inv.invite_token;
        const pendingDecline = decline.isPending && decline.variables?.token === inv.invite_token;
        return (
          <Card key={inv.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">You've been invited to a workspace</div>
                  <div className="text-xs text-muted-foreground">
                    Role: {inv.role_name ?? "Member"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pendingAccept || pendingDecline}
                  onClick={() =>
                    decline.mutate(
                      { token: inv.invite_token },
                      {
                        onSuccess: () => toast.success("Invitation declined"),
                        onError: (err: Error) =>
                          toast.error(err.message ?? "Failed to decline"),
                      },
                    )
                  }
                >
                  {pendingDecline ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <X className="mr-2 h-4 w-4" />
                  )}
                  Decline
                </Button>
                <Button
                  size="sm"
                  disabled={pendingAccept || pendingDecline}
                  onClick={() =>
                    accept.mutate(
                      { token: inv.invite_token },
                      {
                        onSuccess: () => toast.success("Joined the organization"),
                        onError: (err: Error) =>
                          toast.error(err.message ?? "Failed to accept"),
                      },
                    )
                  }
                >
                  {pendingAccept ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Accept
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default IncomingInvitesList;
