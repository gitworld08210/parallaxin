import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useActiveEmergency,
  useSystemStatus,
  useIncidents,
  useMaintenanceWindows,
  useAnnouncements,
  useLockdowns,
  useBroadcasts,
} from "@/hooks/admin-os/useCommandCenter";
import { ShieldAlert, Activity, AlertOctagon, Wrench, Megaphone, Lock, Send } from "lucide-react";

const StatusPill = ({ status }: { status: string }) => {
  const color =
    status === "operational" ? "text-emerald-600 bg-emerald-500/10"
    : status === "degraded" ? "text-amber-600 bg-amber-500/10"
    : status === "maintenance" ? "text-blue-600 bg-blue-500/10"
    : "text-red-600 bg-red-500/10";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
};

const CommandOverview = () => {
  const { data: emergency } = useActiveEmergency();
  const { data: status } = useSystemStatus();
  const { data: openIncidents } = useIncidents("open");
  const { data: maint } = useMaintenanceWindows();
  const { data: ann } = useAnnouncements();
  const { data: locks } = useLockdowns();
  const { data: bcasts } = useBroadcasts();

  const activeMaint = (maint ?? []).filter((m: any) => ["scheduled", "active"].includes(m.status));
  const publishedAnn = (ann ?? []).filter((a: any) => a.status === "published").slice(0, 5);
  const activeLocks = (locks ?? []).filter((l: any) => l.status === "active");
  const recentBcasts = (bcasts ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      {emergency && (
        <Card className="border-red-500/40 bg-red-500/5 p-5">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-xs font-bold uppercase text-red-600">Emergency Mode Active</p>
              <p className="text-sm">
                {emergency.reason} · activated {new Date(emergency.activated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertOctagon className="h-4 w-4" /> Open Incidents
          </div>
          <p className="text-2xl font-bold mt-1">{openIncidents?.length ?? 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wrench className="h-4 w-4" /> Maintenance
          </div>
          <p className="text-2xl font-bold mt-1">{activeMaint.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-4 w-4" /> Active Lockdowns
          </div>
          <p className="text-2xl font-bold mt-1">{activeLocks.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Send className="h-4 w-4" /> Recent Broadcasts
          </div>
          <p className="text-2xl font-bold mt-1">{bcasts?.length ?? 0}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">System Status</h2>
          </div>
          <div className="space-y-2">
            {(status ?? []).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="capitalize">{s.service.replace(/_/g, " ")}</span>
                <StatusPill status={s.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Latest Announcements</h2>
          </div>
          <div className="space-y-3">
            {publishedAnn.map((a: any) => (
              <div key={a.id} className="border-b border-border/40 pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{a.type}</Badge>
                  <p className="text-sm font-medium">{a.title}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
              </div>
            ))}
            {!publishedAnn.length && (
              <p className="text-sm text-muted-foreground">No published announcements.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Send className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Recent Broadcasts</h2>
          </div>
          <div className="space-y-2">
            {recentBcasts.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between text-sm border-b border-border/40 pb-2 last:border-0">
                <div>
                  <p className="font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</p>
                </div>
                <Badge variant={b.status === "sent" ? "default" : "outline"}>{b.status}</Badge>
              </div>
            ))}
            {!recentBcasts.length && (
              <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Active Lockdowns</h2>
          </div>
          <div className="space-y-2">
            {activeLocks.map((l: any) => (
              <div key={l.id} className="text-sm border-b border-border/40 pb-2 last:border-0">
                <p className="font-medium">{l.department?.name ?? "Department"}</p>
                <p className="text-xs text-muted-foreground">{l.reason}</p>
              </div>
            ))}
            {!activeLocks.length && (
              <p className="text-sm text-muted-foreground">No active lockdowns.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CommandOverview;
