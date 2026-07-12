import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Radar, Search, FileSearch, ShieldCheck, Activity } from "lucide-react";
import { useSecurityDashboardStats, useSecurityIncidents, useThreatEvents } from "@/hooks/admin-os/useSecurity";

const Stat = ({ icon: Icon, label, value, tone = "default" }: { icon: React.ElementType; label: string; value: number | string; tone?: "default" | "danger" | "warn" | "ok" }) => {
  const toneClass = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-amber-500" : tone === "ok" ? "text-emerald-500" : "text-primary";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={`mt-1 text-3xl font-bold ${toneClass}`}>{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${toneClass} opacity-70`} />
        </div>
      </CardContent>
    </Card>
  );
};

const SecurityDashboard = () => {
  const { data: stats } = useSecurityDashboardStats();
  const { data: incidents = [] } = useSecurityIncidents();
  const { data: threats = [] } = useThreatEvents();

  const score = Math.max(0, 100 - (stats?.criticalIncidents ?? 0) * 15 - (stats?.activeThreats ?? 0) * 3 - (stats?.openIncidents ?? 0) * 2);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat icon={Activity} label="Security Score" value={score} tone={score > 80 ? "ok" : score > 60 ? "warn" : "danger"} />
        <Stat icon={AlertTriangle} label="Critical Incidents" value={stats?.criticalIncidents ?? 0} tone="danger" />
        <Stat icon={AlertTriangle} label="Open Incidents" value={stats?.openIncidents ?? 0} tone="warn" />
        <Stat icon={Radar} label="Active Threats" value={stats?.activeThreats ?? 0} tone="warn" />
        <Stat icon={Search} label="Investigations" value={stats?.openInvestigations ?? 0} />
        <Stat icon={FileSearch} label="Pending Reviews" value={stats?.pendingReviews ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Incidents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {incidents.slice(0, 6).map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-md border border-border/60 p-3 text-sm">
                <div>
                  <p className="font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">{i.incident_code} · {i.severity}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{i.status}</span>
              </div>
            ))}
            {incidents.length === 0 && <p className="text-sm text-muted-foreground">No incidents recorded.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Latest Threat Events</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {threats.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-border/60 p-3 text-sm">
                <div>
                  <p className="font-medium capitalize">{t.threat_type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{t.threat_code} · {t.severity}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{t.status}</span>
              </div>
            ))}
            {threats.length === 0 && <p className="text-sm text-muted-foreground">No threats detected.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Platform Health</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Overall posture: <span className="font-semibold text-foreground">{score > 80 ? "Healthy" : score > 60 ? "Elevated risk" : "Critical"}</span>.
            Prevention, detection, investigation and response modules are active.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;
