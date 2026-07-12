import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAutomationRuns } from "@/hooks/admin-os/useAutomation";

const HistoryPage = () => {
  const { data = [], isLoading } = useAutomationRuns(undefined, 200);

  return (
    <Card>
      <CardHeader><CardTitle>Execution History</CardTitle></CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        <div className="divide-y">
          {data.map((r: any) => (
            <div key={r.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={
                    r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "secondary"
                  }>{r.status}</Badge>
                  <span className="font-mono text-xs">{r.automation_id.slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground">{r.trigger_source ?? "system"}</span>
                </div>
                {r.error && <p className="text-xs text-destructive mt-1">{r.error}</p>}
              </div>
              <div className="text-xs text-muted-foreground text-right">
                <p>{new Date(r.started_at).toLocaleString()}</p>
                {r.duration_ms != null && <p>{r.duration_ms}ms</p>}
              </div>
            </div>
          ))}
          {!isLoading && data.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No runs yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default HistoryPage;
