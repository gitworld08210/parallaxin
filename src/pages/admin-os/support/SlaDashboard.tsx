import { useTickets } from "@/hooks/admin-os/useSupport";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SlaDashboard = () => {
  const { data: tickets = [] } = useTickets();
  const now = Date.now();
  const rows = tickets
    .filter(t => !["resolved", "closed"].includes(t.status))
    .map(t => {
      const dueFR = t.first_response_due_at ? new Date(t.first_response_due_at).getTime() : null;
      const dueRes = t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : null;
      const frOverdue = !t.first_responded_at && dueFR && dueFR < now;
      const resOverdue = dueRes && dueRes < now;
      return { t, frOverdue: !!frOverdue, resOverdue: !!resOverdue };
    })
    .sort((a, b) => Number(b.resOverdue) - Number(a.resOverdue));

  return (
    <Card><CardContent className="p-0 divide-y">
      {rows.length === 0 && <div className="p-6 text-sm text-muted-foreground">No active tickets.</div>}
      {rows.map(({ t, frOverdue, resOverdue }) => (
        <div key={t.id} className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium truncate">{t.subject}</div>
            <div className="text-xs text-muted-foreground truncate">
              {t.ticket_number} · FR due {t.first_response_due_at ? new Date(t.first_response_due_at).toLocaleString() : "—"} · Res due {t.resolution_due_at ? new Date(t.resolution_due_at).toLocaleString() : "—"}
              {t.sla_paused ? " · paused" : ""}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {frOverdue && <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">FR overdue</Badge>}
            {resOverdue && <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30">Resolution overdue</Badge>}
            <Badge variant="outline">{t.priority}</Badge>
          </div>
        </div>
      ))}
    </CardContent></Card>
  );
};

export default SlaDashboard;
