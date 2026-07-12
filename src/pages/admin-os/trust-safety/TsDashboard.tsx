import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTsCases, useTsStats } from "@/hooks/admin-os/useTrustSafety";
import { AlertTriangle, Inbox, ShieldAlert, Users } from "lucide-react";
import { Link } from "react-router-dom";

const TsDashboard = () => {
  const { data: stats } = useTsStats();
  const { data: cases = [] } = useTsCases();
  const criticalOpen = cases.filter((c: any) => c.severity === "critical" && c.status !== "resolved" && c.status !== "closed");
  const founderReview = cases.filter((c: any) => c.requires_founder_review && c.status !== "closed");

  const Kpi = ({ label, value, icon: Icon }: any) => (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent><p className="text-3xl font-bold">{value}</p></CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Total Cases" value={stats?.total ?? 0} icon={Inbox} />
        <Kpi label="Critical Open" value={criticalOpen.length} icon={ShieldAlert} />
        <Kpi label="New / Triage" value={(stats?.byStatus?.new ?? 0) + (stats?.byStatus?.triage ?? 0)} icon={AlertTriangle} />
        <Kpi label="Founder Review" value={founderReview.length} icon={Users} />
      </div>

      <Card>
        <CardHeader><CardTitle>Latest Cases</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {cases.length === 0 && <p className="text-sm text-muted-foreground">No cases yet.</p>}
          {cases.slice(0, 10).map((c: any) => (
            <Link key={c.id} to={`/admin-os/trust-safety/cases/${c.id}`}
              className="flex items-center justify-between border rounded p-3 hover:bg-muted/40 transition">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{c.case_number}</span>
                  <Badge variant="outline">{c.category}</Badge>
                  <Badge variant={c.severity === "critical" ? "destructive" : "secondary"}>{c.severity}</Badge>
                  <Badge>{c.status}</Badge>
                  {c.requires_founder_review && <Badge variant="destructive">Founder review</Badge>}
                </div>
                <p className="text-sm font-medium mt-1 truncate">{c.title}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default TsDashboard;
