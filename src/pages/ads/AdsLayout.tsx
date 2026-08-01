import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  LayoutDashboard,
  Megaphone,
  Images,
  Wallet,
  ShieldCheck,
  Plus,
  ChevronDown,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdsAccounts, rememberAccount, useIsAdsStaff } from "@/hooks/ads/useAdsAccounts";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { fmtCoins } from "./lib";

const NAV = [
  { to: "", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "campaigns", label: "Campaigns", icon: Megaphone },
  { to: "creatives", label: "Creatives", icon: Images },
  { to: "billing", label: "Billing", icon: Wallet },
];

export default function AdsLayout() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { accounts } = useAdsAccounts();
  const { balance } = useCoinBalance();
  const staff = useIsAdsStaff();

  const active = accounts.find((a) => a.id === accountId);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Helmet>
        <title>Aurelix Ads Manager</title>
        <meta name="description" content="Create, manage and measure Reels, Stories, Feed and Explore ads on Aurelix." />
      </Helmet>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-3 md:px-5">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
              <Megaphone className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">Aurelix Ads</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Building2 className="h-3.5 w-3.5" />
                <span className="max-w-[9rem] truncate">{active?.name ?? "Select account"}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              {accounts.map((a) => (
                <DropdownMenuItem
                  key={a.id}
                  onClick={() => {
                    rememberAccount(a.id);
                    navigate(`/ads/${a.id}`);
                  }}
                >
                  {a.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => navigate("/ads")}>+ New ad account</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-lg border border-border px-2.5 py-1.5 text-xs tabular-nums text-muted-foreground sm:inline">
              Wallet · <span className="font-semibold text-foreground">{fmtCoins(balance)}</span>
            </span>
            <Button size="sm" className="gap-1.5" onClick={() => navigate(`/ads/${accountId}/create`)}>
              <Plus className="h-3.5 w-3.5" /> Create
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-52 shrink-0 border-r border-border p-3 md:block">
          <nav className="space-y-1">
            {NAV.map((item) => (
              <NavLink
                key={item.label}
                to={`/ads/${accountId}/${item.to}`.replace(/\/$/, "")}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                    isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            {(staff.reviewer || staff.finance) && (
              <div className="pt-3">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Internal
                </p>
                {staff.reviewer && (
                  <NavLink
                    to="/ads/review"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                        isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"
                      }`
                    }
                  >
                    <ShieldCheck className="h-4 w-4" /> Ad review
                  </NavLink>
                )}
                {staff.finance && (
                  <NavLink
                    to="/ads/finance"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                        isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"
                      }`
                    }
                  >
                    <Wallet className="h-4 w-4" /> Finance console
                  </NavLink>
                )}
              </div>
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.label}
            to={`/ads/${accountId}/${item.to}`.replace(/\/$/, "")}
            end={item.end}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center gap-1 text-[10px] ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="h-4.5 w-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
