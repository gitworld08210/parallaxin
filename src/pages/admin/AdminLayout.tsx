import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import { BadgeCheck, Flag, Crown, Users, LogOut, Shield } from "lucide-react";

const items = [
  { to: "/admin", label: "Verification", icon: BadgeCheck, end: true },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/founders", label: "Founder Seats", icon: Crown },
  { to: "/admin/users", label: "Users & Roles", icon: Users },
];

const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    nav("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="md:w-64 md:min-h-screen border-b md:border-b-0 md:border-r border-border bg-card/40 backdrop-blur">
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <div className="h-10 w-10 rounded-xl bg-primary/20 grid place-items-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-wide text-primary">ADMIN PANEL</p>
            <p className="text-xs text-muted-foreground truncate">@{profile?.username || "admin"}</p>
          </div>
        </div>
        <nav className="p-3 flex md:flex-col gap-1 overflow-x-auto">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`
              }
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </NavLink>
          ))}
          <button
            onClick={handleSignOut}
            className="md:mt-auto flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-5 md:p-8 max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
