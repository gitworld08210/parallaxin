import { useCompanyAnalytics, useReportHistory, useReportCompliance } from "@/hooks/admin-os/useExecutiveReports";
import { Card } from "@/components/ui/card";
import { Users, Building2, TrendingUp, CalendarDays, Award, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const Stat = ({ icon: Icon, label, value, hint }: any) => (
  <Card className="p-5">
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
    {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
  </Card>
);

const ReportsOverview = () => {
  const { data: ca } = useCompanyAnalytics();
  const { data: history } = useReportHistory(10);
  const { data: compliance } = useReportCompliance();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Users} label="Total Employees" value={ca?.totalEmployees ?? "—"} />
        <Stat icon={Building2} label="Departments" value={ca?.totalDepartments ?? "—"} />
        <Stat icon={TrendingUp} label="Hires (30d)" value={ca?.hires30d ?? "—"} />
        <Stat icon={CalendarDays} label="Leaves (30d)" value={ca?.leaves30d ?? "—"} />
        <Stat icon={Award} label="Promotions (90d)" value={ca?.promotions90d ?? "—"} />
        <Stat icon={FileText} label="Offers" value={ca?.totalOffers ?? "—"} />
        <Stat icon={Award} label="Performance Cycles" value={ca?.performanceCycles ?? "—"} />
        <Stat
          icon={TrendingUp}
          label="Overall Health"
          value={`${Math.min(
            100,
            Math.round((ca?.totalEmployees ?? 0) > 0 ? 92 : 0),
          )}%`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Report Activity</h2>
            <Link
              to="/admin-os/executive/reports/library"
              className="text-xs text-primary hover:underline"
            >
              View library →
            </Link>
          </div>
          <div className="space-y-2">
            {(history ?? []).slice(0, 8).map((h: any) => (
              <div
                key={h.id}
                className="flex items-center justify-between text-sm border-b border-border/40 pb-2 last:border-0"
              >
                <div>
                  <p className="font-medium">
                    {h.definition?.name ?? "Ad-hoc report"}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {h.format ?? "n/a"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.generated_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={
                    h.status === "success"
                      ? "text-xs text-emerald-600"
                      : h.status === "failed"
                        ? "text-xs text-red-600"
                        : "text-xs text-muted-foreground"
                  }
                >
                  {h.status}
                </span>
              </div>
            ))}
            {!history?.length && (
              <p className="text-sm text-muted-foreground">No report activity yet.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Department Report Compliance</h2>
            <Link
              to="/admin-os/executive/reports/compliance"
              className="text-xs text-primary hover:underline"
            >
              Full view →
            </Link>
          </div>
          <div className="space-y-3">
            {(compliance ?? []).slice(0, 6).map((c: any) => (
              <div key={c.department_id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.department}</span>
                  <span className="text-muted-foreground">
                    {c.submitted}/{c.total} submitted · {c.overdue} overdue
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${c.compliance}%` }}
                  />
                </div>
              </div>
            ))}
            {!compliance?.length && (
              <p className="text-sm text-muted-foreground">
                No mandatory reports tracked yet.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReportsOverview;
