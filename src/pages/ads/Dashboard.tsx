import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, MousePointerClick, Target, Coins, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdsEntities, useAdsStats } from "@/hooks/ads/useAdsEntities";
import { DATE_PRESETS, fmtCoins, fmtCompact, fmtInt, fmtPct, rangeFor, statusTone, PLACEMENTS } from "./lib";

export default function Dashboard() {
  const { accountId } = useParams();
  const [preset, setPreset] = useState("30d");
  const range = useMemo(() => rangeFor(preset), [preset]);
  const { totals, series, byPlacement } = useAdsStats(accountId, range.from, range.to);
  const { campaigns } = useAdsEntities(accountId);

  const tiles = [
    { label: "Impressions", value: fmtCompact(totals?.impressions), icon: Eye },
    { label: "Clicks", value: fmtCompact(totals?.clicks), icon: MousePointerClick },
    { label: "CTR", value: fmtPct(totals?.ctr), icon: Target },
    { label: "Spend", value: fmtCoins(totals?.spend_coins), icon: Coins },
  ];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Performance</h1>
          <p className="text-xs text-muted-foreground">
            {range.from} → {range.to}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{t.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Delivery trend</h2>
        <div className="mt-4 h-56">
          {series.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="imp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="impressions" stroke="hsl(var(--primary))" fill="url(#imp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Abhi koi delivery data nahi — campaign live hote hi yahan trend dikhega.
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Placement breakdown</h2>
          <div className="mt-3 space-y-2.5">
            {PLACEMENTS.map((p) => {
              const row = byPlacement.find((b) => b.placement === p.id);
              const max = Math.max(1, ...byPlacement.map((b) => b.impressions));
              const pct = row ? (row.impressions / max) * 100 : 0;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{p.label}</span>
                    <span className="tabular-nums text-muted-foreground">{fmtInt(row?.impressions ?? 0)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Campaigns</h2>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to={`/ads/${accountId}/create`}>
                <Plus className="h-3.5 w-3.5" /> New
              </Link>
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {campaigns.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to={`/ads/${accountId}/campaigns`}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-[11px] capitalize text-muted-foreground">{c.objective.replace("_", " ")}</p>
                </div>
                <Badge variant="outline" className={`ml-auto capitalize ${statusTone(c.status)}`}>
                  {c.status}
                </Badge>
              </Link>
            ))}
            {!campaigns.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">Abhi koi campaign nahi hai.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
