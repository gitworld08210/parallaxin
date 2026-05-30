import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

interface SubscriptionRow {
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  stripe_customer_id: string;
}

export function useSubscription(userId?: string) {
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setSub(null); setLoading(false); return; }
    let cancelled = false;
    const env = (() => { try { return getStripeEnvironment(); } catch { return null; } })();

    async function fetchSub() {
      if (!env) { setLoading(false); return; }
      const { data } = await supabase
        .from("subscriptions")
        .select("status, price_id, current_period_end, cancel_at_period_end, stripe_customer_id")
        .eq("user_id", userId)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) { setSub(data as SubscriptionRow | null); setLoading(false); }
    }

    fetchSub();
    const channel = supabase
      .channel(`sub-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` }, fetchSub)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [userId]);

  const now = Date.now();
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const isActive = !!sub && (
    (["active", "trialing", "past_due"].includes(sub.status) && (!periodEnd || periodEnd > now)) ||
    (sub.status === "canceled" && periodEnd !== null && periodEnd > now)
  );
  const tier: 'free' | 'premium' | 'pro' = !isActive
    ? 'free'
    : sub?.price_id === 'aurelix_pro_monthly' ? 'pro'
    : sub?.price_id === 'aurelix_premium_monthly' ? 'premium'
    : 'free';

  return { subscription: sub, isActive, tier, loading };
}
