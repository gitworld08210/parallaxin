import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

export type AdsAccount = {
  id: string;
  owner_user_id: string;
  name: string;
  business_type: string;
  website: string | null;
  timezone: string;
  currency: string;
  status: string;
  created_at: string;
};

const LAST_KEY = "aurelix.ads.lastAccount";

export function useAdsAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AdsAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("ads_accounts")
      .select("*")
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error("Error loading ads accounts:", error);
      setAccounts([]);
    } else {
      setAccounts((data ?? []) as AdsAccount[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const createAccount = useCallback(
    async (input: { name: string; business_type: string; website?: string }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("ads_accounts")
        .insert({
          owner_user_id: user.id,
          name: input.name,
          business_type: input.business_type,
          website: input.website || null,
        })
        .select()
        .single();
      if (error) throw error;
      await load();
      localStorage.setItem(LAST_KEY, data.id);
      return data as AdsAccount;
    },
    [user?.id, load],
  );

  return { accounts, loading, reload: load, createAccount };
}

export function rememberAccount(id: string) {
  localStorage.setItem(LAST_KEY, id);
}

export function lastAccount(): string | null {
  return localStorage.getItem(LAST_KEY);
}

export function useIsAdsStaff() {
  const { user } = useAuth();
  const [state, setState] = useState({ finance: false, reviewer: false, loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) {
        setState({ finance: false, reviewer: false, loading: false });
        return;
      }
      const [fin, rev] = await Promise.all([
        supabase.rpc("ads_is_finance"),
        supabase.rpc("ads_is_reviewer"),
      ]);
      if (!alive) return;
      setState({ finance: !!fin.data, reviewer: !!rev.data, loading: false });
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return state;
}
