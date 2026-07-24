import { useState, useMemo } from "react";
import { useParams, Link, Routes, Route, useNavigate } from "react-router-dom";
import { useAdvertiser } from "@/hooks/ads/useAdvertiser";
import {
  useCampaigns, useCreateCampaign, useUpdateCampaignStatus,
  useAdGroups, useCreateAdGroup,
  useAds, useCreateAd, useSubmitAdForReview,
  useCreatives, useCreateCreative,
  useAudiences, useCreateAudience,
  type CampaignObjective, type AdFormat, type Placement,
} from "@/hooks/ads/useCampaigns";
import { useEstimateReach, useCreateLookalike, useUpdatePacing, useResumeAdGroup } from "@/hooks/ads/useDelivery";
import { ExperimentsPanel, BrandSafetyPanel, AdGroupSafetyPanel } from "./ExperimentsAndSafety";
import { ArrowLeft, Plus, Play, Pause, Send, Megaphone, Layers, Image as ImageIcon, Users, BarChart3, Wallet, Sparkles, Gauge, AlertCircle, FlaskConical, Shield } from "lucide-react";

const PLACEMENTS: Placement[] = ["feed", "reels", "stories", "explore", "search", "profile", "organization"];
const OBJECTIVES: CampaignObjective[] = ["awareness", "reach", "engagement", "traffic", "app_promotion", "video_views", "conversions"];
const FORMATS: AdFormat[] = ["image", "video", "carousel", "story", "feed", "reels", "search", "sponsored_profile", "sponsored_organization"];
const GENDERS = ["male", "female", "other"];

