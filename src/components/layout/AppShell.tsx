import { Compass, Film, Home, MessageCircle, User } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { RealtimeToaster } from "@/components/social/RealtimeToaster";

const tabs = [
  { to: "/", icon: Home, label: "Feed" },
  { to: "/reels", icon: Film, label: "Reels" },
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/messages", icon: MessageCircle, label: "DMs" },
  { to: "/profile", icon: User, label: "Profile" },
];

export const AppShell = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("read", false);
      setUnread(count ?? 0);
    };
    refresh();
    const ch = supabase.channel(`notif-badge:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const isReels = pathname.startsWith("/reels");

  return (
    <div className={cn("min-h-screen mx-auto max-w-md relative pb-28", isReels && "bg-black")}>
      <RealtimeToaster />
      <main key={pathname} className="animate-fade-in">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-50 flex justify-center pb-4 px-4 pointer-events-none">
        <div className={cn(
          "pointer-events-auto rounded-full px-2 py-2 flex items-center gap-1 shadow-elevated w-full max-w-md",
          isReels ? "bg-black/70 backdrop-blur-xl border border-white/10" : "glass-strong",
        )}>
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === "/"} className="relative flex-1">
              {({ isActive }) => (
                <div
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 py-2 rounded-full transition-colors",
                    isActive ? (isReels ? "text-white" : "text-foreground") : (isReels ? "text-white/60" : "text-muted-foreground"),
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-full bg-gradient-primary opacity-25"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <div className="relative">
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                    {to === "/" && unread > 0 && (
                      <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-accent text-[9px] font-bold grid place-items-center text-accent-foreground">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
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
