import { NavLink } from "react-router-dom";
import {
  Crown, LayoutDashboard, Inbox, CheckCircle2, Building2, Users,
  BarChart3, ScrollText, ShieldCheck, Settings, Bell, User as UserIcon, Scale,
} from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";

const items = [
  { to: "/admin-os/executive", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin-os/executive/inbox", label: "Executive Inbox", icon: Inbox },
  { to: "/admin-os/executive/approvals", label: "Approvals", icon: CheckCircle2 },
  { to: "/admin-os/executive/governance", label: "Governance", icon: Scale },
  { to: "/admin-os/executive/departments", label: "Departments", icon: Building2 },
  { to: "/admin-os/executive/employees", label: "Employees", icon: Users },
  { to: "/admin-os/executive/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin-os/executive/decisions", label: "Decision Log", icon: ScrollText },
  { to: "/admin-os/executive/security", label: "Security", icon: ShieldCheck },
  { to: "/admin-os/executive/company", label: "Company Settings", icon: Settings },
  { to: "/admin-os/executive/profile", label: "Profile", icon: UserIcon },
  { to: "/admin-os/executive/notifications", label: "Notifications", icon: Bell },
];

export const ExecutiveSidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { employee } = useEmployee();
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-500" />
          <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground">
            AURELIX
          </p>
        </div>
        <p className="text-lg font-bold leading-tight">Executive Workspace</p>
        {employee && (
          <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-xs font-medium truncate">{employee.full_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {employee.role?.name ?? "Founder"} · Founder Office
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {items.map((m) => (
            <li key={m.to}>
              <NavLink
                to={m.to}
                end={m.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`
                }
              >
                <m.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{m.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border/60 px-5 py-4">
        <p className="text-[10px] text-muted-foreground">
          Founder Office · Command Center
        </p>
      </div>
    </div>
  );
};

export default ExecutiveSidebar;
