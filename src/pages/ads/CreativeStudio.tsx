import { useState } from "react";
import { Sparkles, Save, ShieldAlert, Gauge } from "lucide-react";
import {
  useGenerateAdCopy,
  useSaveCreativeFromVariant,
  type CopyVariant,
} from "@/hooks/ads/useCreativeStudio";

const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";
const btnPrimary = "inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnGhost = "inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-secondary/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function pct(x: number) {
  return `${(x * 100).toFixed(2)}%`;
}

export function CreativeStudio({ advertiserId }: { advertiserId: string }) {
  const [form, setForm] = useState({
    brand: "",
    product: "",
    audience: "",
    tone: "confident, modern",
    destination_url: "",
    count: 4,
  });
  const [variants, setVariants] = useState<CopyVariant[]>([]);
  const generate = useGenerateAdCopy();
  const save = useSaveCreativeFromVariant();

  const canGen = form.brand.trim() && form.product.trim() && form.audience.trim();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-secondary/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Creative Studio</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          AI copy variants with predicted CTR/CVR and pre-flight brand-safety flags.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand"><input className={input} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Aurelix" /></Field>
          <Field label="Tone"><input className={input} value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} /></Field>
          <Field label="Product / offer">
            <textarea className={input} rows={2} value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Premium coin bundle 30% off" />
          </Field>
          <Field label="Audience">
            <textarea className={input} rows={2} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Gen-Z creators in India, ages 18-28" />
          </Field>
          <Field label="Destination URL"><input className={input} value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} placeholder="https://…" /></Field>
          <Field label="Variants">
            <input type="number" min={1} max={8} className={input} value={form.count}
              onChange={(e) => setForm({ ...form, count: Math.max(1, Math.min(8, Number(e.target.value) || 4)) })} />
          </Field>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            className={btnPrimary}
            disabled={!canGen || generate.isPending}
            onClick={async () => {
              const out = await generate.mutateAsync({
                brand: form.brand,
                product: form.product,
                audience: form.audience,
                tone: form.tone,
                count: form.count,
                advertiser_id: advertiserId,
              });
              setVariants(out);
            }}
          >
            <Sparkles className="h-3 w-3" />
            {generate.isPending ? "Generating…" : "Generate variants"}
          </button>
        </div>
      </div>

      {variants.length > 0 && (
        <div className="space-y-3">
          {variants.map((v, i) => (
            <div key={i} className="rounded-2xl border border-border bg-secondary/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{v.headline}</p>
                  <p className="text-xs text-muted-foreground mt-1">{v.description}</p>
                  <p className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    CTA: {v.cta}
                  </p>
                </div>
                <button
                  className={btnGhost}
                  disabled={save.isPending || v.brand_safety_flags.length > 0}
                  onClick={() =>
                    save.mutate({
                      advertiser_id: advertiserId,
                      name: `Studio · ${v.headline.slice(0, 40)}`,
                      variant: v,
                      destination_url: form.destination_url || undefined,
                    })
                  }
                >
                  <Save className="h-3 w-3" /> Save
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg border border-border bg-background/60 px-2 py-1.5">
                  <div className="flex items-center gap-1 text-muted-foreground"><Gauge className="h-3 w-3" /> Predicted CTR</div>
                  <div className="mt-0.5 text-sm font-semibold">{pct(v.predicted_ctr)}</div>
                </div>
                <div className="rounded-lg border border-border bg-background/60 px-2 py-1.5">
                  <div className="flex items-center gap-1 text-muted-foreground"><Gauge className="h-3 w-3" /> Predicted CVR</div>
                  <div className="mt-0.5 text-sm font-semibold">{pct(v.predicted_cvr)}</div>
                </div>
              </div>
              {v.brand_safety_flags.length > 0 && (
                <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-2">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                    <ShieldAlert className="h-3 w-3" /> Brand safety flags
                  </div>
                  <ul className="mt-1 list-disc pl-4 text-[11px] text-destructive/90">
                    {v.brand_safety_flags.map((f, j) => <li key={j}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
