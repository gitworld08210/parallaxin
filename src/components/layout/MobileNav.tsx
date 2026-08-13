import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, PlusSquare, Bell, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { unreadNotif?: number; unreadDm?: number };

const items = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/explore", icon: Search, label: "Explore" },
  { to: "/create", icon: PlusSquare, label: "Create" },
  { to: "/notifications", icon: Bell, label: "Alerts", badgeKey: "notif" as const },
  { to: "/messages", icon: MessageCircle, label: "Messages", badgeKey: "dm" as const },
];

export const MobileNav = ({ unreadNotif = 0, unreadDm = 0 }: Props) => {
  const loc = useLocation();
  if (loc.pathname.startsWith("/auth")) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-50 lg:hidden border-t border-border/60 bg-background/85 backdrop-blur-xl"
    >
      <ul className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, icon: Icon, label, end, badgeKey }) => {
          const badge = badgeKey === "notif" ? unreadNotif : badgeKey === "dm" ? unreadDm : 0;
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )
                }
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
                  {badge > 0 && (
                    <span className="absolute -right-2 -top-1 min-w-[16px] rounded-full bg-primary px-1 text-[9px] leading-4 text-primary-foreground">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                <span className="sr-only sm:not-sr-only">{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileNav;
