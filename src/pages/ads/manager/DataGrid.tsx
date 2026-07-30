import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Pencil, Check, X } from "lucide-react";
import { COLUMN_MAP, cellValue, deliveryLabel, deliveryTone, type ColumnId } from "./columns";
import { EMPTY_METRICS, type Metrics, type Level } from "@/hooks/ads/useAdsManager";

interface Props {
  level: Level;
  rows: any[];
  metrics: Record<string, Metrics>;
  compare?: Record<string, Metrics>;
  columns: ColumnId[];
  selected: Set<string>;
  onSelect: (ids: Set<string>) => void;
  onOpen: (row: any) => void;
  onDrill: (row: any) => void;
  onToggleStatus: (row: any) => void;
  onRename: (row: any, name: string) => void;
  onBudget: (row: any, value: number) => void;
  loading?: boolean;
}

const isActive = (r: any) => r.status === "running" || r.status === "active";

export function DataGrid({
  level, rows, metrics, compare, columns, selected, onSelect,
  onOpen, onDrill, onToggleStatus, onRename, onBudget, loading,
}: Props) {
  const [sort, setSort] = useState<{ col: ColumnId | "name"; dir: "asc" | "desc" }>({ col: "spend", dir: "desc" });
  const [editing, setEditing] = useState<{ id: string; field: "name" | "budget"; value: string } | null>(null);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sort.col === "name") { av = a.name ?? ""; bv = b.name ?? ""; }
      else {
        const def = COLUMN_MAP[sort.col];
        const ma = metrics[a.id] ?? EMPTY_METRICS;
        const mb = metrics[b.id] ?? EMPTY_METRICS;
        av = def?.metric ? def.metric(ma) : (def?.entity?.(a) ?? "");
        bv = def?.metric ? def.metric(mb) : (def?.entity?.(b) ?? "");
      }
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [rows, metrics, sort]);

  const totals = useMemo(() => {
    const t = { ...EMPTY_METRICS };
    for (const r of rows) {
      const m = metrics[r.id] ?? EMPTY_METRICS;
      t.impressions += m.impressions; t.clicks += m.clicks;
      t.conversions += m.conversions; t.spend += m.spend;
      t.revenue += m.revenue; t.reach += m.reach;
    }
    t.ctr = t.impressions ? (t.clicks / t.impressions) * 100 : 0;
    t.cpc = t.clicks ? t.spend / t.clicks : 0;
    t.cpm = t.impressions ? (t.spend / t.impressions) * 1000 : 0;
    t.cpa = t.conversions ? t.spend / t.conversions : 0;
    t.roas = t.spend ? t.revenue / t.spend : 0;
    return t;
  }, [rows, metrics]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => onSelect(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelect(next);
  };

  const header = (id: ColumnId | "name", label: string, width?: number, align?: string) => (
    <th
      key={id}
      style={width ? { width, minWidth: width } : undefined}
      onClick={() => setSort((s) => ({ col: id, dir: s.col === id && s.dir === "desc" ? "asc" : "desc" }))}
      className={`sticky top-0 z-10 cursor-pointer select-none border-b border-border bg-muted/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur ${align === "right" ? "text-right" : "text-left"}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sort.col === id && (sort.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );

  const delta = (id: string, colId: ColumnId) => {
    if (!compare) return null;
    const def = COLUMN_MAP[colId];
    if (!def?.metric) return null;
    const now = def.metric(metrics[id] ?? EMPTY_METRICS);
    const then = def.metric(compare[id] ?? EMPTY_METRICS);
    if (!then) return null;
    const pct = ((now - then) / then) * 100;
    if (!isFinite(pct) || Math.abs(pct) < 0.5) return null;
    const good = ["cpc", "cpm", "cpa"].includes(colId) ? pct < 0 : pct > 0;
    return (
      <span className={`ml-1 text-[10px] font-medium ${good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
        {pct > 0 ? "+" : ""}{pct.toFixed(0)}%
      </span>
    );
  };

  return (
    <div className="relative flex-1 overflow-auto rounded-xl border border-border bg-card">
      <table className="w-full border-collapse text-[13px] tabular-nums">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 w-9 border-b border-border bg-muted/60 px-3 py-2 backdrop-blur">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-3.5 w-3.5 accent-primary" aria-label="Select all" />
            </th>
            <th
              onClick={() => setSort((s) => ({ col: "name", dir: s.col === "name" && s.dir === "desc" ? "asc" : "desc" }))}
              className="sticky left-9 top-0 z-20 min-w-[260px] cursor-pointer border-b border-r border-border bg-muted/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur"
            >
              {level === "campaign" ? "Campaign" : level === "ad_group" ? "Ad set" : "Ad"}
            </th>
            {columns.map((c) => header(c, COLUMN_MAP[c]?.label ?? c, COLUMN_MAP[c]?.width, COLUMN_MAP[c]?.align))}
          </tr>
        </thead>

        <tbody>
          {loading && (
            <tr><td colSpan={columns.length + 2} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
          )}
          {!loading && sorted.length === 0 && (
            <tr><td colSpan={columns.length + 2} className="px-4 py-12 text-center text-muted-foreground">
              Nothing here yet. Use <span className="font-medium text-foreground">Create</span> to get started.
            </td></tr>
          )}

          {sorted.map((r) => {
            const m = metrics[r.id] ?? EMPTY_METRICS;
            const checked = selected.has(r.id);
            return (
              <tr key={r.id} className={`group border-b border-border/60 hover:bg-muted/40 ${checked ? "bg-primary/5" : ""}`}>
                <td className={`sticky left-0 z-10 px-3 py-2 ${checked ? "bg-primary/5" : "bg-card"} group-hover:bg-muted/40`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleOne(r.id)} className="h-3.5 w-3.5 accent-primary" aria-label={`Select ${r.name}`} />
                </td>

                <td className={`sticky left-9 z-10 border-r border-border px-3 py-2 ${checked ? "bg-primary/5" : "bg-card"} group-hover:bg-muted/40`}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleStatus(r)}
                      title={isActive(r) ? "Pause" : "Activate"}
                      className={`h-4 w-7 shrink-0 rounded-full transition ${isActive(r) ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`block h-3 w-3 translate-y-[2px] rounded-full bg-background transition ${isActive(r) ? "translate-x-[14px]" : "translate-x-[2px]"}`} />
                    </button>

                    {editing?.id === r.id && editing.field === "name" ? (
                      <span className="flex items-center gap-1">
                        <input
                          autoFocus
                          className="w-48 rounded border border-border bg-background px-2 py-1 text-[13px]"
                          value={editing.value}
                          onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { onRename(r, editing.value); setEditing(null); }
                            if (e.key === "Escape") setEditing(null);
                          }}
                        />
                        <button onClick={() => { onRename(r, editing.value); setEditing(null); }} aria-label="Save name"><Check className="h-3.5 w-3.5 text-emerald-500" /></button>
                        <button onClick={() => setEditing(null)} aria-label="Cancel"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      </span>
                    ) : (
                      <span className="flex min-w-0 items-center gap-1">
                        <button
                          onClick={() => (level === "ad" ? onOpen(r) : onDrill(r))}
                          className="truncate text-left font-medium hover:underline"
                        >
                          {r.name}
                        </button>
                        <button
                          onClick={() => setEditing({ id: r.id, field: "name", value: r.name ?? "" })}
                          className="opacity-0 transition group-hover:opacity-100"
                          aria-label="Rename"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </span>
                    )}
                  </div>
                  <span className={`ml-9 text-[11px] ${deliveryTone(r)}`}>{deliveryLabel(r)}</span>
                </td>

                {columns.map((cid) => {
                  const def = COLUMN_MAP[cid];
                  const editable = cid === "budget" && level !== "ad";
                  if (editable && editing?.id === r.id && editing.field === "budget") {
                    return (
                      <td key={cid} className="px-3 py-2 text-right">
                        <input
                          autoFocus
                          type="number"
                          className="w-24 rounded border border-border bg-background px-2 py-1 text-right text-[13px]"
                          value={editing.value}
                          onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                          onBlur={() => { onBudget(r, Number(editing.value)); setEditing(null); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { onBudget(r, Number(editing.value)); setEditing(null); }
                            if (e.key === "Escape") setEditing(null);
                          }}
                        />
                      </td>
                    );
                  }
                  return (
                    <td
                      key={cid}
                      onDoubleClick={() => editable && setEditing({ id: r.id, field: "budget", value: String(r.daily_budget ?? "") })}
                      className={`px-3 py-2 ${def?.align === "right" ? "text-right" : "text-left"} ${editable ? "cursor-text" : ""}`}
                    >
                      {cellValue(def, r, m)}
                      {delta(r.id, cid)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr className="sticky bottom-0 z-10">
            <td className="sticky left-0 z-20 border-t border-border bg-muted/80 px-3 py-2 backdrop-blur" />
            <td className="sticky left-9 z-20 border-r border-t border-border bg-muted/80 px-3 py-2 text-[12px] font-semibold backdrop-blur">
              Total · {rows.length} {level === "campaign" ? "campaigns" : level === "ad_group" ? "ad sets" : "ads"}
            </td>
            {columns.map((cid) => {
              const def = COLUMN_MAP[cid];
              return (
                <td key={cid} className={`border-t border-border bg-muted/80 px-3 py-2 text-[12px] font-semibold backdrop-blur ${def?.align === "right" ? "text-right" : "text-left"}`}>
                  {def?.metric ? (def.format ?? String)(def.metric(totals)) : ""}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
