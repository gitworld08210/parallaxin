import type { Metrics } from "@/hooks/ads/useAdsManager";

export type ColumnId =
  | "results" | "reach" | "impressions" | "frequency" | "clicks" | "ctr"
  | "cpc" | "cpm" | "spend" | "conversions" | "cpa" | "revenue" | "roas"
  | "budget" | "delivery" | "objective" | "bid_strategy" | "created";

export interface ColumnDef {
  id: ColumnId;
  label: string;
  group: "Performance" | "Delivery" | "Cost" | "Conversions" | "Setup";
  align?: "left" | "right";
  width: number;
  /** Numeric metric accessor — omitted for entity-derived columns. */
  metric?: (m: Metrics) => number;
  format?: (v: number) => string;
  /** Entity-derived cell text. */
  entity?: (row: any) => string;
}

const inr = (v: number) =>
  "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: v < 100 ? 2 : 0 });
const num = (v: number) => v.toLocaleString("en-IN");
const pct = (v: number) => `${v.toFixed(2)}%`;
const x = (v: number) => `${v.toFixed(2)}x`;

export const COLUMNS: ColumnDef[] = [
  { id: "results", label: "Results", group: "Performance", align: "right", width: 96, metric: (m) => m.conversions, format: num },
  { id: "reach", label: "Reach", group: "Performance", align: "right", width: 104, metric: (m) => m.reach, format: num },
  { id: "impressions", label: "Impressions", group: "Performance", align: "right", width: 116, metric: (m) => m.impressions, format: num },
  { id: "frequency", label: "Frequency", group: "Delivery", align: "right", width: 100, metric: (m) => (m.reach ? m.impressions / m.reach : 0), format: (v) => v.toFixed(2) },
  { id: "clicks", label: "Clicks", group: "Performance", align: "right", width: 92, metric: (m) => m.clicks, format: num },
  { id: "ctr", label: "CTR", group: "Performance", align: "right", width: 84, metric: (m) => m.ctr, format: pct },
  { id: "cpc", label: "CPC", group: "Cost", align: "right", width: 92, metric: (m) => m.cpc, format: inr },
  { id: "cpm", label: "CPM", group: "Cost", align: "right", width: 92, metric: (m) => m.cpm, format: inr },
  { id: "spend", label: "Amount spent", group: "Cost", align: "right", width: 120, metric: (m) => m.spend, format: inr },
  { id: "conversions", label: "Conversions", group: "Conversions", align: "right", width: 112, metric: (m) => m.conversions, format: num },
  { id: "cpa", label: "Cost / result", group: "Conversions", align: "right", width: 116, metric: (m) => m.cpa, format: inr },
  { id: "revenue", label: "Revenue", group: "Conversions", align: "right", width: 110, metric: (m) => m.revenue, format: inr },
  { id: "roas", label: "ROAS", group: "Conversions", align: "right", width: 88, metric: (m) => m.roas, format: x },
  { id: "budget", label: "Budget", group: "Setup", align: "right", width: 110, entity: (r) => (r.daily_budget ? `₹${Number(r.daily_budget).toLocaleString("en-IN")}/day` : r.total_budget ? `₹${Number(r.total_budget).toLocaleString("en-IN")} total` : "—") },
  { id: "objective", label: "Objective", group: "Setup", width: 130, entity: (r) => String(r.objective ?? r.optimization_goal ?? r.format ?? "—").replace(/_/g, " ") },
  { id: "bid_strategy", label: "Bid strategy", group: "Setup", width: 130, entity: (r) => String(r.bid_strategy ?? "—").replace(/_/g, " ") },
  { id: "delivery", label: "Delivery", group: "Delivery", width: 130, entity: (r) => deliveryLabel(r) },
  { id: "created", label: "Created", group: "Setup", width: 110, entity: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—") },
];

export const COLUMN_MAP = Object.fromEntries(COLUMNS.map((c) => [c.id, c])) as Record<ColumnId, ColumnDef>;

export const PRESETS: { name: string; columns: ColumnId[] }[] = [
  { name: "Performance", columns: ["results", "reach", "impressions", "clicks", "ctr", "cpa", "spend"] },
  { name: "Delivery", columns: ["delivery", "reach", "impressions", "frequency", "cpm", "spend", "budget"] },
  { name: "Engagement", columns: ["impressions", "clicks", "ctr", "cpc", "spend"] },
  { name: "Conversions", columns: ["conversions", "cpa", "revenue", "roas", "spend"] },
  { name: "Cost per result", columns: ["results", "cpa", "cpc", "cpm", "spend", "budget"] },
  { name: "Setup", columns: ["objective", "bid_strategy", "budget", "created", "spend"] },
];

export function deliveryLabel(row: any): string {
  const s = String(row.status ?? "");
  if (s === "running" || s === "active") return "Active";
  if (s === "paused") return "Paused";
  if (s === "draft") return "Draft";
  if (s === "pending_review" || row.review_state === "pending") return "In review";
  if (s === "rejected" || row.review_state === "rejected") return "Rejected";
  if (s === "completed") return "Completed";
  if (s === "archived") return "Archived";
  if (s === "approved") return "Ready";
  return s.replace(/_/g, " ") || "—";
}

export function deliveryTone(row: any): string {
  const l = deliveryLabel(row);
  if (l === "Active") return "text-emerald-600 dark:text-emerald-400";
  if (l === "Rejected") return "text-destructive";
  if (l === "In review") return "text-amber-600 dark:text-amber-400";
  if (l === "Paused") return "text-muted-foreground";
  return "text-muted-foreground";
}

export function cellValue(col: ColumnDef, row: any, m: Metrics): string {
  if (col.entity) return col.entity(row);
  if (col.metric) return (col.format ?? num)(col.metric(m));
  return "—";
}
