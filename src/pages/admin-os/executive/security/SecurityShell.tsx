import { Link, Outlet, useLocation } from "react-router-dom";
import {
  ShieldCheck, User, Monitor, LifeBuoy, KeyRound, Bell, History, Settings2, Fingerprint,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin-os/executive/security", label: "Overview", icon: ShieldCheck, end: true },
  { to: "/admin-os/executive/security/identity", label: "Identity", icon: User },
  { to: "/admin-os/executive/security/sessions", label: "Sessions", icon: Monitor },
  { to: "/admin-os/executive/security/devices", label: "Trusted Devices", icon: Fingerprint },
  { to: "/admin-os/executive/security/recovery", label: "Recovery", icon: LifeBuoy },
  { to: "/admin-os/executive/security/password", label: "Password & MFA", icon: KeyRound },
  { to: "/admin-os/executive/security/alerts", label: "Alerts", icon: Bell },
  { to: "/admin-os/executive/security/history", label: "Login History", icon: History },
  { to: "/admin-os/executive/security/policies", label: "Policies", icon: Settings2 },
];

const SecurityShell = () => {
  const loc = useLocation();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            EXECUTIVE · SECURITY & IDENTITY
          </p>
          <h1 className="text-2xl font-bold">Founder Office Security Center</h1>
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
