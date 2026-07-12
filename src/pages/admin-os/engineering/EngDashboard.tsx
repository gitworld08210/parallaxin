import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEngDashboardKpis, useEngReleases } from "@/hooks/admin-os/useEngineering";
import {
  FolderKanban,
  ListTodo,
  Bug,
  PackageCheck,
  AlertTriangle,
  Rocket,
  Loader2,
} from "lucide-react";

const Kpi = ({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: any;
  tone?: string;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${tone ?? "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const EngDashboard = () => {
  const { data, isLoading } = useEngDashboardKpis();
  const { data: releases } = useEngReleases();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const upcoming = (releases ?? []).filter((r: any) => r.status !== "released").slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Active Projects" value={data?.activeProjects ?? 0} icon={FolderKanban} />
        <Kpi label="Open Tasks" value={data?.openTasks ?? 0} icon={ListTodo} />
        <Kpi
          label="Critical Bugs"
          value={data?.criticalBugs ?? 0}
          icon={AlertTriangle}
          tone="bg-destructive/10 text-destructive"
        />
        <Kpi label="Pending Releases" value={data?.pendingReleases ?? 0} icon={PackageCheck} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="h-4 w-4 text-primary" />
              Upcoming Releases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending releases.</p>
            )}
            {upcoming.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <p className="text-sm font-medium">
                    {r.version} — {r.title}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">{r.release_id}</p>
                </div>
                <Badge variant={r.is_production ? "destructive" : "secondary"}>{r.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bug className="h-4 w-4 text-primary" />
              Recent Deployments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.recentDeployments ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No deployments logged.</p>
            )}
            {(data?.recentDeployments ?? []).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between rounded-md border p-2">
                <p className="text-sm">
                  <span className="font-medium">{d.environment}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {d.deployed_at ? new Date(d.deployed_at).toLocaleString() : "pending"}
                  </span>
                </p>
                <Badge variant="secondary">{d.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EngDashboard;
