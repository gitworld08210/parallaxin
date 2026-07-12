import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ShieldAlert } from "lucide-react";
import { useSecurityAlerts, useAcknowledgeAlert } from "@/hooks/admin-os/useExecutiveSecurity";

const SEV_COLORS: Record<string, string> = {
  info: "bg-blue-500/15 text-blue-600",
  warning: "bg-amber-500/15 text-amber-600",
  critical: "bg-red-500/15 text-red-600",
};

const SecurityAlerts = () => {
  const { data: alerts = [] } = useSecurityAlerts();
  const ack = useAcknowledgeAlert();

  const unack = alerts.filter((a: any) => !a.is_acknowledged);
  const acked = alerts.filter((a: any) => a.is_acknowledged);

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Security Alerts</h2>
          <p className="text-xs text-muted-foreground">Real-time alerts for suspicious executive activity.</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground mb-2">Unacknowledged ({unack.length})</p>
        <div className="space-y-2">
          {unack.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
              No active alerts.
            </div>
          )}
          {unack.map((a: any) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{a.title}</p>
                      <Badge className={`text-[10px] ${SEV_COLORS[a.severity] ?? ""}`}>{a.severity}</Badge>
                      <Badge variant="outline" className="text-[10px]">{a.alert_type}</Badge>
                    </div>
                    {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => ack.mutate(a.id)}>Acknowledge</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {acked.length > 0 && (
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground mb-2">Acknowledged ({acked.length})</p>
          <div className="space-y-1">
            {acked.slice(0, 15).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-xs border-b border-border/40 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className={`text-[10px] ${SEV_COLORS[a.severity] ?? ""}`}>{a.severity}</Badge>
                  <span className="truncate">{a.title}</span>
                </div>
                <span className="text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default SecurityAlerts;
