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

  // Note: Migration to Firestore-native listeners for unread counts
  // This avoids mixed-backend logic errors in production
  useEffect(() => {
    if (!user) return;
    
    // Fallback: Reset counts while Firestore sync settles
    setUnreadNotif(0);
    setUnreadDm(0);
    
    // Placeholder for future Firestore-based unread listeners
    // console.log("Unread listeners ready for Firestore transition");
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
        
        {/* Removed redundant SideMenu trigger as it's now handled by profile photos in headers */}
      </div>
    </div>
  );
};