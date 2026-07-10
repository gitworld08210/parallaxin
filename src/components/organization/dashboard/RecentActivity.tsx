// RecentActivity — UI scaffold. Compose real markup as the feature ships.
import { UserPlus, Clapperboard, FolderPlus, Sparkles, Bell } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const activities = [
  {
    title: "Rahul joined Engineering",
    subtitle: "2 minutes ago",
    icon: UserPlus,
  },
  {
    title: "Marketing uploaded a Reel",
    subtitle: "12 minutes ago",
    icon: Clapperboard,
  },
  {
    title: "Project Aurelix Mobile created",
    subtitle: "34 minutes ago",
    icon: FolderPlus,
  },
  {
    title: "AI summarized today's work",
    subtitle: "1 hour ago",
    icon: Sparkles,
  },
  {
    title: "HR published announcement",
    subtitle: "Today",
    icon: Bell,
  },
];

export const RecentActivity = () => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent Activity</h2>

          <span className="text-sm text-muted-foreground">Live</span>
        </div>

        <div className="space-y-5">
          {activities.map((activity) => {
            const Icon = activity.icon;

            return (
              <div key={activity.title} className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>
                    <Icon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <p className="font-medium">{activity.title}</p>

                  <p className="text-sm text-muted-foreground">{activity.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
