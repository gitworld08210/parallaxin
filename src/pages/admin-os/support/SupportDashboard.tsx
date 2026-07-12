import { useTickets } from "@/hooks/admin-os/useSupport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Inbox, TimerReset } from "lucide-react";

const Stat = ({ icon: Icon, label, value, tone = "" }: { icon: any; label: string; value: number | string; tone?: string }) => (
  <Card><CardContent className="pt-6 flex items-center gap-4">
    <div className={`rounded-lg p-3 ${tone || "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></div>
    <div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
  </CardContent></Card>
);

const SupportDashboard = () => {
  const { data: tickets = [] } = useTickets();
  const open = tickets.filter(t => !["resolved", "closed"].includes(t.status)).length;
  const critical = tickets.filter(t => t.priority === "critical" && !["resolved", "closed"].includes(t.status)).length;
  const overdue = tickets.filter(t => t.first_response_due_at && !t.first_responded_at && new Date(t.first_response_due_at) < new Date()).length;
  const resolved = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Inbox} label="Open tickets" value={open} />
        <Stat icon={AlertTriangle} label="Critical open" value={critical} tone="bg-rose-500/10 text-rose-600" />
        <Stat icon={TimerReset} label="Overdue first response" value={overdue} tone="bg-amber-500/10 text-amber-600" />
        <Stat icon={CheckCircle2} label="Resolved" value={resolved} tone="bg-emerald-500/10 text-emerald-600" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent tickets</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {tickets.slice(0, 8).map(t => (
            <div key={t.id} className="flex items-center justify-between">
              <span className="truncate">{t.ticket_number} · {t.subject}</span>
              <span className="text-xs text-muted-foreground">{t.priority} · {t.status}</span>
            </div>
          ))}
          {tickets.length === 0 && <p className="text-muted-foreground">No tickets yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportDashboard;