function Card({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={`rounded-2xl border border-border bg-secondary/40 p-4 ${className}`}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";
const btnPrimary = "inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnGhost = "inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-secondary/60";

/* --------------------------------- Overview --------------------------------- */

function Overview({ advertiserId }: { advertiserId: string }) {
  const { data: campaigns = [] } = useCampaigns(advertiserId);
  const running = campaigns.filter((c: any) => c.status === "running").length;
  const draft = campaigns.filter((c: any) => c.status === "draft").length;
  const spent = campaigns.reduce((s: number, c: any) => s + Number(c.spent ?? 0), 0);
  const tiles = [
    { icon: Megaphone, label: "Running", value: running },
    { icon: Layers, label: "Drafts", value: draft },
    { icon: BarChart3, label: "Total campaigns", value: campaigns.length },
    { icon: Wallet, label: "Lifetime spend", value: `₹${spent.toFixed(0)}` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((t) => (
        <Card key={t.label}>
          <t.icon className="h-4 w-4 text-muted-foreground" />
          <p className="mt-2 text-xl font-bold tracking-tight">{t.value}</p>
          <p className="text-xs text-muted-foreground">{t.label}</p>
        </Card>
      ))}
    </div>
  );
}

/* --------------------------------- Campaigns -------------------------------- */

function CampaignsList({ advertiserId }: { advertiserId: string }) {
  const nav = useNavigate();
  const { data: campaigns = [], isLoading } = useCampaigns(advertiserId);
  const create = useCreateCampaign();
  const setStatus = useUpdateCampaignStatus();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", objective: "engagement" as CampaignObjective, daily_budget: "" });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Campaigns</h2>
        <button onClick={() => setOpen((v) => !v)} className={btnPrimary}>
          <Plus className="h-3 w-3" /> New
        </button>
      </div>

      {open && (
        <Card className="mb-3 space-y-3">
          <Field label="Name">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Objective">
            <select className={inputCls} value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value as CampaignObjective })}>
              {OBJECTIVES.map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
            </select>
          </Field>
          <Field label="Daily budget (₹)">
            <input type="number" min={0} className={inputCls} value={form.daily_budget}
              onChange={(e) => setForm({ ...form, daily_budget: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
            <button
              className={btnPrimary}
              disabled={!form.name || create.isPending}
              onClick={async () => {
                await create.mutateAsync({
                  advertiser_id: advertiserId,
                  name: form.name,
                  objective: form.objective,
                  daily_budget: form.daily_budget ? Number(form.daily_budget) : null,
                });
                setForm({ name: "", objective: "engagement", daily_budget: "" });
                setOpen(false);
              }}
            >Create</button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : campaigns.length === 0 ? (
        <Card><p className="text-sm text-muted-foreground">No campaigns yet. Create your first one to start advertising.</p></Card>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c: any) => (
            <Card key={c.id} className="flex items-center justify-between gap-2">
              <button className="flex-1 text-left" onClick={() => nav(`campaigns/${c.id}`)}>
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.objective} · {c.status} · daily ₹{c.daily_budget ?? "—"} · spent ₹{Number(c.spent ?? 0).toFixed(0)}
                </p>
              </button>
              {c.status === "running" ? (
                <button className={btnGhost} onClick={() => setStatus.mutate({ id: c.id, status: "paused" })}>
                  <Pause className="h-3 w-3" /> Pause
                </button>
              ) : c.status === "paused" || c.status === "approved" ? (
                <button className={btnGhost} onClick={() => setStatus.mutate({ id: c.id, status: "running" })}>
                  <Play className="h-3 w-3" /> Run
                </button>
              ) : c.status === "draft" ? (
                <button className={btnGhost} onClick={() => setStatus.mutate({ id: c.id, status: "pending_review" })}>
                  <Send className="h-3 w-3" /> Submit
                </button>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Campaign Detail --------------------------------- */

function CampaignDetail({ advertiserId }: { advertiserId: string }) {
  const { campaignId } = useParams();
  const { data: groups = [], isLoading } = useAdGroups(campaignId);
  const { data: audiences = [] } = useAudiences(advertiserId);
  const create = useCreateAdGroup();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; audience_id: string; daily_budget: string; placements: Placement[] }>({
    name: "", audience_id: "", daily_budget: "", placements: ["feed", "reels"],
  });
  const nav = useNavigate();

  const togglePlacement = (p: Placement) => {
    setForm((f) => ({
      ...f,
      placements: f.placements.includes(p) ? f.placements.filter((x) => x !== p) : [...f.placements, p],
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Ad groups</h2>
        <button className={btnPrimary} onClick={() => setOpen((v) => !v)}>
          <Plus className="h-3 w-3" /> New
        </button>
      </div>
      {open && (
        <Card className="mb-3 space-y-3">
          <Field label="Name">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Audience">
            <select className={inputCls} value={form.audience_id}
              onChange={(e) => setForm({ ...form, audience_id: e.target.value })}>
              <option value="">Broad (auto-target)</option>
              {audiences.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Placements">
            <div className="flex flex-wrap gap-1">
              {PLACEMENTS.map((p) => {
                const on = form.placements.includes(p);
                return (
                  <button key={p} type="button" onClick={() => togglePlacement(p)}
                    className={`rounded-full px-3 py-1 text-xs border ${on ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background"}`}>
                    {p}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Daily budget (₹)">
            <input type="number" min={0} className={inputCls} value={form.daily_budget}
              onChange={(e) => setForm({ ...form, daily_budget: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
            <button className={btnPrimary} disabled={!form.name || create.isPending}
              onClick={async () => {
                await create.mutateAsync({
                  advertiser_id: advertiserId,
                  campaign_id: campaignId!,
                  name: form.name,
                  audience_id: form.audience_id || null,
                  daily_budget: form.daily_budget ? Number(form.daily_budget) : null,
                  placements: form.placements,
                });
                setForm({ name: "", audience_id: "", daily_budget: "", placements: ["feed", "reels"] });
                setOpen(false);
              }}
            >Create</button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <Card><p className="text-sm text-muted-foreground">No ad groups yet.</p></Card>
      ) : (
        <div className="space-y-2">
          {groups.map((g: any) => (
            <Card key={g.id} className="cursor-pointer" onClick={() => nav(`groups/${g.id}`)}>
              <p className="text-sm font-semibold">{g.name}</p>
              <p className="text-xs text-muted-foreground">
                {g.status} · {(g.placements ?? []).join(", ") || "no placements"} · daily ₹{g.daily_budget ?? "—"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Ad Group Detail --------------------------------- */

function DeliveryPanel({ group }: { group: any }) {
  const update = useUpdatePacing();
  const resume = useResumeAdGroup();
  const [form, setForm] = useState({
    pacing_type: group.pacing_type ?? "standard",
    daily_budget: group.daily_budget ?? "",
    daily_impression_cap: group.daily_impression_cap ?? "",
    frequency_cap_per_user: group.frequency_cap_per_user ?? "",
    frequency_cap_window_hours: group.frequency_cap_window_hours ?? 24,
  });
  return (
    <Card className="mb-3 space-y-3">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Delivery & pacing</h3>
      </div>
      {group.auto_paused_reason && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
          <AlertCircle className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
          <div className="flex-1">
            Auto-paused: <span className="font-medium">{group.auto_paused_reason.replace(/_/g, " ")}</span>
          </div>
          <button className={btnGhost} onClick={() => resume.mutate(group.id)}>Resume</button>
        </div>
      )}
      <Field label="Pacing">
        <select className={inputCls} value={form.pacing_type}
          onChange={(e) => setForm({ ...form, pacing_type: e.target.value as any })}>
          <option value="standard">Standard — even spend across the day</option>
          <option value="accelerated">Accelerated — spend as fast as possible</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Daily budget (₹)">
          <input type="number" className={inputCls} value={form.daily_budget}
            onChange={(e) => setForm({ ...form, daily_budget: e.target.value })} />
        </Field>
        <Field label="Daily impression cap">
          <input type="number" className={inputCls} value={form.daily_impression_cap}
            onChange={(e) => setForm({ ...form, daily_impression_cap: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Freq. cap / user">
          <input type="number" className={inputCls} value={form.frequency_cap_per_user}
            onChange={(e) => setForm({ ...form, frequency_cap_per_user: e.target.value })} />
        </Field>
        <Field label="Window (hours)">
          <input type="number" className={inputCls} value={form.frequency_cap_window_hours}
            onChange={(e) => setForm({ ...form, frequency_cap_window_hours: Number(e.target.value) })} />
        </Field>
      </div>
      <div className="flex justify-end">
        <button className={btnPrimary} disabled={update.isPending}
          onClick={() => update.mutate({
            ad_group_id: group.id,
            pacing_type: form.pacing_type,
            daily_budget: form.daily_budget === "" ? null : Number(form.daily_budget),
            daily_impression_cap: form.daily_impression_cap === "" ? null : Number(form.daily_impression_cap),
            frequency_cap_per_user: form.frequency_cap_per_user === "" ? null : Number(form.frequency_cap_per_user),
            frequency_cap_window_hours: Number(form.frequency_cap_window_hours) || 24,
          })}
        >Save delivery</button>
      </div>
    </Card>
  );
}

function AdGroupDetail({ advertiserId }: { advertiserId: string }) {
  const { campaignId, groupId } = useParams();
  const { data: ads = [], isLoading } = useAds(groupId);
  const { data: creatives = [] } = useCreatives(advertiserId);
  const { data: groups = [] } = useAdGroups(campaignId);
  const group = groups.find((g: any) => g.id === groupId);
  const create = useCreateAd();
  const submit = useSubmitAdForReview();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", format: "image" as AdFormat, headline: "", description: "",
    cta: "Learn more", destination_url: "", creative_id: "",
  });

  return (
    <div>
      {group && <DeliveryPanel group={group} />}
      {group && <div className="mb-3"><AdGroupSafetyPanel group={group} /></div>}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Ads</h2>
        <button className={btnPrimary} onClick={() => setOpen((v) => !v)}>
          <Plus className="h-3 w-3" /> New
        </button>
      </div>
      {open && (
        <Card className="mb-3 space-y-3">
          <Field label="Name">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Format">
            <select className={inputCls} value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value as AdFormat })}>
              {FORMATS.map((f) => <option key={f} value={f}>{f.replace("_", " ")}</option>)}
            </select>
          </Field>
          <Field label="Creative">
            <select className={inputCls} value={form.creative_id}
              onChange={(e) => setForm({ ...form, creative_id: e.target.value })}>
              <option value="">— link creative later —</option>
              {creatives.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Headline">
            <input className={inputCls} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} maxLength={40} />
          </Field>
          <Field label="Description">
            <textarea className={inputCls} rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={125} />
          </Field>
          <Field label="Destination URL">
            <input className={inputCls} placeholder="https://…" value={form.destination_url}
              onChange={(e) => setForm({ ...form, destination_url: e.target.value })} />
          </Field>
          <Field label="Call to action">
            <input className={inputCls} value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
            <button className={btnPrimary} disabled={!form.name || create.isPending}
              onClick={async () => {
                await create.mutateAsync({
                  advertiser_id: advertiserId,
                  campaign_id: campaignId!,
                  ad_group_id: groupId!,
                  creative_id: form.creative_id || null,
                  name: form.name,
                  format: form.format,
                  headline: form.headline || null,
                  description: form.description || null,
                  cta: form.cta || null,
                  destination_url: form.destination_url || null,
                });
                setForm({ name: "", format: "image", headline: "", description: "", cta: "Learn more", destination_url: "", creative_id: "" });
                setOpen(false);
              }}
            >Create</button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : ads.length === 0 ? (
        <Card><p className="text-sm text-muted-foreground">No ads yet.</p></Card>
      ) : (
        <div className="space-y-2">
          {ads.map((a: any) => (
            <Card key={a.id} className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-semibold">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.format} · {a.status} · review: {a.review_state}</p>
                {a.headline && <p className="text-xs mt-1 line-clamp-1">{a.headline}</p>}
              </div>
              {a.status === "draft" && (
                <button className={btnGhost} onClick={() => submit.mutate(a.id)}>
                  <Send className="h-3 w-3" /> Submit
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Creatives -------------------------------- */

function CreativesLibrary({ advertiserId }: { advertiserId: string }) {
  const { data: creatives = [], isLoading } = useCreatives(advertiserId);
  const create = useCreateCreative();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", format: "image" as AdFormat, media_url: "" });
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Creative library</h2>
        <button className={btnPrimary} onClick={() => setOpen((v) => !v)}>
          <Plus className="h-3 w-3" /> Upload URL
        </button>
      </div>
      {open && (
        <Card className="mb-3 space-y-3">
          <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Format">
            <select className={inputCls} value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as AdFormat })}>
              {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Media URL"><input className={inputCls} value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
            <button className={btnPrimary} disabled={!form.name || create.isPending}
              onClick={async () => {
                await create.mutateAsync({
                  advertiser_id: advertiserId,
                  name: form.name, format: form.format,
                  media_url: form.media_url || null,
                });
                setForm({ name: "", format: "image", media_url: "" });
                setOpen(false);
              }}>Save</button>
          </div>
        </Card>
      )}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : creatives.length === 0 ? (
        <Card><p className="text-sm text-muted-foreground">No creatives yet. Upload an image, video, or carousel to reuse across ads.</p></Card>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {creatives.map((c: any) => (
            <Card key={c.id}>
              <div className="aspect-video rounded-lg bg-muted mb-2 grid place-items-center overflow-hidden">
                {c.media_url ? <img src={c.media_url} alt={c.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
              </div>
              <p className="text-xs font-semibold truncate">{c.name}</p>
              <p className="text-[10px] text-muted-foreground">{c.format}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Audiences -------------------------------- */

function AudienceCard({ a, onLookalike }: { a: any; onLookalike: (id: string, name: string) => void }) {
  const t = a.targeting ?? {};
  const geo = Array.isArray(t.locations) ? t.locations : Array.isArray(t.geo) ? t.geo : [];
  const interests = Array.isArray(t.interests) ? t.interests : [];
  const genders = Array.isArray(t.genders) ? t.genders : [];
  const ageMin = t.min_age ?? t.age?.min;
  const ageMax = t.max_age ?? t.age?.max;
  const { data: reach } = useEstimateReach(t);
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{a.name}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
            {a.audience_type ?? "custom"}
            {a.lookalike_similarity ? ` · ${Math.round(a.lookalike_similarity * 100)}%` : ""}
          </p>
        </div>
        {a.audience_type !== "lookalike" && (
          <button className={btnGhost} onClick={() => onLookalike(a.id, a.name)}>
            <Sparkles className="h-3 w-3" /> Lookalike
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {ageMin != null && ageMax != null && (
          <span className="text-[10px] rounded-full bg-secondary px-2 py-0.5">Age {ageMin}–{ageMax}</span>
        )}
        {genders.map((g: string) => <span key={g} className="text-[10px] rounded-full bg-secondary px-2 py-0.5">{g}</span>)}
        {geo.slice(0, 3).map((g: string) => <span key={g} className="text-[10px] rounded-full bg-secondary px-2 py-0.5">{g}</span>)}
        {interests.slice(0, 4).map((i: string) => <span key={i} className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5">{i}</span>)}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Est. reach</span>
        <span className="font-semibold">{reach != null ? Number(reach).toLocaleString() : "—"}</span>
      </div>
    </Card>
  );
}

function AudiencesLibrary({ advertiserId }: { advertiserId: string }) {
  const { data: audiences = [], isLoading } = useAudiences(advertiserId);
  const create = useCreateAudience();
  const lookalike = useCreateLookalike();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", age_min: "18", age_max: "65", interests: "", locations: "IN",
    genders: [] as string[],
  });
  const [laOpen, setLaOpen] = useState<null | { seedId: string; seedName: string }>(null);
  const [laForm, setLaForm] = useState({ name: "", similarity: 0.5 });

  const targetingPreview = useMemo(() => ({
    min_age: Number(form.age_min) || undefined,
    max_age: Number(form.age_max) || undefined,
    locations: form.locations.split(",").map((s) => s.trim()).filter(Boolean),
    interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
    genders: form.genders,
  }), [form]);
  const { data: previewReach } = useEstimateReach(open ? targetingPreview : null);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Saved audiences</h2>
        <button className={btnPrimary} onClick={() => setOpen((v) => !v)}>
          <Plus className="h-3 w-3" /> New
        </button>
      </div>
      {open && (
        <Card className="mb-3 space-y-3">
          <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Age min"><input type="number" className={inputCls} value={form.age_min} onChange={(e) => setForm({ ...form, age_min: e.target.value })} /></Field>
            <Field label="Age max"><input type="number" className={inputCls} value={form.age_max} onChange={(e) => setForm({ ...form, age_max: e.target.value })} /></Field>
          </div>
          <Field label="Genders">
            <div className="flex flex-wrap gap-1">
              {GENDERS.map((g) => {
                const on = form.genders.includes(g);
                return (
                  <button type="button" key={g}
                    onClick={() => setForm({ ...form, genders: on ? form.genders.filter((x) => x !== g) : [...form.genders, g] })}
                    className={`rounded-full px-2 py-1 text-xs border ${on ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background"}`}
                  >{g}</button>
                );
              })}
            </div>
          </Field>
          <Field label="Locations (comma separated country codes)">
            <input className={inputCls} value={form.locations} onChange={(e) => setForm({ ...form, locations: e.target.value })} />
          </Field>
          <Field label="Interests (comma separated)">
            <input className={inputCls} value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
          </Field>
          <div className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Estimated reach</span>
            <span className="font-semibold">{previewReach != null ? Number(previewReach).toLocaleString() : "—"}</span>
          </div>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
            <button className={btnPrimary} disabled={!form.name || create.isPending}
              onClick={async () => {
                await create.mutateAsync({
                  advertiser_id: advertiserId,
                  name: form.name,
                  targeting: targetingPreview,
                });
                setForm({ name: "", age_min: "18", age_max: "65", interests: "", locations: "IN", genders: [] });
                setOpen(false);
              }}>Save</button>
          </div>
        </Card>
      )}
      {laOpen && (
        <Card className="mb-3 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Lookalike of "{laOpen.seedName}"</h3>
          </div>
          <Field label="Name"><input className={inputCls} value={laForm.name} onChange={(e) => setLaForm({ ...laForm, name: e.target.value })} placeholder={`Lookalike of ${laOpen.seedName}`} /></Field>
          <Field label={`Similarity: ${Math.round(laForm.similarity * 100)}%`}>
            <input type="range" min={0.1} max={1} step={0.05} value={laForm.similarity}
              onChange={(e) => setLaForm({ ...laForm, similarity: Number(e.target.value) })}
              className="w-full" />
            <p className="text-[10px] text-muted-foreground mt-1">
              Lower % = larger, less similar. Higher % = tighter, more similar to seed.
            </p>
          </Field>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setLaOpen(null)}>Cancel</button>
            <button className={btnPrimary} disabled={lookalike.isPending}
              onClick={async () => {
                await lookalike.mutateAsync({
                  advertiser_id: advertiserId,
                  seed_audience_id: laOpen.seedId,
                  name: laForm.name || `Lookalike of ${laOpen.seedName}`,
                  similarity: laForm.similarity,
                });
                setLaForm({ name: "", similarity: 0.5 });
                setLaOpen(null);
              }}>Create lookalike</button>
          </div>
        </Card>
      )}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : audiences.length === 0 ? (
        <Card><p className="text-sm text-muted-foreground">No saved audiences yet.</p></Card>
      ) : (
        <div className="space-y-2">
          {audiences.map((a: any) => (
            <AudienceCard key={a.id} a={a}
              onLookalike={(id, name) => { setLaOpen({ seedId: id, seedName: name }); setLaForm({ name: `Lookalike of ${name}`, similarity: 0.5 }); }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Shell --------------------------------- */

const TABS: { key: string; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "campaigns", label: "Campaigns", icon: Megaphone },
  { key: "creatives", label: "Creatives", icon: ImageIcon },
  { key: "audiences", label: "Audiences", icon: Users },
  { key: "experiments", label: "Experiments", icon: FlaskConical },
  { key: "safety", label: "Brand safety", icon: Shield },
];

export default function AdvertiserShell() {
  const { advertiserId } = useParams();
  const { data, isLoading } = useAdvertiser(advertiserId);
  const [tab, setTab] = useState<string>("overview");

  if (!advertiserId) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-6">
        <Link to="/ads" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ArrowLeft className="h-3 w-3" /> Business Center
        </Link>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">Advertiser not found.</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">{data.display_name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data.type} · {data.status} · {data.billing_mode.replace("_", " ")}
            </p>

            <div className="flex gap-2 mt-3">
              <Link to={`/ads/${advertiserId}/analytics`} className={btnGhost}>
                <BarChart3 className="h-3 w-3" /> Analytics
              </Link>
              <Link to={`/ads/${advertiserId}/billing`} className={btnGhost}>
                <Wallet className="h-3 w-3" /> Billing
              </Link>
            </div>

            <div className="flex gap-1 mt-4 mb-4 overflow-x-auto scrollbar-none">
              {TABS.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap border ${
                    tab === t.key ? "bg-primary text-primary-foreground border-primary" : "border-border bg-secondary/40"
                  }`}>
                  <t.icon className="h-3 w-3" /> {t.label}
                </button>
              ))}
            </div>

            <Routes>
              <Route index element={
                tab === "overview" ? <Overview advertiserId={advertiserId} />
                : tab === "campaigns" ? <CampaignsList advertiserId={advertiserId} />
                : tab === "creatives" ? <CreativesLibrary advertiserId={advertiserId} />
                : <AudiencesLibrary advertiserId={advertiserId} />
              } />
              <Route path="campaigns/:campaignId" element={<CampaignDetail advertiserId={advertiserId} />} />
              <Route path="campaigns/:campaignId/groups/:groupId" element={<AdGroupDetail advertiserId={advertiserId} />} />
            </Routes>
          </>
        )}
      </div>
    </div>
  );
}
