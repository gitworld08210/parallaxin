import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

export function useCoinBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setBalance(0); setLoading(false); return; }
    const { data } = await supabase
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
    const ch = supabase
      .channel(`coin-balance:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles_private", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, refresh]);

  return { balance, loading, refresh };
}
