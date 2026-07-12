import { Navigate, Link } from "react-router-dom";
import {
  Crown,
  Users,
  Building2,
  Activity,
  ShieldAlert,
  ScrollText,
  ArrowRight,
} from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { useFounderStats } from "@/hooks/admin-os/useFounderOffice";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: any;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "good";
}) => {
  const toneMap = {
    default: "text-primary bg-primary/10",
    warn: "text-amber-500 bg-amber-500/10",
    danger: "text-red-500 bg-red-500/10",
    good: "text-emerald-500 bg-emerald-500/10",
  };
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">
            {label.toUpperCase()}
          </p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        <div className={`rounded-lg p-2 ${toneMap[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

const FounderOfficeDashboard = () => {
  const { hasPermission, employee } = useEmployee();
  const { data: stats, isLoading } = useFounderStats();

  if (!hasPermission(ADMIN_PERMISSIONS.FOUNDER_OFFICE_ACCESS))
    return <Navigate to="/admin-os/no-access" replace />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            FOUNDER OFFICE · EXECUTIVE GOVERNANCE
          </p>
          <h1 className="text-2xl font-bold">
            Good to see you, {employee?.full_name.split(" ")[0] ?? "Founder"}
          </h1>
        </div>
      </div>

      {/* Health strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total employees"
          value={isLoading ? "…" : stats?.totalEmployees ?? 0}
        />
        <StatCard
          icon={Activity}
          label="Active"
          value={isLoading ? "…" : stats?.activeEmployees ?? 0}
          tone="good"
        />
        <StatCard
          icon={Users}
          label="In onboarding"
          value={isLoading ? "…" : stats?.inOnboarding ?? 0}
          tone="warn"
        />
        <StatCard
          icon={ShieldAlert}
          label="Suspended"
          value={isLoading ? "…" : stats?.suspended ?? 0}
          tone={stats && stats.suspended > 0 ? "danger" : "default"}
        />
        <StatCard
          icon={Building2}
          label="Departments"
          value={isLoading ? "…" : stats?.departments.length ?? 0}
        />
        <StatCard
          icon={Users}
          label="On leave"
          value={isLoading ? "…" : stats?.onLeave ?? 0}
        />
        <StatCard
          icon={Activity}
          label="Active sessions"
          value={isLoading ? "…" : stats?.activeSessions ?? 0}
        />
      </div>

      {/* Two-column */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Departments */}
        <div className="md:col-span-1 rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Departments</h2>
            <Link
              to="/admin-os"
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              All
            </Link>
          </div>
          <div className="mt-3 space-y-1">
            {stats?.departments.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between py-1.5 text-xs"
              >
                <span className="font-medium truncate">{d.name}</span>
                <span className="text-muted-foreground font-mono text-[10px]">
                  {d.key}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent audit */}
        <div className="md:col-span-2 rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Recent Governance Activity</h2>
            <Link
              to="/admin-os/audit"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Open Audit Center <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-3 divide-y divide-border/40">
            {(!stats?.recentAudit || stats.recentAudit.length === 0) && (
              <p className="text-xs text-muted-foreground py-4">No activity yet.</p>
            )}
            {stats?.recentAudit.map((a) => (
              <div
                key={a.id}
                className="py-2.5 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{a.action}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {a.module}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Executive Appointments CTA */}
      <Link
        to="/admin-os/founder-office/appointments"
        className="block rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-5 hover:border-primary transition group"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/20 p-2.5 text-primary">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-primary">
                EXECUTIVE APPOINTMENTS
              </p>
              <h2 className="text-base font-bold mt-0.5">Appoint your C-Suite</h2>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-md">
                One-click appointment for Co-Founder, Head of People Operations, CTO, CFO, and all C-level heads.
                Auto-generated employee ID + branded PDF joining letter emailed via Gmail.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition" />
        </div>
      </Link>

      {/* Executive nav */}
      <div className="rounded-2xl border border-dashed border-border p-5 bg-muted/20">
        <div className="flex items-start gap-3">
          <ScrollText className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-xs font-semibold">Executive integrity</p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-xl">
              Every Founder Office action — approvals, department changes, emergency
              overrides — is written to an immutable audit log. History cannot be
              deleted, only appended.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FounderOfficeDashboard;
