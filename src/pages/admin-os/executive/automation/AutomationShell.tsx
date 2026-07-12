import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Zap, LayoutDashboard, Workflow, CalendarClock, Bell, TrendingUp,
  BookTemplate, History, ArrowUpRight, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin-os/executive/automation", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin-os/executive/automation/automations", label: "Automations", icon: Workflow },
  { to: "/admin-os/executive/automation/builder", label: "Builder", icon: Zap },
  { to: "/admin-os/executive/automation/schedules", label: "Schedules", icon: CalendarClock },
  { to: "/admin-os/executive/automation/reminders", label: "Reminders", icon: Bell },
  { to: "/admin-os/executive/automation/escalations", label: "Escalations", icon: ArrowUpRight },
  { to: "/admin-os/executive/automation/templates", label: "Templates", icon: BookTemplate },
  { to: "/admin-os/executive/automation/history", label: "History", icon: History },
  { to: "/admin-os/executive/automation/monitor", label: "Monitor", icon: Activity },
];

const AutomationShell = () => {
  const loc = useLocation();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            EXECUTIVE · AUTOMATION CENTER
          </p>
          <h1 className="text-2xl font-bold">Executive Automation Center</h1>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-1 border-b border-border/60 pb-1">
        {tabs.map((t) => {
          const active = t.end ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to}
              className={cn(
                "flex items-center gap-2 rounded-t-md px-3 py-2 text-sm font-medium whitespace-nowrap",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}>
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
};

export default AutomationShell;
