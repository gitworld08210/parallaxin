import { useMemo, useState } from "react";
import { resolvePreset, useTimeseries, useSurfaceBreakdown, useLevelRows, useMetrics } from "@/hooks/ads/useAdsManager";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useResolvedAdvertiser, Panel, inr, num, pct, mult, surfaceLabel } from "./shared";

export default function ReportsPanel() {
  const { advertiserId } = useResolvedAdvertiser();
  const [preset, setPreset] = useState<"last_7" | "last_30" | "this_month">("last_30");
  const range = useMemo(() => resolvePreset(preset), [preset]);

  const { data: series = [] } = useTimeseries(advertiserId, range);
  const { data: breakdown = [] } = useSurfaceBreakdown(advertiserId, range);
  const { data: campaigns = [] } = useLevelRows(advertiserId, "campaign");
  const { data: metrics = {} } = useMetrics(advertiserId, "campaign", range);

  const rows = (campaigns as any[]).map((c) => ({ ...c, m: metrics[c.id] })).filter((c) => c.m);

  const exportCsv = () => {
    const header = ["Campaign", "Spend", "Impressions", "Clicks", "CTR", "Results", "ROAS"];
    const body = rows.map((r) => [r.name, r.m.spend, r.m.impressions, r.m.clicks, r.m.ctr.toFixed(2), r.m.conversions, r.m.roas.toFixed(2)]);
    const csv = [header, ...body].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `aurelix-ads-${range.from}-to-${range.to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-base font-semibold">Reports</h1>
          <p className="text-xs text-muted-foreground">{range.from} → {range.to}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select value={preset} onChange={(e) => setPreset(e.target.value as any)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs">
            <option value="last_7">Last 7 days</option>
            <option value="last_30">Last 30 days</option>
            <option value="this_month">This month</option>
          </select>
          <button onClick={exportCsv} className="rounded-xl border border-border px-3 py-2 text-xs">Export CSV</button>
        </div>
      </header>

      <Panel title="Trend">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="spend" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="clicks" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Campaign performance">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border text-left">
                <th className="py-1.5 font-medium">Campaign</th>
                <th className="py-1.5 text-right font-medium">Spend</th>
                <th className="py-1.5 text-right font-medium">Impressions</th>
                <th className="py-1.5 text-right font-medium">Clicks</th>
                <th className="py-1.5 text-right font-medium">CTR</th>
                <th className="py-1.5 text-right font-medium">CPC</th>
                <th className="py-1.5 text-right font-medium">Results</th>
                <th className="py-1.5 text-right font-medium">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">No data in this period.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="max-w-[240px] truncate py-2">{r.name}</td>
                  <td className="py-2 text-right tabular-nums">{inr(r.m.spend)}</td>
                  <td className="py-2 text-right tabular-nums">{num(r.m.impressions)}</td>
                  <td className="py-2 text-right tabular-nums">{num(r.m.clicks)}</td>
                  <td className="py-2 text-right tabular-nums">{pct(r.m.ctr)}</td>
                  <td className="py-2 text-right tabular-nums">{inr(r.m.cpc)}</td>
                  <td className="py-2 text-right tabular-nums">{num(r.m.conversions)}</td>
                  <td className="py-2 text-right tabular-nums">{mult(r.m.roas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Placement summary">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {breakdown.length === 0 && <p className="text-xs text-muted-foreground">No delivery data yet.</p>}
          {breakdown.map((b: any) => (
            <div key={b.surface} className="rounded-xl border border-border p-3">
              <p className="text-xs font-medium">{surfaceLabel(b.surface)}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{inr(b.spend)}</p>
              <p className="text-[11px] text-muted-foreground">{pct(b.ctr)} CTR · {num(b.conversions)} results</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
