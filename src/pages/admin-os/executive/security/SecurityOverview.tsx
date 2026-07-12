import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useSecurityScore, useTrustedDevices, useSecurityAlerts, useLoginEvents, useRecoveryCodes,
} from "@/hooks/admin-os/useExecutiveSecurity";
import { CheckCircle2, XCircle, ShieldAlert, Monitor, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";

const SecurityOverview = () => {
  const { score, checks } = useSecurityScore();
  const { data: devices = [] } = useTrustedDevices();
  const { data: alerts = [] } = useSecurityAlerts();
  const { data: events = [] } = useLoginEvents();
  const { data: codes = [] } = useRecoveryCodes();

  const unackAlerts = alerts.filter((a: any) => !a.is_acknowledged);
  const failedLogins = events.filter((e: any) => e.outcome === "fail").length;

  const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-1">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground">Security Score</p>
          <p className={`text-5xl font-bold mt-2 ${scoreColor}`}>{score}</p>
          <Progress value={score} className="mt-3" />
          <div className="mt-4 space-y-2">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-sm">
                {c.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={c.passed ? "" : "text-muted-foreground"}>{c.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-3">
          {[
            { label: "Unack. Alerts", value: unackAlerts.length, icon: ShieldAlert, to: "alerts", color: unackAlerts.length ? "text-red-600" : "" },
            { label: "Trusted Devices", value: devices.length, icon: Monitor, to: "devices" },
            { label: "Recovery Codes Left", value: codes.filter((c: any) => !c.is_used).length, icon: KeyRound, to: "recovery" },
            { label: "Failed Logins (recent)", value: failedLogins, icon: ShieldAlert, to: "history", color: failedLogins > 0 ? "text-amber-600" : "" },
          ].map((s) => (
            <Link key={s.label} to={s.to}>
              <Card className="p-4 h-full hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className={`text-3xl font-bold mt-2 ${s.color ?? ""}`}>{s.value}</p>
                <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-muted-foreground mt-1">{s.label}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Recent Login Activity</h3>
          <Link to="history" className="text-xs text-primary">View all</Link>
        </div>
        <div className="mt-4 space-y-2">
          {events.slice(0, 6).map((e: any) => (
            <div key={e.id} className="flex items-center justify-between border-b border-border/40 pb-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{e.event_type}</p>
                <p className="text-[11px] text-muted-foreground truncate">{e.ip ?? "unknown"} · {new Date(e.created_at).toLocaleString()}</p>
              </div>
              <Badge variant={e.outcome === "success" ? "secondary" : "destructive"} className="text-[10px]">
                {e.outcome}
              </Badge>
            </div>
          ))}
          {events.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No login events yet.</p>}
        </div>
      </Card>
    </div>
  );
};

export default SecurityOverview;
