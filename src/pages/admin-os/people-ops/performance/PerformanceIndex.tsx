import { Link, Navigate } from "react-router-dom";
import { Award, LineChart, Target, ClipboardList, LifeBuoy, TrendingUp } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { usePerformanceDashboard } from "@/hooks/admin-os/usePerformance";
import {
  PageHeader,
  SectionCard,
  StatCard,
  EmptyState,
  LoadingSkeleton,
} from "@/components/admin-os/ds";

const links = [
  { to: "/admin-os/people-ops/performance/goals", label: "Goals", desc: "KPIs & goals across employees", icon: Target },
  { to: "/admin-os/people-ops/performance/reviews", label: "Reviews", desc: "Self, team-lead, dept-head, HR", icon: ClipboardList },
  { to: "/admin-os/people-ops/performance/recognition", label: "Recognition", desc: "Awards, achievements, spotlights", icon: Award },
  { to: "/admin-os/people-ops/performance/pip", label: "Improvement Plans", desc: "PIP workspace", icon: LifeBuoy },
  { to: "/admin-os/people-ops/performance/career", label: "Career Growth", desc: "Levels, skills, training", icon: TrendingUp },
  { to: "/admin-os/people-ops/performance/promotion", label: "Promotion Readiness", desc: "Advisory readiness scoring", icon: LineChart },
];

const PerformanceIndex = () => {
  const { hasPermission } = useEmployee();
  const dash = usePerformanceDashboard();

  if (
    !hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_VIEW) &&
    !hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_MANAGE) &&
    !hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_REVIEW)
  )
    return <Navigate to="/admin-os/no-access" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Performance"
        title="Performance Management"
        description={
          dash.activeCycle
            ? `Active cycle: ${dash.activeCycle.name} (${dash.activeCycle.period_type.replace("_", " ")})`
            : "No active performance cycle. Create one under Cycles."
        }
      />

      {dash.error ? (
        <EmptyState title="Could not load dashboard" description={(dash.error as Error).message} />
      ) : dash.isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Goal progress"
              value={`${dash.metrics.avgProgress}%`}
              delta={`${dash.metrics.completedGoals}/${dash.metrics.totalGoals} complete`}
              deltaTone={dash.metrics.atRiskGoals > 0 ? "down" : "up"}
            />
            <StatCard
              label="Reviews finalized"
              value={dash.metrics.reviewsFinalized}
              delta={`${dash.metrics.reviewsInFlight} in flight`}
            />
            <StatCard
              label="Avg. rating"
              value={dash.metrics.avgRating ?? "—"}
              delta={dash.metrics.avgRating != null ? "of 5.0" : "no data"}
            />
            <StatCard
              label="Recognitions"
              value={dash.metrics.recognitions}
              delta={`${dash.metrics.activePip} active PIP`}
              deltaTone={dash.metrics.activePip > 0 ? "down" : "flat"}
            />
          </div>

          {dash.recentRecognitions.length > 0 && (
            <SectionCard title="Recent recognitions" description="Latest awards & achievements">
              <div className="grid gap-3 sm:grid-cols-2">
                {dash.recentRecognitions.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3">
                    <div className="rounded-md bg-amber-500/10 text-amber-500 p-2">
                      <Award className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.employee?.full_name ?? "—"} · {r.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}

      <SectionCard title="Performance workspace">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <div className="rounded-lg bg-primary/10 text-primary p-2">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{l.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
};

export default PerformanceIndex;
