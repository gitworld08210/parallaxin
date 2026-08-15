import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, PlusSquare, Film, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthProvider";
import { useState } from "react";
import { UnifiedCreationSheet } from "@/components/compose/UnifiedCreationSheet";

export const MobileNav = () => {
  const loc = useLocation();
  const { profile } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  if (loc.pathname.startsWith("/auth")) return null;

  const items = [
    { to: "/", icon: Home, label: "Home", end: true },
    { to: "/discover", icon: Search, label: "Search" },
    { to: "#create", icon: PlusSquare, label: "Create", action: () => setCreateOpen(true) },
    { to: "/reels", icon: Film, label: "Reels" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.06] bg-black"
      >
        <ul className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {items.map(({ to, icon: Icon, label, end, action }) => {
            const isProfile = label === "Profile";

            return (
              <li key={to} className="flex-1">
                {action ? (
                  <button
                    onClick={action}
                    className="w-full flex flex-col items-center justify-center py-2.5 text-zinc-400 active:text-white transition-colors"
                  >
                    <Icon className="h-[26px] w-[26px]" strokeWidth={1.8} />
                  </button>
                ) : (
                  <NavLink to={to} end={end}>
                    {({ isActive }) => (
                      <div className={cn(
                        "flex flex-col items-center justify-center py-2.5 transition-colors",
                        isActive ? "text-white" : "text-zinc-400",
                      )}>
                        {isProfile && profile?.avatar_url ? (
                          <div className={cn(
                            "h-[26px] w-[26px] rounded-full overflow-hidden",
                            isActive && "ring-[1.5px] ring-white",
                          )}>
                            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <Icon className="h-[26px] w-[26px]" strokeWidth={isActive ? 2.2 : 1.8} />
                        )}
                      </div>
                    )}
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <UnifiedCreationSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
};

export default MobileNav;
