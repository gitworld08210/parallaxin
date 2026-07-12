import { Link, Outlet, useLocation } from "react-router-dom";
import {
  BadgeCheck, LayoutDashboard, Inbox, ShieldCheck, Link2, Gavel, History,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin-os/verification", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin-os/verification/queue", label: "Applications", icon: Inbox },
  { to: "/admin-os/verification/badges", label: "Badges", icon: ShieldCheck },
  { to: "/admin-os/verification/affiliations", label: "Affiliations", icon: Link2 },
  { to: "/admin-os/verification/appeals", label: "Appeals", icon: Gavel },
  { to: "/admin-os/verification/history", label: "History", icon: History },
];

const VerificationShell = () => {
  const loc = useLocation();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <BadgeCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            OPERATIONS · VERIFICATION
          </p>
          <h1 className="text-2xl font-bold">Verification Department</h1>
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

export default VerificationShell;
