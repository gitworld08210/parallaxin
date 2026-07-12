/**
 * Phase 3.2 — Executive Dashboard widgets.
 *
 * Every widget:
 *  - Reads a single summary hook.
 *  - Uses the Aurelix DS primitives.
 *  - Is a self-contained card the dashboard grid composes.
 */
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  CircuitBoard,
  Crown,
  Gauge,
  Heart,
  Inbox,
  Rocket,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { StatCard, SectionCard, EmptyState, StatusBadge } from "@/components/admin-os/ds";
import {
  useCompanyOverview,
  useCompanyHealth,
  useDepartmentOverview,
  useExecutiveApprovals,
  useCriticalAlerts,
  useExecutiveCalendar,
  useExecutiveActivity,
  useSystemStatus,
} from "@/hooks/admin-os/useExecutiveDashboard";

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 60_000;
  if (diff < 1) return "just now";
  if (diff < 60) return `${Math.round(diff)}m ago`;
  if (diff < 60 * 24) return `${Math.round(diff / 60)}h ago`;
  return d.toLocaleDateString();
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

/* -------------------------------------------------------------------------- */
export function CompanyOverviewWidget() {
  const { data, isLoading } = useCompanyOverview();
  const growth = data?.growthPct ?? 0;
  const growthTone: "up" | "down" | "flat" =
    growth > 0.5 ? "up" : growth < -0.5 ? "down" : "flat";
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={Users}
        label="Total employees"
        value={data?.totalEmployees ?? 0}
        delta={data ? `${data.activeEmployees} active` : undefined}
        loading={isLoading}
      />
      <StatCard
        icon={Building2}
        label="Departments"
        value={data?.departments ?? 0}
        loading={isLoading}
      />
      <StatCard
        icon={Rocket}
        label="Open positions"
        value={data?.openPositions ?? 0}
        delta={data ? `${data.onboarding} onboarding` : undefined}
        loading={isLoading}
      />
      <StatCard
        icon={Activity}
        label="30d growth"
        value={data ? `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%` : "—"}
        delta={data ? `${data.newLast30} joined` : undefined}
        deltaTone={growthTone}
        loading={isLoading}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function HealthBar({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 80
      ? "bg-emerald-500"
      : value >= 60
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums font-semibold">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function CompanyHealthWidget() {
  const { data, isLoading } = useCompanyHealth();
  return (
    <SectionCard
      title="Company Health"
      description="Composite score across all critical functions"
      icon={Heart}
    >
      {isLoading || !data ? (
        <div className="h-40 animate-pulse bg-muted/40 rounded-lg" />
      ) : (
        <div className="space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold tabular-nums">{data.overall}</span>
            <span className="text-xs text-muted-foreground">
              overall health index
            </span>
          </div>
          <div className="space-y-2.5">
            <HealthBar label="Operational" value={data.operational} />
            <HealthBar label="Security" value={data.security} />
            <HealthBar label="HR" value={data.hr} />
            <HealthBar label="Finance" value={data.finance} />
            <HealthBar label="System" value={data.system} />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
export function DepartmentOverviewWidget() {
  const { data, isLoading } = useDepartmentOverview();
  return (
    <SectionCard
      title="Department Overview"
      description="Capacity, risk and pending items per department"
      icon={Building2}
      actions={
        <Link
          to="/admin-os/executive/departments"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Manage <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      {isLoading ? (
        <div className="h-40 animate-pulse bg-muted/40 rounded-lg" />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No departments" description="Create a department to get started." />
      ) : (
        <div className="divide-y divide-border/40 -mx-1">
          {data.map((d) => (
            <Link
              key={d.id}
              to={`/admin-os/departments/${d.id}`}
              className="flex items-center gap-3 px-1 py-2.5 hover:bg-muted/30 rounded-md transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{d.name}</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {d.key} · {d.headcount} people
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono tabular-nums font-semibold">
                  {d.capacityPct}%
                </p>
                <p className="text-[10px] text-muted-foreground">capacity</p>
              </div>
              <div className="text-right shrink-0 w-14">
                <p className="text-xs font-mono tabular-nums font-semibold">
                  {d.pendingApprovals}
                </p>
                <p className="text-[10px] text-muted-foreground">pending</p>
              </div>
              <StatusBadge
                tone={d.risk === "high" ? "danger" : d.risk === "medium" ? "warning" : "success"}
              >
                {d.risk}
              </StatusBadge>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
export function ExecutiveApprovalsWidget() {
  const { data, isLoading } = useExecutiveApprovals();
  return (
    <SectionCard
      title="Executive Approvals"
      description="Requests awaiting Founder Office decision"
      icon={CheckCircle2}
      actions={
        <Link
          to="/admin-os/platform/approvals"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Approval Center <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      {isLoading ? (
        <div className="h-32 animate-pulse bg-muted/40 rounded-lg" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Inbox zero"
          description="No executive approvals waiting."
          icon={CheckCircle2}
        />
      ) : (
        <div className="divide-y divide-border/40 -mx-1">
          {data.slice(0, 6).map((r: any) => (
            <Link
              key={r.id}
              to="/admin-os/platform/approvals"
              className="flex items-start gap-3 px-1 py-2.5 hover:bg-muted/30 rounded-md transition-colors"
            >
              <div className="mt-0.5">
                <StatusBadge
                  tone={
                    r.priority === "critical"
                      ? "danger"
                      : r.priority === "high"
                        ? "warning"
                        : "info"
                  }
                >
                  {r.priority}
                </StatusBadge>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{r.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.module} · {r.entity_type} · {fmtWhen(r.created_at)}
                </p>
              </div>
            </Link>
          ))}
          {data.length > 6 && (
            <p className="pt-2 text-[11px] text-muted-foreground">
              +{data.length - 6} more in Approval Center
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
export function CriticalAlertsWidget() {
  const { data, isLoading } = useCriticalAlerts();
  return (
    <SectionCard
      title="Critical Alerts"
      description="Security, policy and system events (last 7 days)"
      icon={ShieldAlert}
    >
      {isLoading ? (
        <div className="h-32 animate-pulse bg-muted/40 rounded-lg" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="All clear"
          description="No critical alerts in the last week."
          icon={ShieldCheck}
        />
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {data.slice(0, 8).map((a: any) => (
            <div
              key={a.id}
              className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-2.5"
            >
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{a.action}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {a.module} · {a.target_type ?? "—"} · {fmtWhen(a.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
export function ExecutiveCalendarWidget() {
  const { data, isLoading } = useExecutiveCalendar();
  return (
    <SectionCard
      title="Executive Calendar"
      description="Upcoming reviews and company events"
      icon={Calendar}
    >
      {isLoading ? (
        <div className="h-32 animate-pulse bg-muted/40 rounded-lg" />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nothing scheduled" description="No upcoming events." />
      ) : (
        <div className="divide-y divide-border/40 -mx-1">
          {data.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-1 py-2">
              <div className="rounded-lg bg-primary/10 text-primary p-1.5">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{e.title}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {e.kind}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {fmtDate(e.date)}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
export function RecentActivityWidget() {
  const { data, isLoading } = useExecutiveActivity();
  return (
    <SectionCard
      title="Recent Executive Activity"
      description="Governance, security, HR and policy changes"
      icon={ScrollText}
      actions={
        <Link
          to="/admin-os/audit"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Audit Center <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      {isLoading ? (
        <div className="h-40 animate-pulse bg-muted/40 rounded-lg" />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No activity" description="Nothing recorded yet." />
      ) : (
        <div className="divide-y divide-border/40 -mx-1">
          {data.slice(0, 10).map((a: any) => (
            <div key={a.id} className="flex items-start gap-3 px-1 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{a.action}</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  {a.module} · {a.target_type ?? "—"}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {fmtWhen(a.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
const QUICK_ACTIONS = [
  { to: "/admin-os/platform/approvals", label: "Approval Center", icon: CheckCircle2 },
  { to: "/admin-os/executive/inbox", label: "Executive Inbox", icon: Inbox },
  { to: "/admin-os/departments", label: "Departments", icon: Building2 },
  { to: "/admin-os/executive/employees", label: "Employees", icon: Users },
  { to: "/admin-os/platform/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin-os/executive/decisions", label: "Decision Log", icon: ScrollText },
  { to: "/admin-os/executive/security", label: "Security Center", icon: ShieldCheck },
  { to: "/admin-os/executive/company", label: "Company Settings", icon: Settings },
  { to: "/admin-os/executive/notifications", label: "Notifications", icon: Bell },
  { to: "/admin-os/executive/inbox", label: "Emergency Mode", icon: Zap },
];

export function QuickActionsWidget() {
  return (
    <SectionCard
      title="Quick Actions"
      description="Jump to any executive workspace surface"
      icon={Crown}
    >
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="group flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2.5 hover:border-primary/40 hover:bg-muted/30 transition-colors"
          >
            <div className="rounded-md bg-primary/10 text-primary p-1.5">
              <a.icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium truncate flex-1">{a.label}</span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
export function SystemStatusWidget() {
  const { data, isLoading } = useSystemStatus();
  const anyFailed =
    (data?.failedWorkflows24h ?? 0) > 0 || (data?.failedNotifications24h ?? 0) > 0;
  return (
    <SectionCard
      title="System Status"
      description="Live operational signals"
      icon={CircuitBoard}
    >
      {isLoading || !data ? (
        <div className="h-20 animate-pulse bg-muted/40 rounded-lg" />
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${anyFailed ? "bg-amber-500" : "bg-emerald-500"} animate-pulse`}
            />
            <span className="text-xs font-medium">
              {anyFailed ? "Degraded background jobs" : "All systems operational"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/40">
            <div>
              <p className="text-lg font-bold tabular-nums">{data.activeSessions}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Sessions
              </p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">
                {data.failedWorkflows24h}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Wf fails 24h
              </p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">
                {data.failedNotifications24h}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Notif fails
              </p>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
export function AnnouncementsWidget() {
  return (
    <SectionCard
      title="Announcements"
      description="Company-wide broadcasts"
      icon={Gauge}
    >
      <EmptyState
        title="No announcements"
        description="Executive broadcasts you publish will appear here."
      />
    </SectionCard>
  );
}
