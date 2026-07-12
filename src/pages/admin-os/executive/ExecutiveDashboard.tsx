/**
 * Phase 3.2 — Executive Dashboard & Company Command Center.
 *
 * The primary Founder Office workspace. Read-first: every widget links
 * out to a dedicated module for operational changes. Dashboard access
 * is written to the immutable audit log.
 */
import { Crown } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { useAuditDashboardAccess } from "@/hooks/admin-os/useExecutiveDashboard";
import {
  CompanyOverviewWidget,
  CompanyHealthWidget,
  DepartmentOverviewWidget,
  ExecutiveApprovalsWidget,
  CriticalAlertsWidget,
  ExecutiveCalendarWidget,
  RecentActivityWidget,
  QuickActionsWidget,
  SystemStatusWidget,
  AnnouncementsWidget,
} from "@/components/admin-os/executive/widgets";

const ExecutiveDashboard = () => {
  const { employee } = useEmployee();
  useAuditDashboardAccess();

  const first = employee?.full_name?.split(" ")[0] ?? "Founder";
  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-amber-500/5 via-transparent to-primary/5 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-500">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              FOUNDER OFFICE · COMMAND CENTER
            </p>
            <h1 className="text-2xl font-bold">
              {greeting}, {first}.
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live view of the company. Every widget is actionable and links
              to the module that owns it.
            </p>
          </div>
        </div>
      </div>

      {/* Company Overview */}
      <CompanyOverviewWidget />

      {/* Row 1 — health / alerts / calendar */}
      <div className="grid gap-4 lg:grid-cols-3">
        <CompanyHealthWidget />
        <CriticalAlertsWidget />
        <ExecutiveCalendarWidget />
      </div>

      {/* Row 2 — approvals + departments */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DepartmentOverviewWidget />
        </div>
        <ExecutiveApprovalsWidget />
      </div>

      {/* Row 3 — activity + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivityWidget />
        </div>
        <QuickActionsWidget />
      </div>

      {/* Row 4 — system + announcements */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SystemStatusWidget />
        <AnnouncementsWidget />
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
