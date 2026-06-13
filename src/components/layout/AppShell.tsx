import { Home, Film, MessageCircle, Plus, ImageIcon, Sparkles, User, Radio, Camera, Upload, Wand2 } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { RealtimeToaster } from "@/components/social/RealtimeToaster";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsCreator } from "@/hooks/useIsCreator";
import { BecomeCreatorSheet } from "@/components/creator/BecomeCreatorSheet";

export const AppShell = () => {
  const { pathname } = useLocation();
  const { user, profile } = useAuth();
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadDm, setUnreadDm] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [becomeOpen, setBecomeOpen] = useState(false);
  const { isCreator } = useIsCreator();

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
        {/* Create — flat center button */}
        {isCreator ? (
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <button aria-label="Create" className="h-full w-full flex items-center justify-center active:scale-95 transition-transform">
              <Plus className={cn("h-7 w-7", isReels ? "text-white" : "text-foreground")} strokeWidth={2.25} />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl bg-background border-t border-border px-5 pt-5 pb-8">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <h2 className="text-xl font-bold tracking-tight mb-4">Create</h2>

            {/* Three colored tiles */}
            <div className="grid grid-cols-3 gap-3">
              <BigTile to="/compose" icon={ImageIcon} label="Post" gradient="from-sky-500 to-blue-600" onPick={() => setCreateOpen(false)} />
              <BigTile to="/compose/reel" icon={Film} label="Reel" gradient="from-fuchsia-500 to-pink-600" onPick={() => setCreateOpen(false)} />
              <BigTile to="/compose/story" icon={Sparkles} label="Story" gradient="from-orange-500 to-rose-500" onPick={() => setCreateOpen(false)} />
            </div>

            {/* Full-width Live */}
            <Link
              to="/compose/reel"
              onClick={() => setCreateOpen(false)}
              className="mt-3 block py-5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow flex items-center justify-center gap-2"
            >
              <Radio className="h-5 w-5" /> Live
            </Link>

            {/* List rows */}
            <div className="mt-5 space-y-1">
              <RowAction to="/compose/reel" icon={Radio} title="Go Live" subtitle="Broadcast to your audience" onPick={() => setCreateOpen(false)} />
              <RowAction to="/compose" icon={Camera} title="Camera" subtitle="Take a photo or video" onPick={() => setCreateOpen(false)} />
              <RowAction to="/compose" icon={Wand2} title="AI Video" subtitle="Create with AI" onPick={() => setCreateOpen(false)} />
              <RowAction to="/compose" icon={Upload} title="Upload" subtitle="From gallery" onPick={() => setCreateOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        ) : (
          <>
            <button
              aria-label="Become a Creator to post"
              onClick={() => setBecomeOpen(true)}
              className="h-full w-full flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus className={cn("h-7 w-7", isReels ? "text-white" : "text-foreground")} strokeWidth={2.25} />
            </button>
            <BecomeCreatorSheet open={becomeOpen} onOpenChange={setBecomeOpen} />
          </>
        )}

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

const BigTile = ({
  to, icon: Icon, label, gradient, onPick,
}: { to: string; icon: any; label: string; gradient: string; onPick: () => void }) => (
  <Link
    onClick={onPick}
    to={to}
    className={cn(
      "aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 text-white shadow-glow active:scale-[0.97] transition-transform bg-gradient-to-br",
      gradient
    )}
  >
    <Icon className="h-7 w-7" strokeWidth={2} />
    <span className="text-sm font-bold">{label}</span>
  </Link>
);

const RowAction = ({
  to, icon: Icon, title, subtitle, onPick,
}: { to: string; icon: any; title: string; subtitle: string; onPick: () => void }) => (
  <Link
    onClick={onPick}
    to={to}
    className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-colors"
  >
    <span className="h-10 w-10 rounded-full bg-secondary border border-border grid place-items-center shrink-0">
      <Icon className="h-5 w-5 text-foreground" />
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  </Link>
);
