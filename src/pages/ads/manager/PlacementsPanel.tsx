import { useMemo, useState } from "react";
import { resolvePreset, useSurfaceBreakdown, useTimeseries } from "@/hooks/ads/useAdsManager";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useResolvedAdvertiser, Panel, inr, num, pct, mult, SURFACES, surfaceLabel } from "./shared";

export default function PlacementsPanel() {
  const { advertiserId } = useResolvedAdvertiser();
  const [days, setDays] = useState<"last_7" | "last_30">("last_30");
  const range = useMemo(() => resolvePreset(days), [days]);
  const { data: breakdown = [] } = useSurfaceBreakdown(advertiserId, range);
  const { data: series = [] } = useTimeseries(advertiserId, range);

  const chart = SURFACES.map((s) => {
    const row: any = breakdown.find((b: any) => b.surface === s.key);
    return { name: s.label.replace("Aurelix ", ""), spend: row?.spend ?? 0, ctr: row?.ctr ?? 0 };
  });

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center gap-2">
        <div>
          <h1 className="text-base font-semibold">Placements</h1>
          <p className="text-xs text-muted-foreground">Where your ads are delivering across Aurelix surfaces.</p>
        </div>
        <div className="ml-auto flex rounded-xl border border-border p-0.5">
          {(["last_7", "last_30"] as const).map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-xs ${days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {d === "last_7" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </header>

      <Panel title="Spend by placement">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Placement breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border text-left">
                <th className="py-1.5 font-medium">Placement</th>
                <th className="py-1.5 text-right font-medium">Spend</th>
                <th className="py-1.5 text-right font-medium">Impressions</th>
                <th className="py-1.5 text-right font-medium">Clicks</th>
                <th className="py-1.5 text-right font-medium">CTR</th>
                <th className="py-1.5 text-right font-medium">CPM</th>
                <th className="py-1.5 text-right font-medium">Results</th>
                <th className="py-1.5 text-right font-medium">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.length === 0 && (
                <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">No delivery data yet.</td></tr>
              )}
              {breakdown.map((b: any) => (
                <tr key={b.surface} className="border-b border-border/60 last:border-0">
                  <td className="py-2">{surfaceLabel(b.surface)}</td>
                  <td className="py-2 text-right tabular-nums">{inr(b.spend)}</td>
                  <td className="py-2 text-right tabular-nums">{num(b.impressions)}</td>
                  <td className="py-2 text-right tabular-nums">{num(b.clicks)}</td>
                  <td className="py-2 text-right tabular-nums">{pct(b.ctr)}</td>
                  <td className="py-2 text-right tabular-nums">{inr(b.cpm)}</td>
                  <td className="py-2 text-right tabular-nums">{num(b.conversions)}</td>
                  <td className="py-2 text-right tabular-nums">{mult(b.roas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Daily delivery">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="impressions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
