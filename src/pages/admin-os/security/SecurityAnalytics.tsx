import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSecurityDashboardStats, useSecurityIncidents, useThreatEvents } from "@/hooks/admin-os/useSecurity";

const SecurityAnalytics = () => {
  const { data: stats } = useSecurityDashboardStats();
  const { data: incidents = [] } = useSecurityIncidents();
  const { data: threats = [] } = useThreatEvents();

  const byType = threats.reduce<Record<string, number>>((acc, t) => {
    acc[t.threat_type] = (acc[t.threat_type] ?? 0) + 1;
    return acc;
  }, {});

  const bySeverity = incidents.reduce<Record<string, number>>((acc, i) => {
    acc[i.severity] = (acc[i.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Total incidents: <span className="font-semibold">{stats?.totalIncidents ?? 0}</span></p>
          <p>Open incidents: <span className="font-semibold">{stats?.openIncidents ?? 0}</span></p>
          <p>Active threats: <span className="font-semibold">{stats?.activeThreats ?? 0}</span></p>
          <p>Investigations: <span className="font-semibold">{stats?.openInvestigations ?? 0}</span></p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Threats by Type</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {Object.entries(byType).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="capitalize">{k.replace(/_/g, " ")}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
          {Object.keys(byType).length === 0 && <p className="text-muted-foreground">No data.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Incidents by Severity</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {Object.entries(bySeverity).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="capitalize">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
          {Object.keys(bySeverity).length === 0 && <p className="text-muted-foreground">No data.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityAnalytics;
