import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { collection, query, where, orderBy, limit as firestoreLimit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type LedgerRow = {
  id: string;
  kind: "coin" | "tip_sent" | "tip_received" | "gift_sent" | "gift_received" | "unlock" | "payout" | "topup";
  label: string;
  amount: number; // + credit, - debit; coins for coin rows, INR paise otherwise
  currency: "coins" | "inr";
  status?: string;
  created_at: string;
};

export function useWalletLedger(limit = 40) {
  const { user } = useAuth();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const uid = user.id;

    const [coinTxns, tipsSent, tipsRecv, giftsSent, unlocks, payouts, topups] = await Promise.all([
      supabase.from("coin_transactions" as any).select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(limit),
      supabase.from("tips" as any).select("*").eq("sender_id", uid).order("created_at", { ascending: false }).limit(limit),
      supabase.from("tips" as any).select("*").eq("recipient_id", uid).order("created_at", { ascending: false }).limit(limit),
      supabase.from("live_gifts" as any).select("*").eq("sender_id", uid).order("created_at", { ascending: false }).limit(limit),
      supabase.from("post_unlocks" as any).select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(limit),
      supabase.from("creator_payout_requests" as any).select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(limit),
      supabase.from("coin_topups" as any).select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(limit),
    ]);

    const out: LedgerRow[] = [];
    (coinTxns.data ?? []).forEach((r: any) => out.push({
      id: `coin-${r.id}`, kind: "coin",
      label: r.kind === "purchase" ? "Coins purchased" : r.kind === "subscription" ? "Creator subscription" : r.kind === "gift" ? "Gift sent" : r.kind,
      amount: r.amount, currency: "coins", created_at: r.created_at,
    }));
    (tipsSent.data ?? []).forEach((r: any) => out.push({
      id: `ts-${r.id}`, kind: "tip_sent", label: "Tip sent",
      amount: -r.amount_cents, currency: "inr", status: r.status, created_at: r.created_at,
    }));
    (tipsRecv.data ?? []).forEach((r: any) => out.push({
      id: `tr-${r.id}`, kind: "tip_received", label: "Tip received",
      amount: r.net_cents, currency: "inr", status: r.status, created_at: r.created_at,
    }));
    (giftsSent.data ?? []).forEach((r: any) => out.push({
      id: `gs-${r.id}`, kind: "gift_sent", label: "Live gift sent",
      amount: -r.coins_total, currency: "coins", created_at: r.created_at,
    }));
    (unlocks.data ?? []).forEach((r: any) => out.push({
      id: `u-${r.id}`, kind: "unlock", label: "Post unlocked",
      amount: -r.amount_cents, currency: "inr", status: r.status, created_at: r.created_at,
    }));
    (payouts.data ?? []).forEach((r: any) => out.push({
      id: `p-${r.id}`, kind: "payout", label: "Payout",
      amount: -r.amount_cents, currency: "inr", status: r.status, created_at: r.created_at,
    }));
    (topups.data ?? []).forEach((r: any) => out.push({
      id: `t-${r.id}`, kind: "topup",
      label: r.status === "approved" ? `Top-up ${r.coins} coins` : `Top-up ${r.coins} coins (${r.status.replace("_"," ")})`,
      amount: r.status === "approved" ? r.coins : 0, currency: "coins", status: r.status, created_at: r.created_at,
    }));

    out.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    setRows(out.slice(0, limit));
    setLoading(false);
  }, [user?.id, limit]);

  useEffect(() => { load(); }, [load]);
  return { rows, loading, refresh: load };
}
