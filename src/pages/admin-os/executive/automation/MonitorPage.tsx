import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAutomations, useAutomationRuns } from "@/hooks/admin-os/useAutomation";

const MonitorPage = () => {
  const { data: autos = [] } = useAutomations();
  const { data: runs = [] } = useAutomationRuns(undefined, 100);

  const byAuto = autos.map((a: any) => {
    const rs = runs.filter((r: any) => r.automation_id === a.id);
    const success = rs.filter((r: any) => r.status === "success").length;
    const failed = rs.filter((r: any) => r.status === "failed").length;
    return { ...a, recent: rs.slice(0, 10), success, failed, total: rs.length };
  });

  return (
    <div className="space-y-3">
      {byAuto.map((a: any) => (
        <Card key={a.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {a.name}
              <Badge variant={a.is_enabled ? "default" : "secondary"}>{a.is_enabled ? "active" : "paused"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-6 gap-2">
            <div>Runs: <span className="font-medium text-foreground">{a.total}</span></div>
            <div>Success: <span className="font-medium text-foreground">{a.success}</span></div>
            <div>Failed: <span className="font-medium text-destructive">{a.failed}</span></div>
            <div>Last: {a.last_run_at ? new Date(a.last_run_at).toLocaleString() : "—"}</div>
            <div>Next: {a.next_run_at ? new Date(a.next_run_at).toLocaleString() : "—"}</div>
            <div>Priority: {a.priority}</div>
          </CardContent>
        </Card>
      ))}
      {byAuto.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No automations to monitor.</CardContent></Card>}
    </div>
  );
};

export default MonitorPage;
