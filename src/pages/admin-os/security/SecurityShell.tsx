import { Link, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert, LayoutDashboard, AlertTriangle, Radar, Users, FileSearch, ShieldCheck, BarChart3, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin-os/security", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin-os/security/incidents", label: "Incidents", icon: AlertTriangle },
  { to: "/admin-os/security/threats", label: "Threats", icon: Radar },
  { to: "/admin-os/security/iam", label: "IAM", icon: Users },
  { to: "/admin-os/security/access-reviews", label: "Access Reviews", icon: FileSearch },
  { to: "/admin-os/security/investigations", label: "Investigations", icon: Search },
  { to: "/admin-os/security/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/admin-os/security/analytics", label: "Analytics", icon: BarChart3 },
];

const SecurityShell = () => {
  const loc = useLocation();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">OPERATIONS · SECURITY</p>
          <h1 className="text-2xl font-bold">Security Department</h1>
        </div>
      </div>
      <div className="flex overflow-x-auto gap-1 border-b border-border/60 pb-1">
        {tabs.map((t) => {
          const active = t.end ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex items-center gap-2 rounded-t-md px-3 py-2 text-sm font-medium whitespace-nowrap",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
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

export default SecurityShell;
