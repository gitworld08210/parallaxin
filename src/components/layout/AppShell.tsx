import { Home, Film, MessageCircle, Plus, ImageIcon, Sparkles, User, Radio, Camera, Upload, Wand2, Search, Compass, Bell } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { RealtimeToaster } from "@/components/social/RealtimeToaster";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsCreator } from "@/hooks/useIsCreator";
import { BecomeCreatorSheet } from "@/components/creator/BecomeCreatorSheet";
import { IncomingCallListener } from "@/components/call/IncomingCallListener";
import { IncomingCallOverlay } from "@/components/call/IncomingCallOverlay";
import { CallScreen } from "@/components/call/CallScreen";
import { EmailVerificationGate, useNeedsEmailVerification } from "@/components/auth/EmailVerificationGate";
import { CreateSheet } from "@/components/create/CreateSheet";

export const AppShell = () => {
  const { pathname } = useLocation();
  const { user, profile } = useAuth();
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadDm, setUnreadDm] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [becomeOpen, setBecomeOpen] = useState(false);
  const { isCreator } = useIsCreator();
  const needsEmail = useNeedsEmailVerification();

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
    <div className={cn("min-h-screen mx-auto max-w-md relative pb-[112px]", isReels ? "bg-black" : "bg-background")}>
      <RealtimeToaster />
      <IncomingCallListener />
      <IncomingCallOverlay />
      <CallScreen />
      <main key={pathname} className="animate-fade-in">
        <Outlet />
      </main>

      {/* Fixed bottom navigation — Twitter/Instagram/WhatsApp style */}
      <nav
        className={cn(
          "fixed bottom-0 inset-x-0 z-50 mx-auto max-w-md h-16 grid grid-cols-5 items-center pb-[env(safe-area-inset-bottom)]",
          isReels
            ? "bg-black/90 border-t border-white/10"
            : "liquid-nav border-t border-border/50",
        )}
      >
        <NavSlot to="/" end label="Home" icon={Home} isReels={isReels} />
        <NavSlot to="/reels" label="Reels" icon={Film} isReels={isReels} />
        <button
          type="button"
          aria-label="Create"
          onClick={() => setCreateOpen(true)}
          className="h-full w-full flex items-center justify-center active:scale-95 transition-transform"
        >
          <span className="h-9 w-9 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 grid place-items-center shadow-glow">
            <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
          </span>
        </button>
        <NavSlot
          to="/messages"
          label="Messages"
          icon={MessageCircle}
          isReels={isReels}
          badge={unreadDm > 0}
          badgeCount={unreadDm}
        />

        <NavLink to="/profile" aria-label="Profile" className="h-full w-full flex items-center justify-center active:scale-95 transition-transform">
          {({ isActive }) => (
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className={cn(
                    "h-7 w-7 rounded-full object-cover",
                    isActive ? "ring-2 ring-foreground" : "ring-1 ring-border",
                  )}
                />
              ) : (
                <User
                  className={cn(
                    "h-7 w-7",
                    isActive
                      ? (isReels ? "text-white fill-white" : "text-foreground fill-foreground")
                      : (isReels ? "text-white/60" : "text-muted-foreground"),
                  )}
                  strokeWidth={isActive ? 1.5 : 1.75}
                />
              )}
              {unreadNotif > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </div>
          )}
        </NavLink>
      </nav>

      <CreateSheet open={createOpen} onOpenChange={setCreateOpen} />
      {needsEmail && <EmailVerificationGate />}
    </div>
  );
};

const NavSlot = ({
  to, end, label, icon: Icon, badge, badgeCount, isReels,
}: {
  to: string;
  end?: boolean;
  label: string;
  icon: any;
  badge?: boolean;
  badgeCount?: number;
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
          badgeCount && badgeCount > 0 ? (
            <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center ring-2 ring-background">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          )
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
