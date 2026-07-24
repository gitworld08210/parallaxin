import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, TrendingUp, MousePointerClick, Eye, Target } from "lucide-react";
import { useRollupsForAdvertiser, type RollupRow } from "@/hooks/ads/useBilling";
import { useCampaigns } from "@/hooks/ads/useCampaigns";
import { useAdvertiser } from "@/hooks/ads/useAdvertiser";

const btn = "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-secondary/40 p-4 ${className}`}>{children}</div>;
}

/** minimalist SVG sparkline */
function Sparkline({ points, color = "hsl(var(--primary))" }: { points: number[]; color?: string }) {
  const w = 280, h = 60, pad = 4;
  if (points.length === 0) return <svg width={w} height={h} />;
  const max = Math.max(...points, 1);
  const step = (w - pad * 2) / Math.max(points.length - 1, 1);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"} ${pad + i * step} ${h - pad - (v / max) * (h - pad * 2)}`).join(" ");
  const area = `${d} L ${pad + (points.length - 1) * step} ${h - pad} L ${pad} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
      <path d={area} fill={color} opacity={0.15} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

export default function AnalyticsDashboard() {
  const { advertiserId } = useParams();
  const { data: adv } = useAdvertiser(advertiserId);
  const [days, setDays] = useState(30);
  const { data: rollups = [], isLoading } = useRollupsForAdvertiser(advertiserId, days);
  const { data: campaigns = [] } = useCampaigns(advertiserId);

  const totals = useMemo(() => {
    return (rollups as RollupRow[]).reduce(
      (acc, r) => {
        acc.impr += Number(r.impressions ?? 0);
        acc.clicks += Number(r.clicks ?? 0);
        acc.conv += Number(r.conversions ?? 0);
        acc.spend += Number(r.spend ?? 0);
        return acc;
      },
      { impr: 0, clicks: 0, conv: 0, spend: 0 }
    );
  }, [rollups]);

  const byDay = useMemo(() => {
    const map = new Map<string, { impr: number; clicks: number; spend: number }>();
    (rollups as RollupRow[]).forEach((r) => {
      const p = map.get(r.day) ?? { impr: 0, clicks: 0, spend: 0 };
      p.impr += Number(r.impressions ?? 0);
      p.clicks += Number(r.clicks ?? 0);
      p.spend += Number(r.spend ?? 0);
      map.set(r.day, p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rollups]);

  const byCampaign = useMemo(() => {
    const map = new Map<string, { impr: number; clicks: number; spend: number; conv: number }>();
    (rollups as RollupRow[]).forEach((r) => {
      if (!r.campaign_id) return;
      const p = map.get(r.campaign_id) ?? { impr: 0, clicks: 0, spend: 0, conv: 0 };
      p.impr += Number(r.impressions ?? 0);
      p.clicks += Number(r.clicks ?? 0);
      p.spend += Number(r.spend ?? 0);
      p.conv += Number(r.conversions ?? 0);
      map.set(r.campaign_id, p);
    });
    const nameOf = new Map(campaigns.map((c: any) => [c.id, c.name]));
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: nameOf.get(id) ?? id.slice(0, 8), ...v }))
      .sort((a, b) => b.spend - a.spend);
  }, [rollups, campaigns]);

  const ctr = totals.impr ? (totals.clicks / totals.impr) * 100 : 0;
  const cpc = totals.clicks ? totals.spend / totals.clicks : 0;
  const cpm = totals.impr ? (totals.spend / totals.impr) * 1000 : 0;

  if (!advertiserId) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-6">
        <Link to={`/ads/${advertiserId}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ArrowLeft className="h-3 w-3" /> {adv?.display_name ?? "Advertiser"}
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Delivery performance across all campaigns.</p>
          </div>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`${btn} ${days === d ? "bg-primary text-primary-foreground border-primary" : "border-border bg-secondary/40"}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {[
            { icon: Eye, label: "Impressions", value: totals.impr.toLocaleString() },
            { icon: MousePointerClick, label: "Clicks", value: totals.clicks.toLocaleString() },
            { icon: Target, label: "Conversions", value: totals.conv.toLocaleString() },
            { icon: TrendingUp, label: "Spend", value: `₹${totals.spend.toFixed(0)}` },
          ].map((t) => (
            <Card key={t.label}>
              <t.icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-2 text-xl font-bold tracking-tight">{t.value}</p>
              <p className="text-xs text-muted-foreground">{t.label}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <Card><p className="text-[11px] text-muted-foreground">CTR</p><p className="text-base font-semibold mt-1">{ctr.toFixed(2)}%</p></Card>
          <Card><p className="text-[11px] text-muted-foreground">CPC</p><p className="text-base font-semibold mt-1">₹{cpc.toFixed(2)}</p></Card>
          <Card><p className="text-[11px] text-muted-foreground">CPM</p><p className="text-base font-semibold mt-1">₹{cpm.toFixed(2)}</p></Card>
        </div>

        <div className="mt-6 space-y-3">
          <Card>
            <p className="text-xs text-muted-foreground mb-1">Impressions · last {days}d</p>
            <Sparkline points={byDay.map(([, v]) => v.impr)} />
          </Card>
          <Card>
            <p className="text-xs text-muted-foreground mb-1">Spend · last {days}d</p>
            <Sparkline points={byDay.map(([, v]) => v.spend)} color="hsl(var(--destructive))" />
          </Card>
        </div>

        <div className="mt-6 mb-10">
          <h2 className="text-base font-semibold mb-2">Top campaigns</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : byCampaign.length === 0 ? (
            <Card><p className="text-sm text-muted-foreground">No delivery data yet.</p></Card>
          ) : (
            <div className="space-y-2">
              {byCampaign.slice(0, 10).map((c) => (
                <Card key={c.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.impr.toLocaleString()} impr · {c.clicks.toLocaleString()} clicks · {c.conv} conv
                    </p>
                  </div>
                  <p className="text-sm font-semibold">₹{c.spend.toFixed(0)}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
