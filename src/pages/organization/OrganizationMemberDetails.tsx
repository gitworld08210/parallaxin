// OrganizationMemberDetails — profile card + actions for one member. Reads
// everything through hooks; the actions live in <MemberActionsMenu/>.
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Calendar } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { useOrganizationMember } from "@/hooks/organization/useOrganizationMembers";
import MemberRoleBadge from "@/components/organization/members/MemberRoleBadge";
import MemberActionsMenu from "@/components/organization/members/MemberActionsMenu";

export default function OrganizationMemberDetails() {
  const { memberId, slug } = useParams<{ memberId: string; slug?: string }>();
  const { organization } = useOrganizationContext();
  const { member, loading, error } = useOrganizationMember(memberId);

  const backHref = slug ? `/organization/${slug}/members` : "/organization/members";

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to members
          </Link>
        </Button>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            {error ? "Couldn't load this member" : "Member not found"}
          </h2>
          {error && <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>}
        </div>
      </div>
    );
  }

  const isOwnerRow = !!organization && member.user_id === organization.owner_user_id;
  const displayName =
    member.profile?.display_name || member.profile?.username || "Unknown member";
  const primaryRole = member.role_names[0] ?? (isOwnerRow ? "Owner" : "Member");

  return (
    <div className="p-6 space-y-6" data-page="OrganizationMemberDetails">
      <Button variant="ghost" size="sm" asChild>
        <Link to={backHref}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to members
        </Link>
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={member.profile?.avatar_url ?? undefined} alt={displayName} />
                <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {member.profile?.username && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    @{member.profile.username}
                  </div>
                )}
                {member.joined_at && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </div>
                )}
                <div className="mt-3">
                  <MemberRoleBadge role={primaryRole} isOwner={isOwnerRow} />
                </div>
              </div>
            </div>
            <MemberActionsMenu member={member} isOwnerRow={isOwnerRow} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold">Roles</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {member.role_names.length === 0 ? (
              <span className="text-sm text-muted-foreground">No roles assigned.</span>
            ) : (
              member.role_names.map((name) => (
                <MemberRoleBadge key={name} role={name} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
