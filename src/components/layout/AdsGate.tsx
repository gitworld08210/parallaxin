import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

/**
 * AdsGate — allows access to /ads/* to:
 *  - AAP staff (Founder Office / Finance / Engineering / T&S, via aap_is_staff)
 *  - Members of any advertiser (aap_advertiser_members)
 *  - Anyone signed-in for the /ads/get-started onboarding path
 */
export const AdsGate = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<"loading" | "allow" | "onboard">("loading");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setState("onboard"); return; }
    let cancelled = false;
    (async () => {
      const [{ data: staff }, { data: memberships }] = await Promise.all([
        supabase.rpc("aap_is_staff" as any),
        supabase.from("aap_advertiser_members").select("advertiser_id").limit(1),
      ]);
      if (cancelled) return;
      if (staff === true || (memberships && memberships.length > 0)) setState("allow");
      else setState("onboard");
    })();
    return () => { cancelled = true; };
  }, [user?.id, authLoading]);

  if (authLoading || state === "loading") {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  if (state === "onboard" && !location.pathname.startsWith("/ads/get-started")) {
    return <Navigate to="/ads/get-started" replace />;
  }
  return <>{children}</>;
};

export default AdsGate;
