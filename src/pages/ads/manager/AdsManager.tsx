import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, RefreshCw, Copy, Trash2, Play, Pause, Columns3, CalendarDays, ChevronRight, X } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { DataGrid } from "./DataGrid";
import { COLUMNS, PRESETS, type ColumnId } from "./columns";
import {
  DATE_PRESETS, resolvePreset, previousRange, useMetrics, useLevelRows, useTimeseries,
  useSurfaceBreakdown, useBulkUpdate, useBulkDelete, useDuplicate, useRecommendations,
  useGenerateRecommendations, useUpdateRecommendation, type DatePresetKey, type Level,
} from "@/hooks/ads/useAdsManager";
import { useResolvedAdvertiser } from "./shared";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const LEVELS: { key: Level; label: string }[] = [
  { key: "campaign", label: "Campaigns" },
  { key: "ad_group", label: "Ad sets" },
  { key: "ad", label: "Ads" },
];

export default function AdsManager({
  initialLevel = "campaign",
  embedded = false,
}: { initialLevel?: Level; embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { advertiserId } = useResolvedAdvertiser();

  const [level, setLevel] = useState<Level>(initialLevel);
  const [parent, setParent] = useState<{ campaign?: any; adGroup?: any }>({});
  const [presetKey, setPresetKey] = useState<DatePresetKey>("last_30");
  const [compareOn, setCompareOn] = useState(false);
  const [columns, setColumns] = useState<ColumnId[]>(PRESETS[0].columns);
  const [showColumns, setShowColumns] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const range = useMemo(() => resolvePreset(presetKey), [presetKey]);
  const prev = useMemo(() => previousRange(range), [range]);

  const parentId = level === "ad_group" ? parent.campaign?.id ?? null : level === "ad" ? parent.adGroup?.id ?? null : null;

  const { data: rows = [], isLoading } = useLevelRows(advertiserId, level, parentId);
  const { data: metrics = {} } = useMetrics(advertiserId, level, range, parentId);
  const { data: compare = {} } = useMetrics(advertiserId, level, compareOn ? prev : undefined, parentId);
  const { data: series = [] } = useTimeseries(advertiserId, range);
  const { data: breakdown = [] } = useSurfaceBreakdown(advertiserId, range);
  const { data: recs = [] } = useRecommendations(advertiserId);

  const bulkUpdate = useBulkUpdate();
  const bulkDelete = useBulkDelete();
  const duplicate = useDuplicate();
  const generate = useGenerateRecommendations();
  const updateRec = useUpdateRecommendation();

  const visible = useMemo(
    () => rows.filter((r: any) => !search || String(r.name ?? "").toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );
  const selectedRows = visible.filter((r: any) => selected.has(r.id));

  const goLevel = (next: Level) => { setLevel(next); setSelected(new Set()); };

  const drill = (row: any) => {
    if (level === "campaign") { setParent({ campaign: row }); goLevel("ad_group"); }
    else if (level === "ad_group") { setParent((p) => ({ ...p, adGroup: row })); goLevel("ad"); }
  };

  const toggleStatus = (row: any) => {
    const active = row.status === "running" || row.status === "active";
    bulkUpdate.mutate({ level, ids: [row.id], patch: { status: active ? "paused" : "running" } });
  };

  const totals = useMemo(() => {
    let spend = 0, clicks = 0, impressions = 0, conversions = 0, revenue = 0;
    for (const r of visible) {
      const m = metrics[r.id];
      if (!m) continue;
      spend += m.spend; clicks += m.clicks; impressions += m.impressions;
      conversions += m.conversions; revenue += m.revenue;
    }
    return { spend, clicks, impressions, conversions, revenue,
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      cpa: conversions ? spend / conversions : 0,
      roas: spend ? revenue / spend : 0 };
  }, [visible, metrics]);

  return (
    <div className={embedded ? "flex min-h-0 flex-1 flex-col bg-background" : "flex h-[100dvh] flex-col bg-background"}>
      <Helmet>
        <title>Ads Manager | Aurelix Ads</title>
        <meta name="description" content="Manage campaigns, ad sets and ads with live performance metrics, bulk edits and AI optimisation." />
      </Helmet>

      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        {!embedded && <h1 className="mr-2 text-sm font-semibold">Ads Manager</h1>}

        <div className="flex items-center rounded-lg border border-border p-0.5">
          {LEVELS.map((l) => (
            <button
              key={l.key}
              onClick={() => goLevel(l.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${level === l.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="h-8 w-56 rounded-lg border border-border bg-background px-3 text-xs"
        />

        <div className="relative">
          <button onClick={() => setShowDates((v) => !v)} className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs">
            <CalendarDays className="h-3.5 w-3.5" />
            {DATE_PRESETS.find((p) => p.key === presetKey)?.label ?? "Range"}
          </button>
          {showDates && (
            <div className="absolute z-30 mt-1 w-52 rounded-xl border border-border bg-popover p-1 shadow-lg">
              {DATE_PRESETS.map((p) => (
                <button key={p.key} onClick={() => { setPresetKey(p.key); setShowDates(false); }}
                  className={`block w-full rounded-lg px-3 py-1.5 text-left text-xs hover:bg-muted ${presetKey === p.key ? "font-semibold text-primary" : ""}`}>
                  {p.label}
                </button>
              ))}
              <label className="mt-1 flex items-center gap-2 border-t border-border px-3 py-2 text-xs">
                <input type="checkbox" checked={compareOn} onChange={(e) => setCompareOn(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                Compare to previous period
              </label>
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setShowColumns((v) => !v)} className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs">
            <Columns3 className="h-3.5 w-3.5" /> Columns
          </button>
          {showColumns && (
            <div className="absolute z-30 mt-1 max-h-[70vh] w-64 overflow-auto rounded-xl border border-border bg-popover p-2 shadow-lg">
              <p className="px-1 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">Presets</p>
              {PRESETS.map((p) => (
                <button key={p.name} onClick={() => setColumns(p.columns)} className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted">{p.name}</button>
              ))}
              <p className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase text-muted-foreground">Customise</p>
              {COLUMNS.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs hover:bg-muted">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-primary"
                    checked={columns.includes(c.id)}
                    onChange={(e) =>
                      setColumns((cols) => (e.target.checked ? [...cols, c.id] : cols.filter((x) => x !== c.id)))
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowInsights((v) => !v)} className="h-8 rounded-lg border border-border px-3 text-xs">
            {showInsights ? "Hide charts" : "Charts"}
          </button>
          <button
            onClick={() => advertiserId && generate.mutate({ advertiserId, range })}
            disabled={generate.isPending}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs"
          >
            {generate.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI insights
          </button>
          <button onClick={() => navigate("/ads/manager/create")} className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">
            Create
          </button>
        </div>
      </header>

      {/* Breadcrumb */}
      {(parent.campaign || parent.adGroup) && (
        <div className="flex items-center gap-1 border-b border-border px-4 py-1.5 text-xs text-muted-foreground">
          <button onClick={() => { setParent({}); goLevel("campaign"); }} className="hover:text-foreground">All campaigns</button>
          {parent.campaign && level !== "campaign" && (<><ChevronRight className="h-3 w-3" /><button onClick={() => { setParent({ campaign: parent.campaign }); goLevel("ad_group"); }} className="hover:text-foreground">{parent.campaign.name}</button></>)}
          {parent.adGroup && level === "ad" && (<><ChevronRight className="h-3 w-3" /><span className="text-foreground">{parent.adGroup.name}</span></>)}
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["Spend", `₹${totals.spend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`],
          ["Impressions", totals.impressions.toLocaleString("en-IN")],
          ["Clicks", totals.clicks.toLocaleString("en-IN")],
          ["CTR", `${totals.ctr.toFixed(2)}%`],
          ["Conversions", totals.conversions.toLocaleString("en-IN")],
          ["Cost / result", `₹${totals.cpa.toFixed(2)}`],
          ["ROAS", `${totals.roas.toFixed(2)}x`],
        ].map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {showInsights && (
        <div className="grid gap-3 border-b border-border p-3 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-3 lg:col-span-2">
            <p className="mb-2 text-xs font-semibold">Spend &amp; clicks over time</p>
            <div className="h-44">
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
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-xs font-semibold">By placement</p>
            <div className="space-y-1.5">
              {breakdown.length === 0 && <p className="text-xs text-muted-foreground">No delivery yet.</p>}
              {breakdown.map((b: any) => (
                <div key={b.surface} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{String(b.surface).replace(/_/g, " ")}</span>
                  <span className="tabular-nums">₹{b.spend.toLocaleString("en-IN", { maximumFractionDigits: 0 })} · {b.ctr.toFixed(2)}% CTR</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-border px-3 py-2">
          {recs.slice(0, 6).map((r: any) => (
            <div key={r.id} className="min-w-[260px] max-w-[300px] rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold">{r.title}</p>
                <button onClick={() => updateRec.mutate({ id: r.id, state: "dismissed" })} aria-label="Dismiss"><X className="h-3 w-3 text-muted-foreground" /></button>
              </div>
              <p className="mt-1 line-clamp-3 text-[11px] text-muted-foreground">{r.detail}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] uppercase text-muted-foreground">Impact {r.impact_score}</span>
                <button onClick={() => updateRec.mutate({ id: r.id, state: "applied" })} className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Mark done</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col p-3">
        <DataGrid
          level={level}
          rows={visible}
          metrics={metrics}
          compare={compareOn ? compare : undefined}
          columns={columns}
          selected={selected}
          onSelect={setSelected}
          onOpen={(r) => drill(r)}
          onDrill={drill}
          onToggleStatus={toggleStatus}
          onRename={(r, name) => name.trim() && bulkUpdate.mutate({ level, ids: [r.id], patch: { name: name.trim() } })}
          onBudget={(r, v) => v > 0 && bulkUpdate.mutate({ level, ids: [r.id], patch: { daily_budget: v } })}
          loading={isLoading}
        />
      </main>

      {selected.size > 0 && (
        <div className="sticky bottom-0 z-20 flex flex-wrap items-center gap-2 border-t border-border bg-card px-4 py-2">
          <span className="text-xs font-medium">{selected.size} selected</span>
          <button onClick={() => bulkUpdate.mutate({ level, ids: [...selected], patch: { status: "running" } })} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs"><Play className="h-3 w-3" /> Activate</button>
          <button onClick={() => bulkUpdate.mutate({ level, ids: [...selected], patch: { status: "paused" } })} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs"><Pause className="h-3 w-3" /> Pause</button>
          <button onClick={() => duplicate.mutate({ level, rows: selectedRows })} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs"><Copy className="h-3 w-3" /> Duplicate</button>
          <button onClick={() => bulkDelete.mutate({ level, ids: [...selected] })} className="flex items-center gap-1 rounded-lg border border-destructive/40 px-2.5 py-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /> Delete</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-muted-foreground">Clear</button>
        </div>
      )}
    </div>
  );
}
