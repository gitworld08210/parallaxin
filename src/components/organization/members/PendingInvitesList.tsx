// PendingInvitesList — pending invitations for the current organization,
// with a cancel action gated by the members.invite permission (or self).
import { X, Mail, AtSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrganizationInvites, useInviteMutations } from "@/hooks/organization/useOrganizationInvites";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { ORG_PERMISSIONS } from "@/features/organization/permissions.registry";

export const PendingInvitesList = () => {
  const { invites, loading, error } = useOrganizationInvites();
  const { cancel } = useInviteMutations();
  const { hasPermission, membership } = useOrganizationContext();

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No pending invitations.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {invites.map((inv) => {
        const canCancel =
          hasPermission(ORG_PERMISSIONS.MEMBERS_INVITE) || inv.invited_by === membership?.user_id;
        const identifier = inv.email ?? inv.username ?? "unknown";
        const Icon = inv.email ? Mail : AtSign;
        return (
          <Card key={inv.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{identifier}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="rounded-full">
                      {inv.role_name ?? "Member"}
                    </Badge>
                    <span>
                      Sent {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                    </span>
                    <span>·</span>
                    <span>
                      Expires {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              {canCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={cancel.isPending && cancel.variables?.inviteId === inv.id}
                  onClick={() =>
                    cancel.mutate(
                      { inviteId: inv.id },
                      {
                        onSuccess: () => toast.success("Invitation cancelled"),
                        onError: (err: Error) =>
                          toast.error(err.message ?? "Failed to cancel invitation"),
                      },
                    )
                  }
                >
                  {cancel.isPending && cancel.variables?.inviteId === inv.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <X className="mr-2 h-4 w-4" />
                  )}
                  Cancel
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default PendingInvitesList;
