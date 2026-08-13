import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthProvider";

export type WalletBuckets = {
  purchased: number; reward: number; gift: number; ads: number;
  bonus: number; locked: number; pending: number; withdrawable: number;
};

export type WalletOverview = {
  id: string;
  wallet_id: string;
  handle: string;
  status: "active" | "pending" | "restricted" | "suspended" | "frozen" | "closed";
  version: string;
  trust_score: number;
  security_score: number;
  risk_level: "normal" | "medium" | "high" | "critical";
  created_at: string;
  shield_enabled: boolean;
  biometric_enabled: boolean;
  pin_enabled: boolean;
  alerts_enabled: boolean;
  balances: WalletBuckets;
  total: number;
  earned: number;
  spent: number;
};

export function useWalletOS() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setWallet(null); setLoading(false); return; }
    setLoading(true);

    try {
      // 1. Check Firestore
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const snap = await getDoc(doc(db, "wallets", user.id));
      if (snap.exists()) {
        setWallet(snap.data() as WalletOverview);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Firestore wallet overview fetch failed", e);
    }

    // 2. Legacy RPC Fallback
    const { data } = await supabase.rpc("wallet_overview" as never, { _user_id: user.id } as never);
    setWallet((data as unknown as WalletOverview) ?? null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  return { wallet, loading, refresh: load };
}

export type WalletTxn = {
  id: string;
  txn_id: string;
  direction: "credit" | "debit";
  bucket: keyof WalletBuckets;
  source: string;
  amount: number;
  fee: number;
  balance_after: number;
  status: string;
  label: string | null;
  created_at: string;
};

export function useWalletLedgerOS(limit = 50) {
  const { user } = useAuth();
  const [rows, setRows] = useState<WalletTxn[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);

    try {
      // 1. Firestore Ledger
      const { collection, query, where, orderBy, limit: fireLimit, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const q = query(
        collection(db, "ledger"),
        where("user_id", "==", user.id),
        orderBy("created_at", "desc"),
        fireLimit(limit)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setRows(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WalletTxn[]);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Firestore ledger fetch failed", e);
    }

    // 2. Supabase Fallback.
    const { data } = await supabase.from("wallet_ledger" as any).select("id, txn_id, direction, bucket, source, amount, fee, balance_after, status, label, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(limit);
    setRows((data as unknown as WalletTxn[]) ?? []);
    setLoading(false);
  }, [user?.id, limit]);

  useEffect(() => { load(); }, [load]);
  return { rows, loading, refresh: load };
}

export type WalletDay = { day: string; income: number; expense: number };

export function useWalletAnalytics(days = 30) {
  const { user } = useAuth();
  const [rows, setRows] = useState<WalletDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRows([]); setLoading(false); return; }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        // Firestore analytics usually requires pre-aggregated data or a cloud function
        // For now, check if 'wallet_analytics' collection exists or fall back
        const q = query(collection(db, "wallet_analytics"), where("user_id", "==", user.id));
        const snap = await getDocs(q);
        if (!snap.empty && alive) {
          setRows(snap.docs.map(doc => doc.data()) as WalletDay[]);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Firestore analytics fetch failed", e);
      }

      if (!alive) return;
      const { data } = await supabase.rpc("wallet_analytics" as never, { _user_id: user.id, _days: days } as never);
      setRows((data as unknown as WalletDay[]) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id, days]);

  return { rows, loading };
}
