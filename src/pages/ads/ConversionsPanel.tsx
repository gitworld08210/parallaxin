import { useState } from "react";
import { Copy, Plus, Target, Radio, BarChart2, Check } from "lucide-react";
import {
  usePixels, useCreatePixel, useTogglePixel,
  useConversionEvents, useCreateConversionEvent,
  useAttributionSummary,
} from "@/hooks/ads/useConversions";
import { toast } from "sonner";

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";
const btnPrimary = "inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnGhost = "inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-secondary/60";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-secondary/40 p-4 ${className}`}>{children}</div>;
}

function copy(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied");
}

export function ConversionsPanel({ advertiserId }: { advertiserId: string }) {
  const { data: pixels = [] } = usePixels(advertiserId);
  const { data: events = [] } = useConversionEvents(advertiserId);
  const { data: summary = [] } = useAttributionSummary(advertiserId, 30);
  const createPixel = useCreatePixel();
  const togglePixel = useTogglePixel();
  const createEvent = useCreateConversionEvent();

  const [pxName, setPxName] = useState("");
  const [pxDomain, setPxDomain] = useState("");
  const [evName, setEvName] = useState("");
  const [evCode, setEvCode] = useState("purchase");
  const [evValue, setEvValue] = useState("");
  const [evPixel, setEvPixel] = useState<string>("");
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  const totals = summary.reduce(
    (a, r) => ({
      c: a.c + Number(r.total_conversions ?? 0),
      v: a.v + Number(r.total_value ?? 0),
      click: a.click + Number(r.click_conversions ?? 0),
      view: a.view + Number(r.view_conversions ?? 0),
    }),
    { c: 0, v: 0, click: 0, view: 0 },
  );

  return (
    <div className="space-y-5">
      {/* Attribution summary */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Attribution — last 30 days</h3>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          <Card><p className="text-lg font-bold">{totals.c}</p><p className="text-[10px] text-muted-foreground">Conversions</p></Card>
          <Card><p className="text-lg font-bold">{totals.click}</p><p className="text-[10px] text-muted-foreground">Click-through</p></Card>
          <Card><p className="text-lg font-bold">{totals.view}</p><p className="text-[10px] text-muted-foreground">View-through</p></Card>
          <Card><p className="text-lg font-bold">₹{totals.v.toFixed(0)}</p><p className="text-[10px] text-muted-foreground">Value</p></Card>
        </div>
        {summary.length === 0 ? (
          <Card><p className="text-xs text-muted-foreground">No conversions yet. Install a pixel and start sending events.</p></Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-background/60">
                <tr className="text-left">
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Click</th>
                  <th className="px-3 py-2 text-right">View</th>
                  <th className="px-3 py-2 text-right">Unattr.</th>
                  <th className="px-3 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((r) => (
                  <tr key={r.event_code} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{r.event_code}</td>
                    <td className="px-3 py-2 text-right">{r.total_conversions}</td>
                    <td className="px-3 py-2 text-right">{r.click_conversions}</td>
                    <td className="px-3 py-2 text-right">{r.view_conversions}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{r.unattributed}</td>
                    <td className="px-3 py-2 text-right">₹{Number(r.total_value).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Pixels */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Radio className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Pixels</h3>
        </div>
        <Card className="mb-3">
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Pixel name" value={pxName} onChange={(e) => setPxName(e.target.value)} />
            <input className={inputCls} placeholder="Domain (optional)" value={pxDomain} onChange={(e) => setPxDomain(e.target.value)} />
          </div>
          <div className="mt-2 text-right">
            <button
              disabled={!pxName.trim() || createPixel.isPending}
              className={btnPrimary}
              onClick={() =>
                createPixel.mutate(
                  { advertiser_id: advertiserId, name: pxName.trim(), domain: pxDomain.trim() || undefined },
                  { onSuccess: () => { setPxName(""); setPxDomain(""); } },
                )
              }
            >
              <Plus className="h-3 w-3" /> New pixel
            </button>
          </div>
        </Card>

        {pixels.length === 0 ? (
          <p className="text-xs text-muted-foreground">No pixels yet.</p>
        ) : (
          <div className="space-y-2">
            {pixels.map((p) => (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.domain ?? "—"} · {p.is_active ? "Active" : "Paused"} ·
                      {" "}Last event: {p.last_event_at ? new Date(p.last_event_at).toLocaleString() : "never"}
                    </p>
                  </div>
                  <button className={btnGhost} onClick={() => togglePixel.mutate({ id: p.id, is_active: !p.is_active, advertiser_id: p.advertiser_id })}>
                    {p.is_active ? "Pause" : "Activate"}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto] gap-1 items-center">
                  <code className="rounded bg-background px-2 py-1 text-[10px] break-all">
                    Pixel ID: {p.id}
                  </code>
                  <button className={btnGhost} onClick={() => copy(p.id)}><Copy className="h-3 w-3" /></button>

                  <code className="rounded bg-background px-2 py-1 text-[10px] break-all">
                    Secret: {showSecret[p.id] ? p.secret : "•".repeat(24)}
                  </code>
                  <div className="flex gap-1">
                    <button className={btnGhost} onClick={() => setShowSecret((s) => ({ ...s, [p.id]: !s[p.id] }))}>
                      {showSecret[p.id] ? "Hide" : "Show"}
                    </button>
                    <button className={btnGhost} onClick={() => copy(p.secret)}><Copy className="h-3 w-3" /></button>
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-[11px] text-muted-foreground">Server-to-server install</summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-[10px] leading-snug">
{`POST https://<your-project>.functions.supabase.co/aap-conversions-api
Headers:
  x-pixel-id: ${p.id}
  x-pixel-secret: <your secret>
  content-type: application/json

Body:
{
  "event_code": "purchase",
  "event_id": "order_12345",       // for dedup
  "user_id": "<aurelix user uuid>", // enables attribution
  "value": 499,
  "currency": "INR",
  "meta": { "sku": "abc" }
}`}
                  </pre>
                </details>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Conversion events */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Conversion events</h3>
        </div>
        <Card className="mb-3">
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Display name (e.g. Purchase)" value={evName} onChange={(e) => setEvName(e.target.value)} />
            <input className={inputCls} placeholder="Event code (e.g. purchase)" value={evCode} onChange={(e) => setEvCode(e.target.value)} />
            <input className={inputCls} placeholder="Default value ₹" type="number" value={evValue} onChange={(e) => setEvValue(e.target.value)} />
            <select className={inputCls} value={evPixel} onChange={(e) => setEvPixel(e.target.value)}>
              <option value="">Any pixel</option>
              {pixels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="mt-2 text-right">
            <button
              disabled={!evName.trim() || !evCode.trim() || createEvent.isPending}
              className={btnPrimary}
              onClick={() =>
                createEvent.mutate(
                  {
                    advertiser_id: advertiserId,
                    name: evName.trim(),
                    event_code: evCode.trim(),
                    default_value: Number(evValue) || 0,
                    pixel_id: evPixel || null,
                  },
                  { onSuccess: () => { setEvName(""); setEvCode("purchase"); setEvValue(""); } },
                )
              }
            >
              <Plus className="h-3 w-3" /> Create event
            </button>
          </div>
        </Card>

        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No conversion events defined yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {events.map((e) => (
              <Card key={e.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{e.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      code: <code>{e.event_code ?? e.name}</code> · default ₹{Number(e.default_value).toFixed(0)} · {e.currency}
                    </p>
                  </div>
                  {e.is_active && <Check className="h-4 w-4 text-primary" />}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
