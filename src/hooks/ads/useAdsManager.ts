import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

/* ------------------------------- date ranges ------------------------------- */

export type DatePresetKey =
  | "today" | "yesterday" | "last_7" | "last_14" | "last_30"
  | "this_month" | "last_month" | "lifetime" | "custom";

export interface DateRange { from: string; to: string; key: DatePresetKey }

const iso = (d: Date) => d.toISOString().slice(0, 10);
const shift = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

export const DATE_PRESETS: { key: DatePresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last_7", label: "Last 7 days" },
  { key: "last_14", label: "Last 14 days" },
  { key: "last_30", label: "Last 30 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "lifetime", label: "Lifetime" },
];

export function resolvePreset(key: DatePresetKey): DateRange {
  const now = new Date();
  switch (key) {
    case "today": return { key, from: iso(now), to: iso(now) };
    case "yesterday": return { key, from: iso(shift(-1)), to: iso(shift(-1)) };
    case "last_7": return { key, from: iso(shift(-6)), to: iso(now) };
    case "last_14": return { key, from: iso(shift(-13)), to: iso(now) };
    case "last_30": return { key, from: iso(shift(-29)), to: iso(now) };
    case "this_month": return { key, from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
    case "last_month": {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = new Date(now.getFullYear(), now.getMonth(), 0);
      return { key, from: iso(f), to: iso(t) };
    }
    case "lifetime": return { key, from: "2020-01-01", to: iso(now) };
    default: return { key: "last_30", from: iso(shift(-29)), to: iso(now) };
  }
}

/** Previous period of the same length, for compare mode. */
export function previousRange(r: DateRange): DateRange {
  const from = new Date(r.from);
  const to = new Date(r.to);
  const days = Math.max(1, Math.round((+to - +from) / 86400000) + 1);
  const pTo = new Date(from); pTo.setDate(pTo.getDate() - 1);
  const pFrom = new Date(pTo); pFrom.setDate(pFrom.getDate() - (days - 1));
  return { key: "custom", from: iso(pFrom), to: iso(pTo) };
}

/* --------------------------------- metrics --------------------------------- */

export type Level = "campaign" | "ad_group" | "ad";

export interface MetricRow {
  entity_id: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
}

export interface Metrics extends Omit<MetricRow, "entity_id"> {
  ctr: number; cpc: number; cpm: number; cpa: number; roas: number; reach: number;
}

export const EMPTY_METRICS: Metrics = {
  impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0,
  ctr: 0, cpc: 0, cpm: 0, cpa: 0, roas: 0, reach: 0,
};

export function derive(r: Partial<MetricRow>): Metrics {
  const impressions = Number(r.impressions ?? 0);
  const clicks = Number(r.clicks ?? 0);
  const conversions = Number(r.conversions ?? 0);
  const spend = Number(r.spend ?? 0);
  const revenue = Number(r.revenue ?? 0);
  return {
    impressions, clicks, conversions, spend, revenue,
    ctr: impressions ? (clicks / impressions) * 100 : 0,
    cpc: clicks ? spend / clicks : 0,
    cpm: impressions ? (spend / impressions) * 1000 : 0,
    cpa: conversions ? spend / conversions : 0,
    roas: spend ? revenue / spend : 0,
    reach: Math.round(impressions * 0.72), // modelled unique reach
  };
}

export const useMetrics = (
  advertiserId?: string,
  level: Level = "campaign",
  range?: DateRange,
  parentId?: string | null,
) =>
  useQuery({
    queryKey: ["aap", "metrics", advertiserId, level, range?.from, range?.to, parentId ?? null],
    enabled: !!advertiserId && !!range,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc("aap_report_rows", {
        _advertiser_id: advertiserId,
        _level: level,
        _from: range!.from,
        _to: range!.to,
        _parent_id: parentId ?? null,
      });
      if (error) throw error;
      const map: Record<string, Metrics> = {};
      for (const row of (data ?? []) as MetricRow[]) map[row.entity_id] = derive(row);
      return map;
    },
  });

export const useTimeseries = (
  advertiserId?: string,
  range?: DateRange,
  entityLevel: "account" | Level = "account",
  entityId?: string | null,
) =>
  useQuery({
    queryKey: ["aap", "ts", advertiserId, range?.from, range?.to, entityLevel, entityId ?? null],
    enabled: !!advertiserId && !!range,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc("aap_report_timeseries", {
        _advertiser_id: advertiserId,
        _from: range!.from,
        _to: range!.to,
        _entity_level: entityLevel,
        _entity_id: entityId ?? null,
      });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({ ...derive(d), day: d.day as string }));
    },
  });

