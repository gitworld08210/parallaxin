import { Home, Film, MessageCircle, Plus, ImageIcon, Sparkles, User as UserIcon } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { RealtimeToaster } from "@/components/social/RealtimeToaster";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const AppShell = () => {
  const { pathname } = useLocation();
  const { user, profile } = useAuth();
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadDm, setUnreadDm] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  // unread notifications
  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("read", false);
      setUnreadNotif(count ?? 0);
    };
    refresh();
    const ch = supabase.channel(`notif-badge:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // unread DMs
  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      const { data: parts } = await supabase
        .from("conversation_participants").select("conversation_id").eq("user_id", user.id);
      const ids = (parts ?? []).map((p) => p.conversation_id);
      if (!ids.length) { setUnreadDm(0); return; }
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", ids)
        .neq("sender_id", user.id)
        .is("read_at", null);
      setUnreadDm(count ?? 0);
    };
    refresh();
    const ch = supabase.channel(`dm-badge:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const isReels = pathname.startsWith("/reels");
  const onDmsRoute = pathname.startsWith("/messages");
  const onProfileRoute = pathname.startsWith("/profile") || pathname.startsWith("/u/");

  return (
    <div className={cn("min-h-screen mx-auto max-w-md relative pb-32", isReels && "bg-black")}>
      <RealtimeToaster />
      <main key={pathname} className="animate-fade-in">
        <Outlet />
      </main>

      {/* Floating glass arc bottom nav */}
      <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center pb-4 px-4 pointer-events-none">
        <div className="relative pointer-events-auto w-full max-w-md">
          {/* ambient glow */}
          <div className={cn(
            "absolute -bottom-10 left-1/2 -translate-x-1/2 w-56 h-14 blur-[60px] -z-10",
            isReels ? "bg-white/10" : "bg-fuchsia-500/25",
          )} />

          <nav
            className={cn(
              "relative px-3 py-3 rounded-[32px] flex items-center justify-between",
              "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl border",
              isReels ? "bg-black/70 border-white/10" : "bg-white/5 border-white/10",
            )}
          >
            <NavSlot to="/" end label="Feed" icon={Home} />
            <NavSlot to="/reels" label="Reels" icon={Film} />

            {/* Center Create */}
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Create"
                  className="relative -top-7 w-14 h-14 rounded-full bg-gradient-to-tr from-[#8b5cf6] via-[#d946ef] to-[#06b6d4] p-[2px] shadow-[0_12px_24px_-8px_rgba(139,92,246,0.6)] active:scale-90 transition-transform"
                >
                  <div className={cn(
                    "w-full h-full rounded-full flex items-center justify-center",
                    isReels ? "bg-black" : "bg-[#0b0420]",
                  )}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8b5cf6] via-[#d946ef] to-[#06b6d4] flex items-center justify-center">
                      <Plus className="h-6 w-6 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl">
                <div className="grid grid-cols-3 gap-3 pt-6 pb-4">
                  <Link onClick={() => setCreateOpen(false)} to="/compose" className="glass-strong rounded-2xl py-5 flex flex-col items-center gap-2">
                    <ImageIcon className="h-6 w-6 text-primary" />
                    <span className="text-xs font-semibold">Post</span>
                  </Link>
                  <Link onClick={() => setCreateOpen(false)} to="/compose/reel" className="glass-strong rounded-2xl py-5 flex flex-col items-center gap-2">
                    <Film className="h-6 w-6 text-primary" />
                    <span className="text-xs font-semibold">Reel</span>
                  </Link>
                  <Link onClick={() => setCreateOpen(false)} to="/compose/story" className="glass-strong rounded-2xl py-5 flex flex-col items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <span className="text-xs font-semibold">Story</span>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>

            <NavSlot to="/messages" label="DMs" icon={MessageCircle} dot={unreadDm > 0 ? "cyan" : null} />

            {/* Profile slot — avatar instead of icon */}
            <NavLink to="/profile" className="flex flex-col items-center gap-1 group px-2 active:scale-95 transition-transform">
              {() => {
                const active = onProfileRoute;
                return (
                  <>
                    <div className={cn(
                      "p-2 relative transition-colors",
                      active ? "text-white" : "text-white/40 group-active:text-white",
                    )}>
                      <div className={cn(
                        "w-6 h-6 rounded-full overflow-hidden ring-2 transition-all",
                        active ? "ring-white/60" : "ring-transparent border border-white/20",
                      )}>
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#8b5cf6] to-[#d946ef]" />
                        )}
                      </div>
                      {unreadNotif > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75 blur-[2px]" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-fuchsia-500 border border-[#1a1135] shadow-[0_0_10px_#e879f9]" />
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: "Space Grotesk, Inter, sans-serif" }} className={cn(
                      "text-[10px] tracking-wide",
                      active ? "font-semibold text-white" : "font-medium text-white/40",
                    )}>Profile</span>
                  </>
                );
              }}
            </NavLink>
          </nav>
        </div>
      </div>
    </div>
  );
};

const NavSlot = ({
  to, end, label, icon: Icon, dot,
}: {
  to: string;
  end?: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  dot?: "cyan" | "magenta" | null;
}) => (
  <NavLink to={to} end={end} className="flex flex-col items-center gap-1 group px-2 active:scale-95 transition-transform">
    {({ isActive }) => (
      <>
        <div className={cn(
          "relative transition-colors",
          isActive
            ? "p-2 rounded-2xl bg-gradient-to-br from-[#8b5cf6] via-[#d946ef] to-[#06b6d4] shadow-[0_0_20px_rgba(217,70,239,0.4)] text-white"
            : "p-2 text-white/40 group-active:text-white",
        )}>
          <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.5 : 2} />
          {dot && (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className={cn("animate-pulse absolute inline-flex h-full w-full rounded-full opacity-75 blur-[2px]",
                dot === "cyan" ? "bg-cyan-400" : "bg-fuchsia-400")} />
              <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5 border border-[#1a1135]",
                dot === "cyan" ? "bg-cyan-400 shadow-[0_0_10px_#22d3ee]" : "bg-fuchsia-500 shadow-[0_0_10px_#e879f9]")} />
            </span>
          )}
        </div>
        <span style={{ fontFamily: "Space Grotesk, Inter, sans-serif" }} className={cn(
          "text-[10px] tracking-wide",
          isActive ? "font-semibold text-white" : "font-medium text-white/40",
        )}>{label}</span>
      </>
    )}
  </NavLink>
);
