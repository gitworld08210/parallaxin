import { useState } from "react";
import { Key, Webhook as WebhookIcon, Copy, Plus, Trash2, Activity, ChevronDown } from "lucide-react";
import {
  useApiKeys, useIssueApiKey, useRevokeApiKey,
  useWebhooks, useCreateWebhook, useToggleWebhook, useWebhookDeliveries,
} from "@/hooks/ads/useDeveloper";
import { toast } from "sonner";

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";
const btnPrimary = "inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnGhost = "inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-secondary/60";
const btnDanger = "inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-secondary/40 p-4 ${className}`}>{children}</div>;
}

const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };

const EVENT_CATALOG = [
  "campaign.created", "campaign.status_changed",
  "ad.created", "ad.status_changed",
  "conversion.attributed",
];

const SCOPES = ["read", "write", "admin"];

function WebhookRow({ w }: { w: any }) {
  const [open, setOpen] = useState(false);
  const toggle = useToggleWebhook();
  const { data: deliveries = [] } = useWebhookDeliveries(open ? w.id : undefined);
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{w.name ?? w.url}</p>
          <p className="text-[11px] text-muted-foreground truncate">{w.url}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Events: {w.events?.length ? w.events.join(", ") : "all"} · Failures: {w.failure_count}
            {w.last_success_at ? ` · ok ${new Date(w.last_success_at).toLocaleString()}` : ""}
          </p>
        </div>
        <button className={btnGhost} onClick={() => toggle.mutate({ id: w.id, advertiser_id: w.advertiser_id, is_active: !w.is_active })}>
          {w.is_active ? "Pause" : "Enable"}
        </button>
      </div>
      {w.secret && (
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-1 items-center">
          <code className="rounded bg-background px-2 py-1 text-[10px] break-all">Signing secret: {w.secret}</code>
          <button className={btnGhost} onClick={() => copy(w.secret)}><Copy className="h-3 w-3" /></button>
        </div>
      )}
      <button className="mt-3 text-[11px] text-muted-foreground inline-flex items-center gap-1" onClick={() => setOpen((v) => !v)}>
        <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} /> Recent deliveries
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {deliveries.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No deliveries yet.</p>
          ) : deliveries.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-[11px] border-t border-border pt-1">
              <span className="truncate">{d.event}</span>
              <span className={d.status && d.status >= 200 && d.status < 300 ? "text-primary" : "text-destructive"}>
                {d.status ?? "err"} · {d.duration_ms ?? 0}ms · attempt {d.attempt}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function DeveloperPanel({ advertiserId }: { advertiserId: string }) {
  const { data: keys = [] } = useApiKeys(advertiserId);
  const { data: hooks = [] } = useWebhooks(advertiserId);
  const issueKey = useIssueApiKey();
  const revokeKey = useRevokeApiKey();
  const createHook = useCreateWebhook();

  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState<string[]>(["read"]);
  const [freshSecret, setFreshSecret] = useState<string | null>(null);

  const [hookName, setHookName] = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [hookEvents, setHookEvents] = useState<string[]>([]);

  const toggleScope = (s: string) =>
    setKeyScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const toggleEvent = (e: string) =>
    setHookEvents((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));

  return (
    <div className="space-y-5">
      {/* API keys */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Key className="h-4 w-4" /><h3 className="text-sm font-semibold">API keys</h3>
        </div>
        <Card className="mb-3">
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Key name" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
            <div className="flex flex-wrap gap-1 items-center">
              {SCOPES.map((s) => (
                <button key={s} onClick={() => toggleScope(s)}
                  className={`rounded-full px-2 py-1 text-[11px] border ${keyScopes.includes(s) ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 text-right">
            <button className={btnPrimary} disabled={!keyName.trim() || issueKey.isPending}
              onClick={() =>
                issueKey.mutate(
                  { advertiser_id: advertiserId, name: keyName.trim(), scopes: keyScopes },
                  {
                    onSuccess: (r) => { setFreshSecret(r.secret); setKeyName(""); },
                  },
                )
              }>
              <Plus className="h-3 w-3" /> Issue key
            </button>
          </div>
          {freshSecret && (
            <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="text-[11px] font-semibold mb-1">Copy your key now — it won't be shown again.</p>
              <div className="grid grid-cols-[1fr_auto] gap-1">
                <code className="rounded bg-background px-2 py-1 text-[10px] break-all">{freshSecret}</code>
                <button className={btnGhost} onClick={() => copy(freshSecret!)}><Copy className="h-3 w-3" /></button>
              </div>
              <button className="mt-2 text-[10px] underline text-muted-foreground" onClick={() => setFreshSecret(null)}>Dismiss</button>
            </div>
          )}
        </Card>

        <div className="space-y-2">
          {keys.length === 0 ? <p className="text-xs text-muted-foreground">No API keys yet.</p> : keys.map((k) => (
            <Card key={k.id}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{k.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    <code>{k.key_prefix}…</code> · {k.scopes.join(", ")}
                    {k.last_used_at ? ` · used ${new Date(k.last_used_at).toLocaleString()}` : " · never used"}
                    {k.revoked_at ? " · revoked" : ""}
                  </p>
                </div>
                {!k.revoked_at && (
                  <button className={btnDanger} onClick={() => revokeKey.mutate({ id: k.id, advertiser_id: k.advertiser_id })}>
                    <Trash2 className="h-3 w-3" /> Revoke
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] text-muted-foreground">REST API cheatsheet</summary>
          <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-[10px] leading-snug">
{`GET  /aap-api/v1/me
GET  /aap-api/v1/campaigns
GET  /aap-api/v1/campaigns/{id}
POST /aap-api/v1/campaigns              (scope: write)
PATCH /aap-api/v1/campaigns/{id}        (scope: write)
GET  /aap-api/v1/ads
GET  /aap-api/v1/reports?days=30
GET  /aap-api/v1/attributions?days=30

Header:  Authorization: Bearer aak_live_...`}
          </pre>
        </details>
      </div>

      {/* Webhooks */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <WebhookIcon className="h-4 w-4" /><h3 className="text-sm font-semibold">Webhooks</h3>
        </div>
        <Card className="mb-3">
          <div className="grid grid-cols-1 gap-2">
            <input className={inputCls} placeholder="Name" value={hookName} onChange={(e) => setHookName(e.target.value)} />
            <input className={inputCls} placeholder="https://your-server.com/webhooks/aurelix" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} />
            <div className="flex flex-wrap gap-1">
              {EVENT_CATALOG.map((e) => (
                <button key={e} onClick={() => toggleEvent(e)}
                  className={`rounded-full px-2 py-1 text-[11px] border ${hookEvents.includes(e) ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                  {e}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Leave events empty to receive all.</p>
          </div>
          <div className="mt-2 text-right">
            <button className={btnPrimary} disabled={!hookUrl.trim() || createHook.isPending}
              onClick={() => createHook.mutate(
                { advertiser_id: advertiserId, name: hookName.trim() || hookUrl, url: hookUrl.trim(), events: hookEvents },
                { onSuccess: () => { setHookName(""); setHookUrl(""); setHookEvents([]); } },
              )}>
              <Plus className="h-3 w-3" /> Add endpoint
            </button>
          </div>
        </Card>

        <div className="space-y-2">
          {hooks.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" /> No webhook endpoints yet.
            </div>
          ) : hooks.map((w) => <WebhookRow key={w.id} w={w} />)}
        </div>
      </div>
    </div>
  );
}
