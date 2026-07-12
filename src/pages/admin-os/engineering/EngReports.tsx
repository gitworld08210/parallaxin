import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEngDashboardKpis, useEngReleases, useEngDeployments } from "@/hooks/admin-os/useEngineering";
import { Loader2, BarChart3 } from "lucide-react";

const EngReports = () => {
  const { data: kpis, isLoading } = useEngDashboardKpis();
  const { data: releases } = useEngReleases();
  const { data: deployments } = useEngDeployments();

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const released = (releases ?? []).filter((r: any) => r.status === "released").length;
  const totalDeploys = (deployments ?? []).length;
  const rollbacks = (deployments ?? []).filter((d: any) => d.rolled_back).length;

  const rows = [
    { label: "Active Projects", value: kpis?.activeProjects ?? 0 },
    { label: "Open Tasks", value: kpis?.openTasks ?? 0 },
    { label: "In Progress Tasks", value: kpis?.inProgressTasks ?? 0 },
    { label: "Open Bugs", value: kpis?.openBugs ?? 0 },
    { label: "Critical Bugs", value: kpis?.criticalBugs ?? 0 },
    { label: "Pending Releases", value: kpis?.pendingReleases ?? 0 },
    { label: "Shipped Releases", value: released },
    { label: "Deployments", value: totalDeploys },
    { label: "Rollbacks", value: rollbacks },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Engineering Reports</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Delivery snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {rows.map((r) => (
              <div key={r.label} className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className="mt-1 text-2xl font-bold">{r.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EngReports;
