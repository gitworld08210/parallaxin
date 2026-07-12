import { useTickets } from "@/hooks/admin-os/useSupport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SupportAnalytics = () => {
  const { data: tickets = [] } = useTickets();
  const byCat: Record<string, number> = {};
  const byPrio: Record<string, number> = {};
  for (const t of tickets) {
    byCat[t.category] = (byCat[t.category] ?? 0) + 1;
    byPrio[t.priority] = (byPrio[t.priority] ?? 0) + 1;
  }
  const resolutionTimes = tickets
    .filter(t => t.resolved_at)
    .map(t => (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) / 3_600_000);
  const avgHrs = resolutionTimes.length
    ? (resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length).toFixed(1)
    : "—";

  const Row = ({ obj }: { obj: Record<string, number> }) => (
    <div className="space-y-1 text-sm">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex justify-between">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-medium">{v}</span>
        </div>
      ))}
      {Object.keys(obj).length === 0 && <p className="text-muted-foreground">No data.</p>}
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader><CardTitle className="text-base">By category</CardTitle></CardHeader><CardContent><Row obj={byCat} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">By priority</CardTitle></CardHeader><CardContent><Row obj={byPrio} /></CardContent></Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Avg resolution</CardTitle></CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{avgHrs}<span className="text-base font-normal text-muted-foreground"> hrs</span></div>
          <p className="text-xs text-muted-foreground">Across {resolutionTimes.length} resolved tickets</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportAnalytics;
