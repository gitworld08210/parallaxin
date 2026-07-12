import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, LogOut, ArrowLeftRight, Search, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { EMPLOYMENT_STATUS_LABELS } from "@/features/admin-os/permissions";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./AdminSidebar";

export const AdminTopbar = () => {
  const { signOut } = useAuth();
  const { employee } = useEmployee();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    nav("/auth", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md">
      {/* Mobile menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="lg:hidden rounded-lg p-2 hover:bg-muted/40"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <AdminSidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="hidden md:flex items-center gap-2 flex-1 max-w-md rounded-lg bg-muted/40 px-3 py-1.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search employees, tickets, orgs…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
        <kbd className="hidden lg:inline text-[10px] rounded bg-background border border-border px-1.5 py-0.5 text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {employee && (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {EMPLOYMENT_STATUS_LABELS[employee.employment_status] ?? employee.employment_status}
          </span>
        )}
        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted/40"
          title="Switch to Aurelix consumer app"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Switch workspace
        </Link>
        <button
          className="rounded-lg p-2 hover:bg-muted/40"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <button
          onClick={handleSignOut}
          className="rounded-lg p-2 hover:bg-destructive/10 hover:text-destructive"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};
