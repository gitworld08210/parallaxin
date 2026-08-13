import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, PlusSquare, Heart, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf } from "@/lib/format";

type Props = { unreadNotif?: number; unreadDm?: number };

export const MobileNav = ({ unreadNotif = 0, unreadDm = 0 }: Props) => {
  const loc = useLocation();
  const { profile } = useAuth();
  
  if (loc.pathname.startsWith("/auth")) return null;

  const items = [
    { to: "/", icon: Home, label: "Home", end: true },
    { to: "/discover", icon: Search, label: "Explore" },
    { to: "/compose", icon: PlusSquare, label: "Create" },
    { to: "/notifications", icon: Heart, label: "Alerts", badgeKey: "notif" as const },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav
      aria-label="Primary"
      className="absolute bottom-0 inset-x-0 z-50 border-t border-white/[0.05] bg-black/90 backdrop-blur-2xl"
    >
      <ul className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, icon: Icon, label, end, badgeKey }) => {
          const badge = badgeKey === "notif" ? unreadNotif : badgeKey === "dm" ? unreadDm : 0;
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
              >
                {({ isActive }) => (
                  <div className={cn(
                    "relative flex flex-col items-center gap-0.5 py-2.5 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    <span className="relative">
                      {label === "Profile" && profile ? (
                        <div className={cn(
                          "h-[24px] w-[24px] rounded-full overflow-hidden ring-1 ring-white/20 transition-all",
                          isActive && "ring-white ring-2"
                        )}>
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <AuraAvatar gradient={gradientFor(profile.username)} initials={initialsOf(profile.display_name || profile.username)} />
                          )}
                        </div>
                      ) : (
                        <Icon className="h-[26px] w-[26px]" strokeWidth={isActive ? 2.5 : 2} />
                      )}
                      {badge > 0 && (
                        <span className="absolute -right-1 -top-1 min-w-[16px] h-4 rounded-full bg-rose-500 px-1 text-[9px] font-bold flex items-center justify-center text-white ring-2 ring-black">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </span>
                    <span className="sr-only">{label}</span>
                  </div>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileNav;
