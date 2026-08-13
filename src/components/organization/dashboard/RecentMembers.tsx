import { supabase } from "@/integrations/supabase/client";
// RecentMembers — real member list from useOrganizationDashboard.
import { NavLink } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationDashboard } from "@/hooks/organization/useOrganizationDashboard";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";

export const RecentMembers = () => {
  const { recentMembers, loading } = useOrganizationDashboard();
  const { organization } = useOrganizationContext();
  const base = organization?.slug ? `/organization/${organization.slug}` : "/organization";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Team Members</h2>
          <NavLink to={`${base}/members`} className="text-sm text-primary">View all</NavLink>
        </div>

        <div className="space-y-5">
          {loading && recentMembers.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}

          {!loading && recentMembers.length === 0 && (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          )}

          {recentMembers.map((member) => {
            const name = member.profile?.display_name ?? member.profile?.username ?? "Unknown";
            const initial = name.charAt(0).toUpperCase();
            const role = member.role_names[0] ?? (member.status === "pending" ? "Pending" : "Member");
            return (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.status === "active" ? "Active" : member.status}
                    </p>
                  </div>
                </div>
                <Badge>{role}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentMembers;
