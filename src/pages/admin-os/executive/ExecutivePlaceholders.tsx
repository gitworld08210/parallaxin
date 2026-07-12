/**
 * Placeholder pages for future Executive Workspace modules (Phase 3.1 shell).
 */
import { Link } from "react-router-dom";
import {
  Bell, BarChart3, Building2, CheckCircle2, Inbox, ScrollText, Settings, Users,
} from "lucide-react";

const Placeholder = ({
  icon: Icon, title, sub, description, actions,
}: {
  icon: any; title: string; sub: string; description: string; actions?: React.ReactNode;
}) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">{sub}</p>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
    </div>
    <div className="rounded-xl border border-dashed border-border/60 bg-card p-10 text-center">
      <p className="text-sm font-medium">{title} module is coming soon.</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      {actions}
    </div>
  </div>
);

export const ExecutiveInbox = () => (
  <Placeholder icon={Inbox} sub="EXECUTIVE · INBOX" title="Executive Inbox"
    description="Escalations, briefings and confidential threads will surface here." />
);

export const ExecutiveApprovals = () => (
  <Placeholder icon={CheckCircle2} sub="EXECUTIVE · APPROVALS" title="Approvals"
    description="High-authority decisions awaiting your resolution."
    actions={
      <Link to="/admin-os/platform/approvals"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 mt-4 text-xs font-semibold hover:bg-muted">
        Open platform approvals
      </Link>
    } />
);

export const ExecutiveDepartments = () => (
  <Placeholder icon={Building2} sub="EXECUTIVE · DEPARTMENTS" title="Departments"
    description="Company-wide department health, capacity and governance."
    actions={
      <Link to="/admin-os/departments"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 mt-4 text-xs font-semibold hover:bg-muted">
        Open departments
      </Link>
    } />
);

export const ExecutiveEmployees = () => (
  <Placeholder icon={Users} sub="EXECUTIVE · EMPLOYEES" title="Employees"
    description="Founder-level employee directory and workforce insights."
    actions={
      <Link to="/admin-os/people-ops"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 mt-4 text-xs font-semibold hover:bg-muted">
        Open People Ops
      </Link>
    } />
);

export const ExecutiveReports = () => (
  <Placeholder icon={BarChart3} sub="EXECUTIVE · REPORTS" title="Reports"
    description="Executive dashboards, financial and operational reports." />
);

export const DecisionLog = () => (
  <Placeholder icon={ScrollText} sub="EXECUTIVE · DECISIONS" title="Decision Log"
    description="Historical resolutions and founder-level rulings." />
);

export const CompanySettings = () => (
  <Placeholder icon={Settings} sub="EXECUTIVE · COMPANY" title="Company Settings"
    description="Policies, configuration and organization-wide preferences." />
);

export const ExecutiveNotifications = () => (
  <Placeholder icon={Bell} sub="EXECUTIVE · NOTIFICATIONS" title="Notifications"
    description="Your subscription of alerts and delivery channels." />
);
