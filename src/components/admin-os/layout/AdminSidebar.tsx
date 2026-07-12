import { NavLink } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import {
  ADMIN_MODULES,
  SECTION_LABELS,
  type AdminModule,
} from "@/features/admin-os/modules.config";

const groupBySection = (modules: AdminModule[]) => {
  const groups = new Map<AdminModule["section"], AdminModule[]>();
  for (const m of modules) {
    if (!groups.has(m.section)) groups.set(m.section, []);
    groups.get(m.section)!.push(m);
  }
  return groups;
};

export const AdminSidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { hasPermission, employee } = useEmployee();
  const visible = ADMIN_MODULES.filter((m) => hasPermission(m.permission));
  const groups = groupBySection(visible);
  const order: AdminModule["section"][] = ["core", "operations", "platform", "governance"];

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6 border-b border-border/60">
        <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground">
          AURELIX
        </p>
        <p className="text-lg font-bold leading-tight">Admin OS</p>
        {employee && (
          <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-xs font-medium truncate">{employee.full_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {employee.role?.name ?? "—"} · {employee.department?.name ?? "—"}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {order.map((section) => {
          const items = groups.get(section);
          if (!items?.length) return null;
          return (
            <div key={section}>
              <p className="px-3 mb-2 text-[10px] font-bold tracking-[0.18em] text-muted-foreground/80 uppercase">
                {SECTION_LABELS[section]}
              </p>
              <ul className="space-y-0.5">
                {items.map((m) => {
                  const Icon = m.icon;
                  const to = m.slug === "overview" ? "/admin-os" : `/admin-os/${m.slug}`;
                  return (
                    <li key={m.slug}>
                      <NavLink
                        to={to}
                        end={m.slug === "overview"}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{m.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border/60 px-5 py-4">
        <p className="text-[10px] text-muted-foreground">
          Phase 1 · Foundation Ready
        </p>
      </div>
    </div>
  );
};
