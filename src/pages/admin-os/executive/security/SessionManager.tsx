import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { useExecutiveSessions, useRevokeSession, useRevokeAllSessions } from "@/hooks/admin-os/useExecutiveSecurity";
import { Monitor, LogOut } from "lucide-react";

const SessionManager = () => {
  const { employee } = useEmployee();
  const { data: sessions = [] } = useExecutiveSessions(employee?.id);
  const revoke = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

  const active = sessions.filter((s: any) => !s.revoked_at);
  const past = sessions.filter((s: any) => s.revoked_at);

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Session Manager</h2>
          <p className="text-xs text-muted-foreground mt-1">Active sessions, devices and revocation controls.</p>
        </div>
        {active.length > 1 && employee?.id && (
          <Button size="sm" variant="destructive" onClick={() => revokeAll.mutate(employee.id)}>
            <LogOut className="h-4 w-4 mr-1" /> Revoke all
          </Button>
        )}
      </div>

      <div>
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground mb-2">Active ({active.length})</p>
        <div className="space-y-2">
          {active.map((s: any) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <Monitor className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.device ?? s.user_agent ?? "Unknown device"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.browser ?? "—"} · {s.os ?? "—"} · {s.ip ?? "unknown IP"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Started {new Date(s.started_at).toLocaleString()}
                      {s.last_activity_at && ` · Last activity ${new Date(s.last_activity_at).toLocaleString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{s.risk_level ?? "low"} risk</Badge>
                  <Button size="sm" variant="outline" onClick={() => revoke.mutate(s.id)}>Revoke</Button>
                </div>
              </div>
            </Card>
          ))}
          {active.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
              No active sessions.
            </div>
          )}
        </div>
      </div>

      {past.length > 0 && (
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground mb-2">Revoked ({past.length})</p>
          <div className="space-y-1">
            {past.slice(0, 10).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between text-xs border-b border-border/40 py-2">
                <span className="truncate">{s.device ?? s.user_agent ?? "Unknown"}</span>
                <span className="text-muted-foreground">
                  Revoked {new Date(s.revoked_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default SessionManager;
