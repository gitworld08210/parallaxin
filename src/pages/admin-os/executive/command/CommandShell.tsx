import { Link, Outlet, useLocation } from "react-router-dom";
import {
  ShieldAlert,
  Wrench,
  Megaphone,
  Send,
  Activity,
  AlertOctagon,
  LifeBuoy,
  Lock,
  Eye,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin-os/executive/command", label: "Overview", icon: Command, end: true },
  { to: "/admin-os/executive/command/emergency", label: "Emergency", icon: ShieldAlert },
  { to: "/admin-os/executive/command/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/admin-os/executive/command/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin-os/executive/command/broadcasts", label: "Broadcasts", icon: Send },
  { to: "/admin-os/executive/command/status", label: "System Status", icon: Activity },
  { to: "/admin-os/executive/command/incidents", label: "Incidents", icon: AlertOctagon },
  { to: "/admin-os/executive/command/continuity", label: "Continuity", icon: LifeBuoy },
  { to: "/admin-os/executive/command/lockdowns", label: "Lockdowns", icon: Lock },
  { to: "/admin-os/executive/command/watchlists", label: "Watchlists", icon: Eye },
];

const CommandShell = () => {
  const loc = useLocation();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
          <Command className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            EXECUTIVE · COMMAND CENTER
          </p>
          <h1 className="text-2xl font-bold">Global Operations Control</h1>
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
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
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

export default CommandShell;
