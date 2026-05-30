import { Home, Film, MessageCircle, Plus, ImageIcon, Sparkles, User, Radio, Camera, Upload, Wand2 } from "lucide-react";
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

  // Activity heartbeat — tick last_seen_at every 60s while the tab is visible
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      supabase.from("profiles").update({ last_seen_at: new Date().toISOString() } as any).eq("user_id", user.id).then(() => {});
    };
    tick();
    const iv = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", tick); };
  }, [user?.id]);

  const isReels = pathname.startsWith("/reels");
  const onProfileRoute = pathname.startsWith("/profile") || pathname.startsWith("/u/");

  return (
    <div className={cn("min-h-screen mx-auto max-w-md relative pb-[96px]", isReels ? "bg-black" : "bg-background")}>
      <RealtimeToaster />
      <main key={pathname} className="animate-fade-in">
        <Outlet />
      </main>

      {/* Flat Instagram-style bottom nav */}
      <nav
        className={cn(
          "fixed bottom-0 inset-x-0 z-50 mx-auto max-w-md h-14 grid grid-cols-5 items-center",
          isReels ? "bg-black border-t border-white/10" : "bg-background border-t border-border",
        )}
      >
        <NavSlot to="/" end label="Home" icon={Home} />
        <NavSlot to="/reels" label="Reels" icon={Film} />

        {/* Create — flat center button */}
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <button aria-label="Create" className="h-full w-full flex items-center justify-center active:scale-95 transition-transform">
              <Plus className={cn("h-7 w-7", isReels ? "text-white" : "text-foreground")} strokeWidth={2.25} />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl bg-background border-t border-border">
            <div className="grid grid-cols-3 gap-2 pt-4 pb-3">
              <CreateAction to="/compose" icon={ImageIcon} label="Post" onPick={() => setCreateOpen(false)} />
              <CreateAction to="/compose/reel" icon={Film} label="Reel" onPick={() => setCreateOpen(false)} />
              <CreateAction to="/compose/story" icon={Sparkles} label="Story" onPick={() => setCreateOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <NavSlot to="/messages" label="DMs" icon={MessageCircle} badge={unreadDm > 0} isReels={isReels} />

        {/* Profile slot */}
        <NavLink to="/profile" className="h-full w-full flex items-center justify-center active:scale-95 transition-transform">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className={cn(
                  "h-7 w-7 rounded-full object-cover",
                  onProfileRoute ? "ring-2 ring-foreground" : "ring-1 ring-border",
                )}
              />
            ) : (
              <User className={cn(
                "h-7 w-7",
                onProfileRoute
                  ? (isReels ? "text-white fill-white" : "text-foreground fill-foreground")
                  : (isReels ? "text-white/60" : "text-muted-foreground"),
              )} strokeWidth={1.75} />
            )}
            {unreadNotif > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </div>
        </NavLink>
      </nav>
    </div>
  );
};

const NavSlot = ({
  to, end, label, icon: Icon, badge, isReels,
}: {
  to: string;
  end?: boolean;
  label: string;
  icon: any;
  badge?: boolean;
  isReels?: boolean;
}) => (
  <NavLink to={to} end={end} aria-label={label} className="h-full w-full flex items-center justify-center active:scale-95 transition-transform">
    {({ isActive }) => (
      <div className="relative">
        <Icon
          className={cn(
            "h-7 w-7 transition-colors",
            isActive
              ? (isReels ? "text-white fill-white" : "text-foreground fill-foreground")
              : (isReels ? "text-white/60" : "text-muted-foreground"),
          )}
          strokeWidth={isActive ? 1.5 : 1.75}
        />
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        )}
      </div>
    )}
  </NavLink>
);

const CreateAction = ({ to, icon: Icon, label, onPick }: { to: string; icon: any; label: string; onPick: () => void }) => (
  <Link onClick={onPick} to={to} className="rounded-xl py-5 flex flex-col items-center gap-2 bg-card border border-border hover:bg-secondary transition-colors">
    <Icon className="h-6 w-6 text-foreground" />
    <span className="text-xs font-semibold">{label}</span>
  </Link>
);
