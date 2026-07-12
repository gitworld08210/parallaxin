import { Link, Navigate } from "react-router-dom";
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useOrganizationalHealth } from "@/hooks/admin-os/useOrganization";
import {
  PageHeader,
  SectionCard,
  StatCard,
  EmptyState,
  LoadingSkeleton,
} from "@/components/admin-os/ds";

const links = [
  {
    to: "/admin-os/people-ops/org/chart",
    label: "Organization Chart",
    desc: "Reporting hierarchy across the whole company",
    icon: Building2,
  },
  {
    to: "/admin-os/people-ops/org/capacity",
    label: "Department Capacity",
    desc: "Live headcount vs capacity + health scoring",
    icon: Users,
  },
  {
    to: "/admin-os/people-ops/org/positions",
    label: "Open Positions",
    desc: "Hiring requests, approvals, and fills",
    icon: Briefcase,
  },
  {
    to: "/admin-os/people-ops/org/succession",
    label: "Succession Planning",
    desc: "Backups for every critical role",
    icon: ShieldCheck,
  },
  {
    to: "/admin-os/people-ops/org/planning",
    label: "Workforce Planning",
    desc: "Forecasts and future headcount",
    icon: TrendingUp,
  },
];

const OrganizationIndex = () => {
  const { hasPermission } = useEmployee();
  const health = useOrganizationalHealth();

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ORG_VIEW))
    return <Navigate to="/admin-os/no-access" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Organization"
        title="Organizational Health"
        description="Live signal across capacity, hiring, and leadership continuity."
      />

      {health.error ? (
        <EmptyState
          title="Could not load organizational health"
          description={(health.error as Error).message}
        />
      ) : health.isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Active headcount"
              value={health.metrics.totalHeadcount}
              hint={`${health.metrics.departmentsTracked} departments`}
            />
            <StatCard
              label="Capacity utilisation"
              value={`${health.metrics.capacityUtilisation}%`}
              hint={`Target ${health.metrics.totalTarget}`}
              tone={
                health.metrics.capacityUtilisation > 100
                  ? "danger"
                  : health.metrics.capacityUtilisation < 60
                    ? "warning"
                    : "positive"
              }
            />
            <StatCard
              label="Open hiring requests"
              value={health.metrics.openHiring}
              hint={`${health.metrics.criticalOpen} critical`}
              tone={health.metrics.criticalOpen > 0 ? "danger" : "neutral"}
            />
            <StatCard
              label="Leadership coverage"
              value={`${health.metrics.successionCoverage}%`}
              hint={`${health.metrics.readyLeaders} ready now`}
              tone={
                health.metrics.successionCoverage < 50
                  ? "warning"
                  : "positive"
              }
            />
          </div>

          {(health.metrics.overloaded > 0 || health.metrics.under > 0) && (
            <SectionCard
              title="Capacity alerts"
              description="Departments outside their healthy operating band"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {health.capacity
                  .filter((c) => c.health === "overloaded" || c.health === "under")
                  .map((c) => (
                    <div
                      key={c.department_id}
                      className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3"
                    >
                      <div className="rounded-md bg-amber-500/10 text-amber-500 p-2">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{c.department_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.health === "overloaded"
                            ? `Over max: ${c.current_headcount}/${c.max_capacity}`
                            : `Below target: ${c.current_headcount}/${c.target_capacity}`}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </SectionCard>
          )}
        </>
      )}

      <SectionCard title="Organization workspace" description="Every planning surface in one place">
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

export default OrganizationIndex;
