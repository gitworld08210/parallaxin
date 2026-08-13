import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SideMenu } from "@/components/layout/SideMenu";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthProvider";
import { useMediaQuery } from "@/hooks/use-media-query";
import { supabase } from "@/integrations/supabase/client";

export const AppShell = () => {
  const { user } = useAuth();
  const loc = useLocation();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadDm, setUnreadDm] = useState(0);

  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false);
      setUnreadNotif(count ?? 0);
    };
    refresh();
    const chan = supabase.channel("app-shell-notifs").
on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, refresh).
subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      const { data: parts } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", user.id);
      const ids = (parts ?? []).map((p) => p.conversation_id);
      if (!ids.length) { setUnreadDm(0); return; }
      const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).in("conversation_id", ids).neq("sender_id", user.id).is("read_at", null);
      setUnreadDm(count ?? 0);
    };
    refresh();
    const chan = supabase.channel("app-shell-messages").
on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh).
subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const tick = () => {
      if (document.visibilityState === "visible") {
        supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
      }
    };
    const inv = setInterval(tick, 60000);
    tick();
    return () => clearInterval(inv);
  }, [user?.id]);

  const hideNav = ["/auth", "/onboarding", "/profile-creation"].some((p) => loc.pathname.startsWith(p));
  if (hideNav) return <Outlet />;

  return (
    <div className="min-h-screen bg-[#050505] text-foreground flex justify-center items-center overflow-hidden p-0 sm:p-4 font-sans selection:bg-sky-500/30">
      <div className="w-full h-full sm:h-[844px] max-w-[440px] aspect-[9/19.5] relative flex flex-col bg-black shadow-[0_0_80px_rgba(0,0,0,0.5)] border-x border-white/5 sm:rounded-[3rem] sm:border-[12px] sm:border-zinc-900 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-2xl z-50 hidden sm:block" />
        <main className="flex-1 overflow-y-auto relative outline-none no-scrollbar">
          <Outlet />
        </main>
        <MobileNav unreadNotif={unreadNotif} unreadDm={unreadDm} />
      </div>
    </div>
  );
};