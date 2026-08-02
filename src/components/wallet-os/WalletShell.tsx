import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Home, BarChart3, Receipt, IdCard, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/wallet", label: "Home", icon: Home },
  { to: "/wallet/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/wallet/transactions", label: "Activity", icon: Receipt },
  { to: "/wallet/passport", label: "Passport", icon: IdCard },
];

export function WalletShell({ title, subtitle, children, back }: { title: string; subtitle?: string; children: ReactNode; back?: boolean }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="wallet-os min-h-screen pb-28">
      <header className="wallet-os-header sticky top-0 z-30 flex items-center gap-3 px-4 py-3">
        {back && (
          <button aria-label="Go back" onClick={() => navigate(-1)} className="grid h-8 w-8 place-items-center rounded-full bg-foreground/5">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <Link to="/wallet/security" aria-label="Wallet security" className="grid h-8 w-8 place-items-center rounded-full bg-foreground/5">
          <ShieldCheck className="h-4 w-4 text-[hsl(var(--wallet-accent))]" />
        </Link>
      </header>

      <main className="px-4 pt-4">{children}</main>

      <nav className="wallet-os-tabbar fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-lg items-center justify-around px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {TABS.map((t) => {
          const active = pathname === t.to;
          return (
            <Link key={t.to} to={t.to} className="flex flex-1 flex-col items-center gap-1 py-1.5" aria-current={active ? "page" : undefined}>
              <t.icon className={cn("h-[18px] w-[18px]", active ? "text-[hsl(var(--wallet-accent))]" : "text-muted-foreground")} />
              <span className={cn("text-[10px]", active ? "font-semibold text-foreground" : "text-muted-foreground")}>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
