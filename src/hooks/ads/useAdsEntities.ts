import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Campaign = {
  id: string;
  account_id: string;
  name: string;
  objective: string;
  status: string;
  budget_type: string;
  budget_coins: number;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
};

export type AdSet = {
  id: string;
  campaign_id: string;
  account_id: string;
  name: string;
  status: string;
  daily_budget_coins: number;
  optimization_goal: string;
  bid_strategy: string;
  placement_mode: string;
  placements: string[];
  targeting: any;
  estimated_reach: number;
  created_at: string;
};

export type AdRow = {
  id: string;
  adset_id: string;
  account_id: string;
  creative_id: string | null;
  name: string;
  headline: string | null;
  primary_text: string | null;
  cta: string;
  destination_url: string | null;
  status: string;
  review_state: string;
  review_reason: string | null;
  created_at: string;
};

export type Creative = {
  id: string;
  account_id: string;
  name: string;
  media_type: "image" | "video";
  storage_path: string;
  aspect_ratio: string;
  duration_seconds: number | null;
  created_at: string;
};

export type StatTotals = {
  impressions: number;
  clicks: number;
  conversions: number;
  spend_coins: number;
  ctr: number;
  cpm: number;
  cpc: number;
};

export function useAdsEntities(accountId?: string) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adsets, setAdsets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const [c, s, a] = await Promise.all([
      supabase.from("ads_campaigns").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
      supabase.from("ads_adsets").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
      supabase.from("ads_ads").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
    ]);
    setCampaigns((c.data ?? []) as Campaign[]);
    setAdsets((s.data ?? []) as AdSet[]);
    setAds((a.data ?? []) as AdRow[]);
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = useCallback(
    async (level: "campaign" | "adset" | "ad", id: string, status: string) => {
      const table = level === "campaign" ? "ads_campaigns" : level === "adset" ? "ads_adsets" : "ads_ads";
      const { error } = await supabase.from(table as any).update({ status }).eq("id", id);
      if (error) throw error;
      await load();
    },
    [load],
  );

  const updateBudget = useCallback(
    async (level: "campaign" | "adset", id: string, coins: number) => {
      const patch = level === "campaign" ? { budget_coins: coins } : { daily_budget_coins: coins };
      const table = level === "campaign" ? "ads_campaigns" : "ads_adsets";
      const { error } = await supabase.from(table as any).update(patch).eq("id", id);
      if (error) throw error;
      await load();
    },
    [load],
  );

  return { campaigns, adsets, ads, loading, reload: load, setStatus, updateBudget };
}

export function useAdsStats(accountId?: string, from?: string, to?: string) {
  const [totals, setTotals] = useState<StatTotals | null>(null);
  const [series, setSeries] = useState<{ date: string; impressions: number; clicks: number; spend: number }[]>([]);
  const [byPlacement, setByPlacement] = useState<{ placement: string; impressions: number; clicks: number; spend: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId || !from || !to) return;
    setLoading(true);
    const [summary, rows] = await Promise.all([
      supabase.rpc("ads_account_summary", { _account_id: accountId, _from: from, _to: to }),
      supabase
        .from("ads_daily_stats")
        .select("stat_date, placement, impressions, clicks, spend_coins, conversions")
        .eq("account_id", accountId)
        .gte("stat_date", from)
        .lte("stat_date", to),
    ]);

    const t = (summary.data as any)?.[0];
    setTotals(
      t
        ? {
            impressions: Number(t.impressions),
            clicks: Number(t.clicks),
            conversions: Number(t.conversions),
            spend_coins: Number(t.spend_coins),
            ctr: Number(t.ctr),
            cpm: Number(t.cpm),
            cpc: Number(t.cpc),
          }
        : { impressions: 0, clicks: 0, conversions: 0, spend_coins: 0, ctr: 0, cpm: 0, cpc: 0 },
    );

    const byDate = new Map<string, { date: string; impressions: number; clicks: number; spend: number }>();
    const byPl = new Map<string, { placement: string; impressions: number; clicks: number; spend: number }>();
    (rows.data ?? []).forEach((r: any) => {
      const d = byDate.get(r.stat_date) ?? { date: r.stat_date, impressions: 0, clicks: 0, spend: 0 };
      d.impressions += Number(r.impressions);
      d.clicks += Number(r.clicks);
      d.spend += Number(r.spend_coins);
      byDate.set(r.stat_date, d);

      const p = byPl.get(r.placement) ?? { placement: r.placement, impressions: 0, clicks: 0, spend: 0 };
      p.impressions += Number(r.impressions);
      p.clicks += Number(r.clicks);
      p.spend += Number(r.spend_coins);
      byPl.set(r.placement, p);
    });

    setSeries([...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)));
    setByPlacement([...byPl.values()].sort((a, b) => b.impressions - a.impressions));
    setLoading(false);
  }, [accountId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return { totals, series, byPlacement, loading, reload: load };
}

export async function signedCreativeUrl(path: string): Promise<string | null> {
  // If it's a Cloudinary URL (starts with https://res.cloudinary.com), return as is
  if (path.startsWith("https://res.cloudinary.com")) return path;
  
  // Otherwise, handle legacy Supabase signed URLs
  const { data } = await supabase.storage.from("ads-creatives").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}


export function useCreatives(accountId?: string) {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data } = await supabase
      .from("ads_creatives")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Creative[];
    setCreatives(list);
    const entries = await Promise.all(
      list.map(async (c) => [c.id, (await signedCreativeUrl(c.storage_path)) ?? ""] as const),
    );
    setUrls(Object.fromEntries(entries));
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    load();
  }, [load]);

  return { creatives, urls, loading, reload: load };
}