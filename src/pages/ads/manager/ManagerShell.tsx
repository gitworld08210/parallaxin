import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  LayoutDashboard, Megaphone, Layers, Image as ImageIcon, Users, MonitorSmartphone,
  BarChart3, Target, Wallet, Plus, Menu, ChevronLeft,
} from "lucide-react";
import { useResolvedAdvertiser } from "./shared";

const NAV = [
  { to: "/ads/manager", end: true, label: "Overview", icon: LayoutDashboard },
  { to: "/ads/manager/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/ads/manager/adsets", label: "Ad Sets", icon: Layers },
  { to: "/ads/manager/ads", label: "Ads", icon: MonitorSmartphone },
  { to: "/ads/manager/placements", label: "Placements", icon: Target },
  { to: "/ads/manager/reports", label: "Reports", icon: BarChart3 },
];

export default function ManagerShell() {
  const navigate = useNavigate();
  const { advertiser, advertiserId } = useResolvedAdvertiser();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] bg-background text-foreground">
      <Helmet>
        <title>Aurelix Ads Manager</title>
        <meta
          name="description"
          content="Plan, launch and optimise Reels, Stories and Feed ad campaigns across Aurelix with live performance reporting."
        />
      </Helmet>

      {/* Sidebar */}
      <aside
        className={`${open ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"} w-60 shrink-0 flex-col border-r border-border bg-card md:flex md:static`}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <button
            onClick={() => navigate("/ads")}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
            aria-label="Back to business centre"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Aurelix Ads</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {advertiser?.display_name ?? "Ads Manager"}
            </p>
          </div>
        </div>

        <button
          onClick={() => { setOpen(false); navigate("/ads/manager/create"); }}
          className="mx-3 mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Create campaign
        </button>

        <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                  isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}

          <div className="my-2 border-t border-border" />
          <NavLink
            to={advertiserId ? `/ads/${advertiserId}/billing` : "/ads"}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Wallet className="h-4 w-4" /> Billing &amp; payments
          </NavLink>
        </nav>
      </aside>

      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg border border-border p-1.5">
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">Ads Manager</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
