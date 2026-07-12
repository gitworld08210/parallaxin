import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Rocket,
  LayoutDashboard,
  FolderKanban,
  Sparkles,
  ListTodo,
  Bug,
  PackageCheck,
  Palette,
  FileText,
  BarChart3,
  Kanban,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin-os/engineering", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin-os/engineering/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin-os/engineering/sprints", label: "Sprints", icon: Sparkles },
  { to: "/admin-os/engineering/board", label: "Kanban", icon: Kanban },
  { to: "/admin-os/engineering/tasks", label: "Tasks", icon: ListTodo },
  { to: "/admin-os/engineering/bugs", label: "Bugs", icon: Bug },
  { to: "/admin-os/engineering/releases", label: "Releases", icon: PackageCheck },
  { to: "/admin-os/engineering/design", label: "Design", icon: Palette },
  { to: "/admin-os/engineering/docs", label: "Docs", icon: FileText },
  { to: "/admin-os/engineering/reports", label: "Reports", icon: BarChart3 },
];

const EngineeringShell = () => {
  const loc = useLocation();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Rocket className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            DELIVERY · ENGINEERING & PRODUCT
          </p>
          <h1 className="text-2xl font-bold">Engineering & Product</h1>
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

export default EngineeringShell;
