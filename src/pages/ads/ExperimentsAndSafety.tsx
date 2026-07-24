import { useMemo, useState } from "react";
import {
  useExperiments, useCreateExperiment, useSetExperimentStatus,
  usePromoteWinner, useExperimentVariants, useExperimentSummary,
  useBlockedCategories, useAddBlockedCategory, useRemoveBlockedCategory,
  useUpdateAdGroupSafety,
} from "@/hooks/ads/useExperiments";
import { FlaskConical, Shield, Play, Pause, Trophy, Plus, X, Trash2 } from "lucide-react";

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";
const btnPrimary = "inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnGhost = "inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-secondary/60";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-secondary/40 p-4 ${className}`}>{children}</div>;
}

/* ============================ Experiments ============================ */

function ExperimentDetail({ experimentId }: { experimentId: string }) {
  const { data: variants = [] } = useExperimentVariants(experimentId);
  const { data: summary = [] } = useExperimentSummary(experimentId);
  const setStatus = useSetExperimentStatus();
  const promote = usePromoteWinner();
  const [metric, setMetric] = useState("conversions");

  const totals = useMemo(() => {
    const byVariant = new Map<string, { name: string; total: number; samples: number }>();
    for (const v of variants as any[]) byVariant.set(v.id, { name: v.name, total: 0, samples: 0 });
    for (const r of summary) {
      if (r.metric !== metric) continue;
      const cur = byVariant.get(r.variant_id);
      if (cur) { cur.total += Number(r.total_value ?? 0); cur.samples += Number(r.sample_size ?? 0); }
    }
    return Array.from(byVariant.entries()).map(([id, x]) => ({ id, ...x }));
  }, [variants, summary, metric]);

  const leader = totals.reduce((a, b) => (b.total > (a?.total ?? -1) ? b : a), null as any);

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Winner metric</label>
        <select value={metric} onChange={(e) => setMetric(e.target.value)}
          className={inputCls + " max-w-[160px]"}>
          <option value="conversions">Conversions</option>
          <option value="clicks">Clicks</option>
          <option value="impressions">Impressions</option>
          <option value="revenue">Revenue</option>
        </select>
        <button className={btnGhost} onClick={() => setStatus.mutate({ id: experimentId, status: "running" })}>
          <Play className="h-3 w-3" /> Start
        </button>
        <button className={btnGhost} onClick={() => setStatus.mutate({ id: experimentId, status: "paused" })}>
          <Pause className="h-3 w-3" /> Pause
        </button>
        <button className={btnPrimary} onClick={() => promote.mutate({ id: experimentId, metric })}>
          <Trophy className="h-3 w-3" /> Promote winner
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {totals.map((t) => (
          <div key={t.id} className={`rounded-xl border p-3 ${leader?.id === t.id ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t.name}</span>
              {leader?.id === t.id && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Leading</span>}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{metric}</div>
            <div className="text-lg font-bold mt-1">{t.total.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground">samples: {t.samples}</div>
          </div>
        ))}
        {totals.length === 0 && <div className="text-xs text-muted-foreground">No variants yet.</div>}
      </div>
    </div>
  );
}

function NewExperimentForm({ advertiserId, onDone }: { advertiserId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [variants, setVariants] = useState([
    { name: "Control", allocation: 0.5 },
    { name: "Variant B", allocation: 0.5 },
  ]);
  const create = useCreateExperiment();

  return (
    <Card className="space-y-2">
      <div className="text-sm font-semibold">New A/B experiment</div>
      <input className={inputCls} placeholder="Experiment name" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea className={inputCls} rows={2} placeholder="Hypothesis (optional)" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} />
      <div className="space-y-2">
        {variants.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={inputCls} value={v.name} onChange={(e) => {
              const next = [...variants]; next[i].name = e.target.value; setVariants(next);
            }} />
            <input type="number" step="0.05" min="0" max="1" className={inputCls + " max-w-[100px]"} value={v.allocation}
              onChange={(e) => { const next = [...variants]; next[i].allocation = Number(e.target.value); setVariants(next); }} />
            {variants.length > 2 && (
              <button className={btnGhost} onClick={() => setVariants(variants.filter((_, j) => j !== i))}>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <button className={btnGhost} onClick={() => setVariants([...variants, { name: `Variant ${String.fromCharCode(65 + variants.length)}`, allocation: 0.1 }])}>
          <Plus className="h-3 w-3" /> Add variant
        </button>
      </div>
      <div className="flex gap-2 justify-end">
        <button className={btnGhost} onClick={onDone}>Cancel</button>
        <button className={btnPrimary}
          disabled={!name || variants.length < 2}
          onClick={async () => {
            await create.mutateAsync({ advertiser_id: advertiserId, name, hypothesis, variants });
            onDone();
          }}>
          <Plus className="h-3 w-3" /> Create
        </button>
      </div>
    </Card>
  );
}

export function ExperimentsPanel({ advertiserId }: { advertiserId: string }) {
  const { data: exps = [] } = useExperiments(advertiserId);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2"><FlaskConical className="h-4 w-4" /> A/B experiments</h2>
        <button className={btnPrimary} onClick={() => setCreating((v) => !v)}>
          <Plus className="h-3 w-3" /> New experiment
        </button>
      </div>

      {creating && <NewExperimentForm advertiserId={advertiserId} onDone={() => setCreating(false)} />}

      {exps.length === 0 && !creating && (
        <Card><p className="text-sm text-muted-foreground">No experiments yet. Create one to test creatives, audiences or bids.</p></Card>
      )}

      <div className="space-y-2">
        {exps.map((e) => (
          <Card key={e.id}>
            <button className="w-full text-left" onClick={() => setOpenId(openId === e.id ? null : e.id)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{e.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.status} {e.winner_variant_id ? "· winner set" : ""}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-border">{e.kind}</span>
              </div>
            </button>
            {openId === e.id && <ExperimentDetail experimentId={e.id} />}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ============================ Brand safety ============================ */

const SUGGESTED_CATEGORIES = ["gambling", "alcohol", "tobacco", "politics", "violence", "adult", "religion", "tragedy"];

export function BrandSafetyPanel({ advertiserId }: { advertiserId: string }) {
  const { data: blocked = [] } = useBlockedCategories(advertiserId);
  const add = useAddBlockedCategory();
  const remove = useRemoveBlockedCategory();
  const [custom, setCustom] = useState("");

  const blockedSet = new Set(blocked.map((b: any) => b.category.toLowerCase()));

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Brand safety</h2>

      <Card className="space-y-3">
        <div>
          <div className="text-sm font-medium">Blocked content categories</div>
          <div className="text-xs text-muted-foreground">Your ads will never be served next to content matching these categories.</div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUGGESTED_CATEGORIES.map((c) => {
            const on = blockedSet.has(c);
            return (
              <button key={c} className={`rounded-full px-3 py-1 text-xs border ${on ? "bg-destructive/15 border-destructive text-destructive" : "border-border bg-background"}`}
                onClick={() => {
                  if (on) {
                    const row = blocked.find((b: any) => b.category.toLowerCase() === c);
                    if (row) remove.mutate((row as any).id);
                  } else {
                    add.mutate({ advertiser_id: advertiserId, category: c });
                  }
                }}>
                {c}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <input className={inputCls} placeholder="Custom category (e.g. crypto)" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button className={btnPrimary} disabled={!custom.trim()} onClick={() => {
            add.mutate({ advertiser_id: advertiserId, category: custom.trim().toLowerCase() });
            setCustom("");
          }}>
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>

        {blocked.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2">Active blocks</div>
            <div className="flex flex-wrap gap-2">
              {blocked.map((b: any) => (
                <span key={b.id} className="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2 py-0.5 text-xs">
                  {b.category}
                  <button onClick={() => remove.mutate(b.id)} className="opacity-60 hover:opacity-100">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="text-xs text-muted-foreground">
          Per-ad-group blocked keywords and minimum content rating can be configured on the <b>Ad group</b> detail page. Advertiser-wide category blocks above apply to every ad group.
        </div>
      </Card>
    </div>
  );
}

/* ============================ Ad-group safety inline panel ============================ */

export function AdGroupSafetyPanel({ group }: { group: any }) {
  const update = useUpdateAdGroupSafety();
  const [cats, setCats] = useState<string>((group?.blocked_categories ?? []).join(", "));
  const [kws, setKws] = useState<string>((group?.blocked_keywords ?? []).join(", "));
  const [rating, setRating] = useState<string>(group?.min_content_rating ?? "");

  return (
    <Card className="space-y-2">
      <div className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Ad-group brand safety</div>
      <label className="block">
        <span className="text-xs text-muted-foreground">Blocked categories (comma separated)</span>
        <input className={inputCls} value={cats} onChange={(e) => setCats(e.target.value)} placeholder="gambling, alcohol" />
      </label>
      <label className="block">
        <span className="text-xs text-muted-foreground">Blocked keywords (comma separated)</span>
        <input className={inputCls} value={kws} onChange={(e) => setKws(e.target.value)} placeholder="crash, scandal" />
      </label>
      <label className="block">
        <span className="text-xs text-muted-foreground">Minimum content rating</span>
        <select className={inputCls} value={rating} onChange={(e) => setRating(e.target.value)}>
          <option value="">Any</option>
          <option value="G">G · General</option>
          <option value="PG">PG · Parental guidance</option>
          <option value="MA">MA · Mature</option>
        </select>
      </label>
      <div className="flex justify-end">
        <button className={btnPrimary} onClick={() => update.mutate({
          ad_group_id: group.id,
          blocked_categories: cats.split(",").map((s) => s.trim()).filter(Boolean),
          blocked_keywords: kws.split(",").map((s) => s.trim()).filter(Boolean),
          min_content_rating: rating || null,
        })}>Save</button>
      </div>
    </Card>
  );
}
