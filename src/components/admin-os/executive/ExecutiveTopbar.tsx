import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Menu, ShieldCheck, UserRound, X, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ExecutiveSidebar } from "./ExecutiveSidebar";

export const ExecutiveTopbar = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const { employee } = useEmployee();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const signOut = async () => {
    try {
      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null, module: "founder_office", action: "founder.logout",
        target_type: "user", target_id: user?.id ?? "",
      });
    } catch { /* ignore */ }
    await supabase.auth.signOut();
    nav("/auth", { replace: true });
  };

  return (
    <>
      <header className="h-14 border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-20 flex items-center gap-3 px-4">
        <button
          className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border hover:bg-muted"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-500" />
          <p className="text-xs font-bold tracking-[0.15em] text-muted-foreground">
            FOUNDER OFFICE · EXECUTIVE
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Session active
          </span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1 hover:bg-muted"
            >
              <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold overflow-hidden">
                {employee?.photo_url
                  ? <img src={employee.photo_url} alt="" className="h-full w-full object-cover" />
                  : employee?.full_name?.slice(0, 2).toUpperCase() ?? "FO"}
              </span>
              <span className="text-xs font-semibold hidden sm:inline">
                {employee?.full_name ?? "Founder"}
              </span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border/60 bg-popover shadow-lg overflow-hidden z-30">
                <Link
                  to="/admin-os/executive/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                >
                  <UserRound className="h-4 w-4" /> Profile
                </Link>
                <Link
                  to="/admin-os/executive/security"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                >
                  <ShieldCheck className="h-4 w-4" /> Security
                </Link>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 border-t border-border/60"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-card border-r border-border/60">
            <div className="flex justify-end p-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="h-9 w-9 rounded-lg border border-border hover:bg-muted inline-flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ExecutiveSidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
};

export default ExecutiveTopbar;
