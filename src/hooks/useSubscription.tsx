import { useEffect, useState } from "react";


interface SubscriptionRow {
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  stripe_customer_id: string;
}

// Subscriptions are not active in the UPI/QR-only flow. This hook returns
// a no-op shape so callers keep compiling. Re-enable when an automated
// recurring-payment provider is integrated.
export function useSubscription(_userId?: string) {
  const [sub] = useState<SubscriptionRow | null>(null);
  return { subscription: sub, isActive: false, tier: 'free' as const, loading: false };
}
