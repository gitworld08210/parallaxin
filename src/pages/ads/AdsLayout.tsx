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
  Menu,
  X,
  Search,
  HelpCircle,
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
import { fmtCoins } from "@/features/ads/lib";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthProvider";

const NAV = [
  { to: "", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "campaigns", label: "Campaigns", icon: Megaphone },
  { to: "creatives", label: "Creatives", icon: Images },
  { to: "billing", label: "Billing", icon: Wallet },
];

export default function AdsLayout() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { accounts } = useAdsAccounts();
  const { balance } = useCoinBalance();
  const { profile } = useAuth();
  const staff = useIsAdsStaff();
  const [collapsed, setCollapsed] = useState(false);

  const active = accounts.find((a) => a.id === accountId);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground selection:bg-primary/30">
      <Helmet>
        <title>Aurelix Ads Manager</title>
        <meta name="description" content="Premium advertising platform for Aurelix." />
      </Helmet>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen border-r border-white/5 bg-[#0f0f0f] transition-all duration-300 md:block",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
              <Megaphone className="h-4.5 w-4.5" />
            </div>
            {!collapsed && (
              <span className="font-display text-lg font-black tracking-tight text-white">
                AURELIX <span className="text-primary">ADS</span>
              </span>
            )}
          </div>
        </div>

        <nav className="mt-6 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.label}
              to={`/ads/${accountId}/${item.to}`.replace(/\/$/, "")}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                  isActive 
                    ? "bg-primary text-white shadow-glow" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {(staff.reviewer || staff.finance) && (
            <div className="mt-8 pt-4 border-t border-white/5">
              {!collapsed && (
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Administration
                </p>
              )}
              {staff.reviewer && (
                <NavLink
                  to="/ads/review"
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                      isActive ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    )
                  }
                >
                  <ShieldCheck className="h-5 w-5" />
                  {!collapsed && <span>Ad Review</span>}
                </NavLink>
              )}
              {staff.finance && (
                <NavLink
                  to="/ads/finance"
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                      isActive ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    )
                  }
                >
                  <Wallet className="h-5 w-5" />
                  {!collapsed && <span>Finance</span>}
                </NavLink>
              )}
            </div>
          )}
        </nav>

        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-6 left-6 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition hover:bg-white/5 hover:text-white"
        >
          {collapsed ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Main Container */}
      <div 
        className={cn(
          "transition-all duration-300",
          collapsed ? "md:pl-20" : "md:pl-64"
        )}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-medium transition hover:bg-white/10 border border-white/5">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="max-w-[12rem] truncate text-white">{active?.name ?? "Select Business"}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 bg-[#141414] border-white/10 text-white">
                  {accounts.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      className="focus:bg-primary focus:text-white"
                      onClick={() => {
                        rememberAccount(a.id);
                        navigate(`/ads/${a.id}`);
                      }}
                    >
                      {a.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem 
                    className="border-t border-white/5 mt-1 focus:bg-primary focus:text-white"
                    onClick={() => navigate("/ads")}
                  >
                    + Create New Ad Account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="hidden lg:flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 border border-white/5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search campaigns..." 
                  className="bg-transparent border-none focus:ring-0 text-sm w-48 text-white placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden xl:flex flex-col items-end mr-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Balance</span>
                <span className="text-sm font-bold text-white tabular-nums">{fmtCoins(balance)}</span>
              </div>
              
              <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-muted-foreground transition hover:bg-white/10 hover:text-white border border-white/5">
                <HelpCircle className="h-5 w-5" />
              </button>

              <div className="h-8 w-px bg-white/10" />

              <Avatar className="h-9 w-9 border border-white/10 ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-white">{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="min-h-[calc(100vh-4rem)] p-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-white/5 bg-[#0f0f0f]/95 backdrop-blur-xl md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.label}
            to={`/ads/${accountId}/${item.to}`.replace(/\/$/, "")}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5.5 w-5.5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function ArrowLeft(props: any) {
  return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
}
function ArrowRight(props: any) {
  return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
}