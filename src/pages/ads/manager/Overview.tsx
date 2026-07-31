import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
} from "recharts";
import { Sparkles, RefreshCw, Plus, ArrowUpRight } from "lucide-react";
import {
  resolvePreset, previousRange, useMetrics, useTimeseries, useSurfaceBreakdown, useLevelRows,
  useRecommendations, useGenerateRecommendations, useUpdateRecommendation,
} from "@/hooks/ads/useAdsManager";
import { useResolvedAdvertiser, Panel, Stat, StatusDot, inr, num, pct, mult, surfaceLabel } from "./shared";

export default function Overview() {
  const { advertiserId, advertiser } = useResolvedAdvertiser();
  const range = useMemo(() => resolvePreset("last_30"), []);
  const prev = useMemo(() => previousRange(range), [range]);

  const { data: series = [] } = useTimeseries(advertiserId, range);
  const { data: breakdown = [] } = useSurfaceBreakdown(advertiserId, range);
  const { data: campaigns = [] } = useLevelRows(advertiserId, "campaign");
  const { data: metrics = {} } = useMetrics(advertiserId, "campaign", range);
  const { data: prevMetrics = {} } = useMetrics(advertiserId, "campaign", prev);
  const { data: recs = [] } = useRecommendations(advertiserId);
  const generate = useGenerateRecommendations();
  const updateRec = useUpdateRecommendation();

  const sum = (m: Record<string, any>) =>
    Object.values(m).reduce(
      (a: any, v: any) => ({
        spend: a.spend + v.spend, clicks: a.clicks + v.clicks, impressions: a.impressions + v.impressions,
        conversions: a.conversions + v.conversions, revenue: a.revenue + v.revenue,
      }),
      { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 },
    );

  const t = sum(metrics);
  const p = sum(prevMetrics);
  const delta = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const row of campaigns as any[]) c[row.status] = (c[row.status] ?? 0) + 1;
    return c;
  }, [campaigns]);

  const topCampaigns = useMemo(
    () =>
      [...(campaigns as any[])]
        .map((c) => ({ ...c, m: metrics[c.id] }))
        .filter((c) => c.m)
        .sort((a, b) => b.m.spend - a.m.spend)
        .slice(0, 5),
    [campaigns, metrics],
  );

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-base font-semibold">Overview</h1>
          <p className="text-xs text-muted-foreground">
            {advertiser?.display_name ?? "Ad account"} · last 30 days
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => advertiserId && generate.mutate({ advertiserId, range })}
            disabled={generate.isPending}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs"
          >
            {generate.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI insights
          </button>
          <Link to="/ads/manager/create" className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Create
          </Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Amount spent" value={inr(t.spend)} delta={delta(t.spend, p.spend)} sub="vs prev. period" />
        <Stat label="Impressions" value={num(t.impressions)} delta={delta(t.impressions, p.impressions)} sub="vs prev. period" />
        <Stat label="Link clicks" value={num(t.clicks)} delta={delta(t.clicks, p.clicks)} sub="vs prev. period" />
        <Stat label="Results" value={num(t.conversions)} delta={delta(t.conversions, p.conversions)} sub="vs prev. period" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Performance" className="lg:col-span-2">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="spend" stroke="hsl(var(--primary))" fill="url(#spendFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 text-xs">
            <div><p className="text-muted-foreground">CTR</p><p className="font-semibold tabular-nums">{pct(t.impressions ? (t.clicks / t.impressions) * 100 : 0)}</p></div>
            <div><p className="text-muted-foreground">Cost per result</p><p className="font-semibold tabular-nums">{inr(t.conversions ? t.spend / t.conversions : 0)}</p></div>
            <div><p className="text-muted-foreground">ROAS</p><p className="font-semibold tabular-nums">{mult(t.spend ? t.revenue / t.spend : 0)}</p></div>
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel title="Campaign status">
            <div className="space-y-2">
              {["running", "paused", "draft", "pending_review", "completed"].map((s) => (
                <div key={s} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 capitalize text-muted-foreground">
                    <StatusDot tone={s === "running" ? "active" : s === "pending_review" ? "learning" : "inactive"} />
                    {s.replace(/_/g, " ")}
                  </span>
                  <span className="font-semibold tabular-nums">{statusCounts[s] ?? 0}</span>
                </div>
              ))}
            </div>
            <Link to="/ads/manager/campaigns" className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
              View all campaigns <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Panel>

          <Panel title="Delivery by placement">
            {breakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">No delivery data in this period yet.</p>
            ) : (
              <div className="space-y-2">
                {breakdown.map((b: any) => {
                  const share = t.spend ? (b.spend / t.spend) * 100 : 0;
                  return (
                    <div key={b.surface}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{surfaceLabel(b.surface)}</span>
                        <span className="tabular-nums">{inr(b.spend)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, share)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {recs.length > 0 && (
        <Panel title="AI recommendations">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {recs.slice(0, 6).map((r: any) => (
              <div key={r.id} className="rounded-xl border border-border p-3">
                <p className="text-xs font-semibold">{r.title}</p>
                <p className="mt-1 line-clamp-3 text-[11px] text-muted-foreground">{r.detail}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase text-muted-foreground">Impact {r.impact_score}</span>
                  <div className="flex gap-2">
                    <button onClick={() => updateRec.mutate({ id: r.id, state: "dismissed" })} className="text-[11px] text-muted-foreground">Dismiss</button>
                    <button onClick={() => updateRec.mutate({ id: r.id, state: "applied" })} className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Mark done</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Top campaigns by spend">
        {topCampaigns.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No campaigns with delivery yet. <Link to="/ads/manager/create" className="text-primary">Create your first campaign</Link>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border text-left">
                  <th className="py-1.5 font-medium">Campaign</th>
                  <th className="py-1.5 text-right font-medium">Spend</th>
                  <th className="py-1.5 text-right font-medium">Impr.</th>
                  <th className="py-1.5 text-right font-medium">CTR</th>
                  <th className="py-1.5 text-right font-medium">Results</th>
                  <th className="py-1.5 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="max-w-[240px] truncate py-2">{c.name}</td>
                    <td className="py-2 text-right tabular-nums">{inr(c.m.spend)}</td>
                    <td className="py-2 text-right tabular-nums">{num(c.m.impressions)}</td>
                    <td className="py-2 text-right tabular-nums">{pct(c.m.ctr)}</td>
                    <td className="py-2 text-right tabular-nums">{num(c.m.conversions)}</td>
                    <td className="py-2 text-right tabular-nums">{mult(c.m.roas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
