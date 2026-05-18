import { Compass, Home, MessageCircle, User, Wallet } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: Home, label: "Feed" },
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/messages", icon: MessageCircle, label: "DMs" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/profile", icon: User, label: "Profile" },
];

export const AppShell = () => {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen mx-auto max-w-md relative pb-28">
      <main key={pathname} className="animate-fade-in">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-50 flex justify-center pb-4 px-4 pointer-events-none">
        <div className="glass-strong pointer-events-auto rounded-full px-2 py-2 flex items-center gap-1 shadow-elevated w-full max-w-md">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className="relative flex-1"
            >
              {({ isActive }) => (
                <div
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 py-2 rounded-full transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-full bg-gradient-primary opacity-25"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon className="relative h-5 w-5" strokeWidth={2.25} />
                  <span className="relative text-[10px] font-medium tracking-wide">{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
