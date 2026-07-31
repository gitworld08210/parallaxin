import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Check, ChevronLeft, ChevronRight, Loader2, Sparkles, Target, Layers, MonitorSmartphone,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCreateCampaign, useCreateAdGroup, useCreateAd, useCreatives, useCreateAudience,
} from "@/hooks/ads/useCampaigns";
import { useResolvedAdvertiser, SURFACES, OBJECTIVES, CTA_OPTIONS, compact, inr, CreativeMedia } from "../shared";
import { PreviewSwitcher } from "./AdPreview";

const STEPS = ["Objective", "Campaign", "Ad set", "Ad", "Review"] as const;

const INTERESTS = [
  "Fashion", "Beauty", "Fitness", "Food & Drink", "Travel", "Technology", "Gaming",
  "Music", "Movies", "Education", "Finance", "Startups", "Sports", "Photography",
  "Home Decor", "Automotive", "Parenting", "Health & Wellness",
];

const LOCATIONS = [
  "India", "Delhi NCR", "Mumbai", "Bengaluru", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "United States", "United Kingdom", "UAE",
];

const LANGUAGES = ["Hindi", "English", "Tamil", "Telugu", "Bengali", "Marathi", "Gujarati", "Punjabi"];

export default function CampaignWizard() {
  const navigate = useNavigate();
  const { advertiserId, advertiser } = useResolvedAdvertiser();
  const { data: creatives = [] } = useCreatives(advertiserId);

  const createCampaign = useCreateCampaign();
  const createAdGroup = useCreateAdGroup();
  const createAd = useCreateAd();
  const saveAudience = useCreateAudience();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — objective
  const [objective, setObjective] = useState<string>("traffic");

  // Step 2 — campaign
  const [campaignName, setCampaignName] = useState("");
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [budget, setBudget] = useState(1000);
  const [bidStrategy, setBidStrategy] = useState("lowest_cost");

  // Step 3 — ad set
  const [adSetName, setAdSetName] = useState("");
  const [locations, setLocations] = useState<string[]>(["India"]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(45);
  const [gender, setGender] = useState<"all" | "male" | "female">("all");
  const [interests, setInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [placementMode, setPlacementMode] = useState<"auto" | "manual">("auto");
  const [placements, setPlacements] = useState<string[]>(["feed", "reels", "stories"]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [saveAsAudience, setSaveAsAudience] = useState(false);

  // Step 4 — ad
  const [adName, setAdName] = useState("");
  const [creativeId, setCreativeId] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [cta, setCta] = useState("Learn More");
  const [destinationUrl, setDestinationUrl] = useState("");

  const activePlacements = placementMode === "auto" ? SURFACES.map((s) => s.key) : placements;

  const targeting = useMemo(
    () => ({
      locations,
      age: { min: ageMin, max: ageMax },
      gender,
      interests,
      languages,
      placement_mode: placementMode,
    }),
    [locations, ageMin, ageMax, gender, interests, languages, placementMode],
  );

  // Simple deterministic reach model — narrows with each restriction.
  const estimatedReach = useMemo(() => {
    let base = 42_000_000;
    base *= locations.includes("India") ? 1 : Math.min(1, 0.12 * locations.length || 0.1);
    base *= Math.min(1, Math.max(0.12, (ageMax - ageMin) / 47));
    if (gender !== "all") base *= 0.52;
    if (interests.length) base *= Math.min(1, 0.14 + interests.length * 0.06);
    if (languages.length) base *= Math.min(1, 0.3 + languages.length * 0.12);
    base *= Math.min(1, 0.35 + activePlacements.length * 0.12);
    return Math.max(1200, Math.round(base));
  }, [locations, ageMin, ageMax, gender, interests, languages, activePlacements]);

  const selectedCreative = creatives.find((c: any) => c.id === creativeId);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const canContinue = () => {
    if (step === 0) return !!objective;
    if (step === 1) return campaignName.trim().length > 1 && budget > 0;
    if (step === 2) return adSetName.trim().length > 1 && activePlacements.length > 0 && locations.length > 0;
    if (step === 3) return adName.trim().length > 1 && headline.trim().length > 0;
    return true;
  };

  const launch = async (asDraft: boolean) => {
    if (!advertiserId) { toast.error("No ad account found"); return; }
    setSubmitting(true);
    try {
      const campaign: any = await createCampaign.mutateAsync({
        advertiser_id: advertiserId,
        name: campaignName.trim(),
        objective: objective as any,
        daily_budget: budgetType === "daily" ? budget : null,
        total_budget: budgetType === "lifetime" ? budget : null,
        bid_strategy: bidStrategy,
        start_at: startDate ? new Date(startDate).toISOString() : null,
        end_at: endDate ? new Date(endDate).toISOString() : null,
      } as any);

      const adGroup: any = await createAdGroup.mutateAsync({
        advertiser_id: advertiserId,
        campaign_id: campaign.id,
        name: adSetName.trim(),
        placements: activePlacements,
        targeting,
        estimated_reach: estimatedReach,
        daily_budget: budgetType === "daily" ? budget : null,
        bid_strategy: bidStrategy,
        optimization_goal: objective === "conversions" ? "conversions" : objective === "traffic" ? "clicks" : "impressions",
      } as any);

      await createAd.mutateAsync({
        advertiser_id: advertiserId,
        campaign_id: campaign.id,
        ad_group_id: adGroup.id,
        creative_id: creativeId,
        name: adName.trim(),
        format: activePlacements.includes("reels") || activePlacements.includes("stories") ? "video" : "image",
        headline: headline.trim() || null,
        description: primaryText.trim() || null,
        cta,
        destination_url: destinationUrl.trim() || null,
      } as any);

      if (saveAsAudience) {
        await saveAudience.mutateAsync({
          advertiser_id: advertiserId,
          name: `${adSetName.trim()} audience`,
          targeting,
        } as any);
      }

      toast.success(asDraft ? "Campaign saved as draft" : "Campaign submitted for review");
      navigate("/ads/manager/campaigns");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create the campaign");
    } finally {
      setSubmitting(false);
    }
  };

  const previewData = {
    brand: advertiser?.display_name ?? "Your brand",
    headline: headline || undefined,
    description: primaryText || undefined,
    cta,
    creative: selectedCreative,
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4 pb-24">
      <Helmet>
        <title>Create campaign | Aurelix Ads Manager</title>
        <meta name="description" content="Create Reels, Stories and Feed campaigns with audience targeting, placements and live ad previews." />
      </Helmet>

      {/* Stepper */}
      <ol className="mb-5 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                i === step ? "border-primary bg-primary/10 text-primary"
                  : i < step ? "border-border text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${i < step ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {i < step ? <Check className="h-2.5 w-2.5" /> : i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </li>
        ))}
      </ol>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* Step 0 — Objective */}
          {step === 0 && (
            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Choose a campaign objective</h2>
              <p className="mb-3 text-xs text-muted-foreground">What result do you want from this campaign?</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {OBJECTIVES.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setObjective(o.key)}
                    className={`rounded-xl border p-3 text-left transition ${objective === o.key ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  >
                    <p className="flex items-center gap-2 text-sm font-medium"><Target className="h-4 w-4 text-primary" /> {o.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{o.hint}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Step 1 — Campaign */}
          {step === 1 && (
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Campaign setup</h2>
              <Field label="Campaign name">
                <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Diwali Sale — Reels" className="inp" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Budget type">
                  <div className="flex rounded-xl border border-border p-0.5">
                    {(["daily", "lifetime"] as const).map((t) => (
                      <button key={t} onClick={() => setBudgetType(t)}
                        className={`flex-1 rounded-lg py-1.5 text-xs capitalize ${budgetType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label={`${budgetType === "daily" ? "Daily" : "Lifetime"} budget (₹)`}>
                  <input type="number" min={100} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="inp" />
                </Field>
              </div>
              <Field label="Bid strategy">
                <select value={bidStrategy} onChange={(e) => setBidStrategy(e.target.value)} className="inp">
                  <option value="lowest_cost">Highest volume (lowest cost)</option>
                  <option value="cost_cap">Cost per result goal</option>
                  <option value="bid_cap">Bid cap</option>
                  <option value="target_roas">Target ROAS</option>
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="inp" /></Field>
                <Field label="End date (optional)"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="inp" /></Field>
              </div>
            </section>
          )}

          {/* Step 2 — Ad set */}
          {step === 2 && (
            <>
              <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><Layers className="h-4 w-4" /> Ad set</h2>
                <Field label="Ad set name">
                  <input value={adSetName} onChange={(e) => setAdSetName(e.target.value)} placeholder="e.g. Metro cities 18–34" className="inp" />
                </Field>
              </section>

              <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">Audience</h2>

                <Field label="Locations">
                  <ChipGroup items={LOCATIONS} selected={locations} onToggle={(v) => toggle(locations, setLocations, v)} />
                </Field>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Min age">
                    <input type="number" min={13} max={65} value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} className="inp" />
                  </Field>
                  <Field label="Max age">
                    <input type="number" min={13} max={65} value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} className="inp" />
                  </Field>
                  <Field label="Gender">
                    <select value={gender} onChange={(e) => setGender(e.target.value as any)} className="inp">
                      <option value="all">All</option>
                      <option value="male">Men</option>
                      <option value="female">Women</option>
                    </select>
                  </Field>
                </div>

                <Field label="Interests">
                  <ChipGroup items={INTERESTS} selected={interests} onToggle={(v) => toggle(interests, setInterests, v)} />
                </Field>
                <Field label="Languages">
                  <ChipGroup items={LANGUAGES} selected={languages} onToggle={(v) => toggle(languages, setLanguages, v)} />
                </Field>

                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={saveAsAudience} onChange={(e) => setSaveAsAudience(e.target.checked)} />
                  Save this audience for reuse
                </label>
              </section>

              <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">Placements</h2>
                <div className="flex rounded-xl border border-border p-0.5">
                  {(["auto", "manual"] as const).map((m) => (
                    <button key={m} onClick={() => setPlacementMode(m)}
                      className={`flex-1 rounded-lg py-1.5 text-xs ${placementMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {m === "auto" ? "Advantage+ placements" : "Manual placements"}
                    </button>
                  ))}
                </div>
                {placementMode === "manual" ? (
                  <div className="space-y-1.5">
                    {SURFACES.map((s) => (
                      <label key={s.key} className="flex items-start gap-2 rounded-xl border border-border px-3 py-2">
                        <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 accent-primary"
                          checked={placements.includes(s.key)}
                          onChange={() => toggle(placements, setPlacements, s.key)} />
                        <span>
                          <span className="block text-xs font-medium">{s.label}</span>
                          <span className="block text-[11px] text-muted-foreground">{s.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Aurelix will automatically deliver across Feed, Reels, Stories, Explore and In-Stream to get the best results for your budget.
                  </p>
                )}
              </section>
            </>
          )}

          {/* Step 3 — Ad */}
          {step === 3 && (
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><MonitorSmartphone className="h-4 w-4" /> Ad creative</h2>
              <Field label="Ad name">
                <input value={adName} onChange={(e) => setAdName(e.target.value)} placeholder="e.g. Reel — Diwali offer v1" className="inp" />
              </Field>

              <Field label="Select a creative">
                {creatives.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                    No creatives yet. Upload media in the Creatives section, then come back.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {creatives.map((c: any) => (
                      <button key={c.id} onClick={() => setCreativeId(c.id === creativeId ? null : c.id)}
                        className={`overflow-hidden rounded-xl border ${creativeId === c.id ? "border-primary ring-2 ring-primary/40" : "border-border"}`}>
                        <CreativeMedia creative={c} className="aspect-square w-full object-cover" />
                        <span className="block truncate px-1.5 py-1 text-[10px]">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </Field>

              <Field label="Headline">
                <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={60} placeholder="Up to 60 characters" className="inp" />
              </Field>
              <Field label="Primary text">
                <textarea value={primaryText} onChange={(e) => setPrimaryText(e.target.value)} rows={3} maxLength={280}
                  placeholder="Tell people what makes this offer worth tapping" className="inp resize-none" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Call to action">
                  <select value={cta} onChange={(e) => setCta(e.target.value)} className="inp">
                    {CTA_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Destination URL">
                  <input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://" className="inp" />
                </Field>
              </div>
            </section>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Review &amp; publish</h2>
              <Row label="Objective" value={OBJECTIVES.find((o) => o.key === objective)?.label ?? objective} />
              <Row label="Campaign" value={campaignName || "—"} />
              <Row label="Budget" value={`${inr(budget)} ${budgetType}`} />
              <Row label="Ad set" value={adSetName || "—"} />
              <Row label="Locations" value={locations.join(", ") || "—"} />
              <Row label="Age / gender" value={`${ageMin}–${ageMax} · ${gender}`} />
              <Row label="Interests" value={interests.length ? interests.join(", ") : "Broad"} />
              <Row label="Placements" value={activePlacements.map((p) => SURFACES.find((s) => s.key === p)?.label ?? p).join(", ")} />
              <Row label="Estimated reach" value={`${compact(estimatedReach * 0.4)} – ${compact(estimatedReach)} people/day`} />
              <Row label="Ad" value={adName || "—"} />
              <p className="pt-2 text-[11px] text-muted-foreground">
                Ads go to Aurelix review before delivery starts. You can pause or edit anytime from the Campaigns table.
              </p>
            </section>
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold">Estimated daily reach</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {compact(estimatedReach * 0.4)} – {compact(estimatedReach)}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(6, (estimatedReach / 42_000_000) * 100))}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Based on your locations, age, gender, interests and {activePlacements.length} placements.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5 text-primary" /> Ad preview</p>
            <div className="max-h-[600px] overflow-y-auto">
              <PreviewSwitcher data={previewData} surfaces={activePlacements} />
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <button onClick={() => (step === 0 ? navigate("/ads/manager") : setStep((s) => s - 1))}
          className="flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs">
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
        <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        <div className="ml-auto flex items-center gap-2">
          {step === STEPS.length - 1 ? (
            <>
              <button disabled={submitting} onClick={() => launch(true)} className="rounded-xl border border-border px-3 py-2 text-xs">
                Save as draft
              </button>
              <button disabled={submitting} onClick={() => launch(false)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Publish campaign
              </button>
            </>
          ) : (
            <button disabled={!canContinue()} onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <style>{`.inp{width:100%;border-radius:0.75rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.8125rem}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-1.5 text-xs last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function ChipGroup({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <button key={i} onClick={() => onToggle(i)}
          className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
            selected.includes(i) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
          }`}>
          {i}
        </button>
      ))}
    </div>
  );
}
