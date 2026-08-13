import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthProvider";

export type SubSettings = {
  creator_id: string;
  enabled: boolean;
  monthly_price_coins: number;
  monthly_price_inr_cents: number;
  perks: string[];
};

export type MySubscription = {
  id: string;
  creator_id: string;
  status: string;
  price_coins: number;
  current_period_end: string;
  cancel_at_period_end: boolean;
};

export function useCreatorSubscription(creatorId: string | null | undefined) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SubSettings | null>(null);
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!creatorId) { setLoading(false); return; }
    setLoading(true);
    const [s, sub] = await Promise.all([
      supabase.from("creator_subscription_settings" as any).select("*").eq("creator_id", creatorId).maybeSingle(),
      user
        ? supabase.from("creator_subscriptions" as any).select("*").eq("creator_id", creatorId).eq("subscriber_id", user.uid).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setSettings((s.data as any) ?? null);
    setSubscription((sub.data as any) ?? null);
    setLoading(false);
  }, [creatorId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const isSubscribed = !!subscription && subscription.status === "active" && new Date(subscription.current_period_end) > new Date();

  return { settings, subscription, isSubscribed, loading, refresh: load };
}

export function useMySubscriptions() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setSubs([]); setLoading(false); return; }
    const { data } = await supabase.from("creator_subscriptions" as any).select("*, creator:profiles!creator_subscriptions_creator_id_fkey(username, display_name, avatar_url)").eq("subscriber_id", user.id).order("current_period_end", { ascending: false });
    setSubs((data as any) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  return { subs, loading, refresh: load };
}
