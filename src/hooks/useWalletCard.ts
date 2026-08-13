import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthProvider";

export type CardType = "standard" | "verified" | "creator" | "organization" | "premium" | "founder" | "internal";
export type CardTheme = "standard" | "creator" | "premium" | "elite" | "founder" | "organization" | "internal" | "holiday" | "anniversary" | "limited";
export type BadgeKind =
  | "verified" | "creator" | "premium" | "organization" | "early_supporter"
  | "top_creator" | "top_earner" | "community_leader" | "founder" | "internal";

export type WalletCardRecord = {
  id: string;
  version: number;
  card_type: CardType;
  theme: CardTheme;
  security_status: "secure" | "review_recommended" | "refresh_recommended";
  encryption: string;
  issued_at: string;
  refresh_due_at: string;
  refresh_reason: string | null;
};

export type CardHistoryRow = {
  version: number; card_type: CardType; theme: CardTheme;
  issued_at: string; retired_at: string | null; refresh_reason: string | null; is_current: boolean;
};

export type SecurityReview = {
  score: number;
  grade: "Excellent" | "Good" | "Average" | "Weak";
  checks: Record<string, boolean | number>;
  reviewed_at: string;
  next_due_at: string;
  due: boolean;
};

export type WalletCardState = {
  card: WalletCardRecord;
  themes: CardTheme[];
  badges: BadgeKind[];
  history: CardHistoryRow[];
  review: SecurityReview | null;
};

export function useWalletCard() {
  const { user } = useAuth();
  const [state, setState] = useState<WalletCardState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setState(null); setLoading(false); return; }
    setState((data as unknown as WalletCardState) ?? null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const refreshCard = useCallback(async (reason: string) => {
    if (!error) await load();
    return { data, error };
  }, [load]);

  const setTheme = useCallback(async (theme: CardTheme) => {
    if (!error) await load();
    return { error };
  }, [load]);

  const runReview = useCallback(async (force = true) => {
    if (!error) await load();
    return { data, error };
  }, [load]);

  return { state, loading, reload: load, refreshCard, setTheme, runReview };
}
