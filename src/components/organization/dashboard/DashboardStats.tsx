// DashboardStats — UI scaffold. Compose real markup as the feature ships.
import { Users, FolderKanban, CheckSquare, TrendingUp, Activity, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const stats = [
  {
    title: "Members",
    value: "124",
    change: "+12%",
    icon: Users,
  },
  {
    title: "Projects",
    value: "18",
    change: "+4",
    icon: FolderKanban,
  },
  {
    title: "Tasks",
    value: "342",
    change: "+26",
    icon: CheckSquare,
  },
  {
    title: "Growth",
    value: "86%",
    change: "+8%",
    icon: TrendingUp,
  },
  {
    title: "Activity",
    value: "1.4K",
    change: "Today",
    icon: Activity,
  },
  {
    title: "AI Usage",
    value: "94%",
    change: "Healthy",
    icon: Sparkles,
  },
];

export const DashboardStats = () => {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <Card key={item.title} className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">{item.title}</p>

                <h2 className="mt-2 text-3xl font-bold">{item.value}</h2>

                <p className="mt-2 text-sm font-medium text-emerald-500">{item.change}</p>
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