export const useSurfaceBreakdown = (
  advertiserId?: string,
  range?: DateRange,
  entityLevel: "account" | Level = "account",
  entityId?: string | null,
) =>
  useQuery({
    queryKey: ["aap", "bd", advertiserId, range?.from, range?.to, entityLevel, entityId ?? null],
    enabled: !!advertiserId && !!range,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc("aap_report_breakdown", {
        _advertiser_id: advertiserId,
        _from: range!.from,
        _to: range!.to,
        _entity_level: entityLevel,
        _entity_id: entityId ?? null,
      });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({ surface: d.surface as string, ...derive(d) }));
    },
  });

/* ------------------------------- entity lists ------------------------------ */

export const useLevelRows = (advertiserId?: string, level: Level = "campaign", parentId?: string | null) =>
  useQuery({
    queryKey: ["aap", "rows", advertiserId, level, parentId ?? null],
    enabled: !!advertiserId,
    queryFn: async () => {
      const table = level === "campaign" ? "aap_campaigns" : level === "ad_group" ? "aap_ad_groups" : "aap_ads";
      let q = db.from(table).select("*").eq("advertiser_id", advertiserId!);
      if (parentId && level === "ad_group") q = q.eq("campaign_id", parentId);
      if (parentId && level === "ad") q = q.eq("ad_group_id", parentId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/* ------------------------------ bulk mutations ----------------------------- */

const tableFor = (level: Level) =>
  level === "campaign" ? "aap_campaigns" : level === "ad_group" ? "aap_ad_groups" : "aap_ads";

export const useBulkUpdate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ level, ids, patch }: { level: Level; ids: string[]; patch: Record<string, any> }) => {
      const { error } = await db.from(tableFor(level)).update(patch).in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["aap"] });
      toast.success(`${n} item${n === 1 ? "" : "s"} updated`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });
};

export const useBulkDelete = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ level, ids }: { level: Level; ids: string[] }) => {
      const { error } = await db.from(tableFor(level)).delete().in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["aap"] });
      toast.success(`${n} deleted`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });
};

export const useDuplicate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ level, rows }: { level: Level; rows: any[] }) => {
      const clones = rows.map((r) => {
        const { id, created_at, updated_at, spent, submitted_at, approved_at, rejected_at, ...rest } = r;
        return { ...rest, name: `${r.name} (copy)`, status: "draft" };
      });
      const { error } = await db.from(tableFor(level)).insert(clones);
      if (error) throw error;
      return clones.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["aap"] });
      toast.success(`${n} duplicated`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Duplicate failed"),
  });
};

/* -------------------------------- saved views ------------------------------ */

export const useSavedViews = (advertiserId?: string, level?: Level) =>
  useQuery({
    queryKey: ["aap", "saved_views", advertiserId, level],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await db
        .from("aap_saved_views").select("*")
        .eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((v: any) => !level || v.level === level);
    },
  });

export const useSaveView = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { advertiser_id: string; name: string; level: Level; state: any; is_shared?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await db.from("aap_saved_views").insert({ ...input, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "saved_views"] });
      toast.success("View saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save view"),
  });
};

export const useDeleteView = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("aap_saved_views").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aap", "saved_views"] }),
  });
};

/* ---------------------------------- rules ---------------------------------- */

export const useRules = (advertiserId?: string) =>
  useQuery({
    queryKey: ["aap", "rules", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await db
        .from("aap_rules").select("*").eq("advertiser_id", advertiserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (rule.id) {
        const { id, ...patch } = rule;
        const { error } = await db.from("aap_rules").update(patch).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("aap_rules").insert({ ...rule, created_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "rules"] });
      toast.success("Rule saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save rule"),
  });
};

export const useDeleteRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("aap_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aap", "rules"] });
      toast.success("Rule deleted");
    },
  });
};

/* ------------------------------ recommendations ---------------------------- */

export const useRecommendations = (advertiserId?: string) =>
  useQuery({
    queryKey: ["aap", "recs", advertiserId],
    enabled: !!advertiserId,
    queryFn: async () => {
      const { data, error } = await db
        .from("aap_recommendations").select("*")
        .eq("advertiser_id", advertiserId!)
        .neq("state", "dismissed")
        .order("impact_score", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useGenerateRecommendations = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ advertiserId, range }: { advertiserId: string; range: DateRange }) => {
      const { data, error } = await supabase.functions.invoke("aap-recommendations", {
        body: { advertiser_id: advertiserId, from: range.from, to: range.to },
      });
      if (error) {
        const detail = (error as any)?.context?.text ? await (error as any).context.text() : error.message;
        throw new Error(detail);
      }
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["aap", "recs"] });
      toast.success(`${d?.count ?? 0} recommendations ready`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not generate recommendations"),
  });
};

export const useUpdateRecommendation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, state }: { id: string; state: "applied" | "dismissed" | "new" }) => {
      const patch: any = { state };
      if (state === "applied") patch.applied_at = new Date().toISOString();
      const { error } = await db.from("aap_recommendations").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aap", "recs"] }),
  });
};
