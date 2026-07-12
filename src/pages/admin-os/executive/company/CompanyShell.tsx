import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Settings, Building2, Palette, ToggleLeft, Boxes, Globe, Calendar as CalIcon, Hash, Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin-os/executive/company", label: "Overview", icon: Settings, end: true },
  { to: "/admin-os/executive/company/profile", label: "Company Profile", icon: Building2 },
  { to: "/admin-os/executive/company/brand", label: "Brand", icon: Palette },
  { to: "/admin-os/executive/company/preferences", label: "Preferences", icon: Globe },
  { to: "/admin-os/executive/company/localization", label: "Localization", icon: Languages },
  { to: "/admin-os/executive/company/features", label: "Feature Flags", icon: ToggleLeft },
  { to: "/admin-os/executive/company/modules", label: "Modules", icon: Boxes },
  { to: "/admin-os/executive/company/calendar", label: "Calendar", icon: CalIcon },
  { to: "/admin-os/executive/company/metadata", label: "Metadata", icon: Hash },
];

const CompanyShell = () => {
  const loc = useLocation();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            EXECUTIVE · COMPANY CONFIGURATION
          </p>
          <h1 className="text-2xl font-bold">Company Settings & Global Configuration</h1>
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

export default CompanyShell;
