import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthProvider";

export function useCoinBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setBalance(0); setLoading(false); return; }
    
    try {
      // 1. Check Firestore (Primary)
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const snap = await getDoc(doc(db, "wallets", user.id));
      if (snap.exists()) {
        setBalance(snap.data().total || 0);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Firestore wallet fetch failed, falling back to legacy", e);
    }

    // 2. Legacy Supabase Fallback
      .from("profiles_private")
      .select("coin_balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setBalance((data as any)?.coin_balance ?? 0);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
      .channel(`coin-balance:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles_private", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
  }, [user?.id, refresh]);

  return { balance, loading, refresh };
}
