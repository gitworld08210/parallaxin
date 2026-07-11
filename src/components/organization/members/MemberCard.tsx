// MemberCard — profile card for a single organization member.
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import type { MemberWithProfile } from "@/types/organization/member";

import MemberRoleBadge from "./MemberRoleBadge";
import MemberActionsMenu from "./MemberActionsMenu";

interface MemberCardProps {
  member: MemberWithProfile;
}

export const MemberCard = ({ member }: MemberCardProps) => {
  const { organization } = useOrganizationContext();
  const isOwnerRow = !!organization && member.user_id === organization.owner_user_id;
  const primaryRole = member.role_names[0] ?? (isOwnerRow ? "Owner" : "Member");
  const displayName =
    member.profile?.display_name || member.profile?.username || "Unknown member";
  const initial = displayName.charAt(0).toUpperCase();
  const detailHref = organization?.slug
    ? `/organization/${organization.slug}/members/${member.id}`
    : `/organization/members/${member.id}`;

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <Link to={detailHref} className="flex items-center gap-4 min-w-0">
          <Avatar className="h-14 w-14">
            <AvatarImage src={member.profile?.avatar_url ?? undefined} alt={displayName} />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{displayName}</h3>
            {member.profile?.username && (
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 truncate">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">@{member.profile.username}</span>
              </div>
            )}
            <div className="mt-1 text-xs text-slate-400">
              {member.status === "active" && member.joined_at
                ? `Joined ${new Date(member.joined_at).toLocaleDateString()}`
                : member.status}
            </div>
          </div>
        </Link>
        <MemberActionsMenu member={member} isOwnerRow={isOwnerRow} />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <MemberRoleBadge role={primaryRole} isOwner={isOwnerRow} />
      </div>
    </Card>
  );
};

export default MemberCard;
