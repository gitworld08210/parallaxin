// DashboardStats — real data from useOrganizationDashboard.
import { Users, UserCheck, UserPlus, Building2, Shield, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationDashboard } from "@/hooks/organization/useOrganizationDashboard";

export const DashboardStats = () => {
  const { stats, loading } = useOrganizationDashboard();

  const items = [
    { title: "Members", value: stats?.memberCount ?? 0, meta: `${stats?.activeMemberCount ?? 0} active`, icon: Users },
    { title: "Pending", value: stats?.pendingMemberCount ?? 0, meta: "invitations", icon: UserPlus },
    { title: "Departments", value: stats?.departmentCount ?? 0, meta: "teams", icon: Building2 },
    { title: "Roles", value: stats?.roleCount ?? 0, meta: "defined", icon: Shield },
    { title: "Followers", value: stats?.followerCount ?? 0, meta: "reach", icon: UserCheck },
    { title: "Posts", value: stats?.postCount ?? 0, meta: "published", icon: TrendingUp },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.title} className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">{item.title}</p>
                {loading ? (
                  <Skeleton className="mt-2 h-8 w-16" />
                ) : (
                  <h2 className="mt-2 text-3xl font-bold">{item.value.toLocaleString()}</h2>
                )}
                <p className="mt-2 text-sm font-medium text-muted-foreground">{item.meta}</p>
              </div>
              <div className="rounded-2xl bg-primary/10 p-4">
                <Icon className="h-7 w-7 text-primary" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardStats;
