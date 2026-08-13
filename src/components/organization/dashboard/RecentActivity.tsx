import { supabase } from "@/integrations/supabase/client";
// RecentActivity — real audit/activity data from useOrganizationDashboard.
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationDashboard } from "@/hooks/organization/useOrganizationDashboard";

export const RecentActivity = () => {
  const { recentActivity, loading } = useOrganizationDashboard();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent Activity</h2>
          <span className="text-sm text-muted-foreground">Live</span>
        </div>

        <div className="space-y-5">
          {loading && recentActivity.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}

          {!loading && recentActivity.length === 0 && (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}

          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>
                  <Activity className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{activity.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
