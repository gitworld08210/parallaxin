import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Rule = {
  id: string;
  source_table: string;
  target_table: string;
  department: string;
  sla_hours: number;
  active: boolean;
  notes: string | null;
};

type Event = {
  id: string;
  source_table: string;
  source_id: string;
  target_table: string;
  target_id: string | null;
  department: string;
  status: string;
  sla_due_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

const deptColor: Record<string, string> = {
  verification: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  trust_safety: "bg-red-500/15 text-red-300 border-red-500/30",
  finance: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  support: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  unassigned: "bg-muted text-muted-foreground border-border",
};

export default function RoutingOverview() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: r }, { data: e }] = await Promise.all([
        supabase.from("routing_rules" as never).select("*").order("department"),
        supabase
          .from("routing_events" as never)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setRules((r as Rule[]) ?? []);
      setEvents((e as Event[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading routing engine…
      </div>
    );
  }

  const now = Date.now();
  const breached = events.filter(
    (e) => e.sla_due_at && new Date(e.sla_due_at).getTime() < now && e.status === "routed"
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Intake Routing</h1>
        <p className="text-sm text-muted-foreground">
          Config-driven pipeline that routes user submissions into the correct Admin OS department queue.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Active rules</div>
          <div className="text-2xl font-semibold mt-1">{rules.filter((r) => r.active).length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Dispatched (recent 50)</div>
          <div className="text-2xl font-semibold mt-1">{events.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> SLA breached
          </div>
          <div className="text-2xl font-semibold mt-1 text-red-400">{breached.length}</div>
        </Card>
      </div>

      <section>
        <h2 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wide">
          Rules
        </h2>
        <Card className="divide-y divide-border">
          {rules.map((r) => (
            <div key={r.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.source_table}</code>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.target_table}</code>
              <Badge className={`border ${deptColor[r.department] ?? deptColor.unassigned}`}>
                {r.department}
              </Badge>
              <span className="text-xs text-muted-foreground">SLA {r.sla_hours}h</span>
              {!r.active && <Badge variant="outline">inactive</Badge>}
              {r.notes && (
                <span className="text-xs text-muted-foreground ml-auto">{r.notes}</span>
              )}
            </div>
          ))}
          {rules.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No routing rules yet.
            </div>
          )}
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wide">
          Recent dispatches
        </h2>
        <Card className="divide-y divide-border">
          {events.map((e) => {
            const overdue =
              e.sla_due_at && new Date(e.sla_due_at).getTime() < now && e.status === "routed";
            return (
              <div key={e.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
                <Badge className={`border ${deptColor[e.department] ?? deptColor.unassigned}`}>
                  {e.department}
                </Badge>
                <code className="text-xs">{e.source_table}</code>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <code className="text-xs">{e.target_table}</code>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                </span>
                {e.status !== "routed" && <Badge variant="destructive">{e.status}</Badge>}
                {overdue && (
                  <Badge className="bg-red-500/15 text-red-300 border border-red-500/30">
                    SLA breached
                  </Badge>
                )}
              </div>
            );
          })}
          {events.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No dispatches yet. Once users submit verification, KYC, reports or support tickets,
              they'll appear here.
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
