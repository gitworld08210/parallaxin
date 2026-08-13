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
      const { count } = await supabase.from("notifications")
        supabase.select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("read", false);
      setUnreadNotif(count ?? 0);
    };
    refresh();
    const chan = supabase.channel("app-shell-notifs")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      const { data: parts } = await supabase.from("conversation_participants")
        supabase.select("conversation_id").eq("user_id", user.id);
      const ids = (parts ?? []).map((p) => p.conversation_id);
      if (!ids.length) { setUnreadDm(0); return; }
      const { count } = await supabase.from("messages")
        supabase.select("*", { count: "exact", head: true })
        .in("conversation_id", ids)
        .neq("sender_id", user.id)
        .is("read_at", null);
      setUnreadDm(count ?? 0);
    };
    refresh();
    const chan = supabase.channel("app-shell-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .subscribe();
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

  const hideNav = ["/auth", "/onboarding"].some((p) => loc.pathname.startsWith(p));
  if (hideNav) return <Outlet />;

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {isDesktop && <SideMenu unreadNotif={unreadNotif} unreadDm={unreadDm} />}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 relative outline-none border-x border-border/40">
        <Outlet />
      </main>
      {!isDesktop && <MobileNav unreadNotif={unreadNotif} unreadDm={unreadDm} />}
    </div>
  );
};