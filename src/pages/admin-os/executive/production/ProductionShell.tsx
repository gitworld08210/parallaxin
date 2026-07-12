import { Link, Outlet, useLocation } from "react-router-dom";
import {
  ShieldCheck, LayoutDashboard, Boxes, GitBranch, ClipboardCheck,
  History, AlertTriangle, Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin-os/executive/production", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin-os/executive/production/modules", label: "Modules", icon: Boxes },
  { to: "/admin-os/executive/production/integrations", label: "Integrations", icon: GitBranch },
  { to: "/admin-os/executive/production/checklist", label: "Release Checklist", icon: ClipboardCheck },
  { to: "/admin-os/executive/production/releases", label: "Releases", icon: Rocket },
  { to: "/admin-os/executive/production/history", label: "Validation History", icon: History },
  { to: "/admin-os/executive/production/issues", label: "Issues", icon: AlertTriangle },
];

const ProductionShell = () => {
  const loc = useLocation();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            EXECUTIVE · PRODUCTION READINESS
          </p>
          <h1 className="text-2xl font-bold">Production Readiness & Release Control</h1>
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

export default ProductionShell;
