import { Link } from "react-router-dom";
import {
  ArrowRight, Bell, BarChart3, Building2, CheckCircle2, Crown,
  Inbox, ScrollText, Settings, ShieldCheck, Users,
} from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";

const tiles = [
  { to: "inbox", label: "Executive Inbox", icon: Inbox, desc: "Escalations & briefings" },
  { to: "approvals", label: "Approvals", icon: CheckCircle2, desc: "Awaiting your decision" },
  { to: "departments", label: "Departments", icon: Building2, desc: "Governance overview" },
  { to: "employees", label: "Employees", icon: Users, desc: "Workforce roster" },
  { to: "reports", label: "Reports", icon: BarChart3, desc: "Executive analytics" },
  { to: "decisions", label: "Decision Log", icon: ScrollText, desc: "Historical resolutions" },
  { to: "security", label: "Security", icon: ShieldCheck, desc: "Sessions & audit" },
  { to: "company", label: "Company Settings", icon: Settings, desc: "Policy & configuration" },
  { to: "notifications", label: "Notifications", icon: Bell, desc: "Your alerts" },
];

const ExecutiveDashboard = () => {
  const { employee } = useEmployee();
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-amber-500/5 via-transparent to-primary/5 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-500">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              FOUNDER OFFICE · EXECUTIVE WORKSPACE
            </p>
            <h1 className="text-2xl font-bold">
              Welcome, {employee?.full_name?.split(" ")[0] ?? "Founder"}.
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              This is your command center. Modules light up here as they come online.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="group rounded-xl border border-border/60 bg-card p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <t.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs text-muted-foreground truncate">{t.desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
