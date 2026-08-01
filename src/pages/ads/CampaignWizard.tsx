import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AdPreview } from "./components/AdPreview";
import { useCreatives } from "@/hooks/ads/useAdsEntities";
import {
  CTAS,
  DEFAULT_TARGETING,
  INTERESTS,
  LANGUAGES,
  LOCATIONS,
  OBJECTIVES,
  OPTIMIZATION_GOALS,
  PLACEMENTS,
  fmtCompact,
  type Placement,
  type Targeting,
} from "./lib";

const STEPS = ["Objective", "Budget", "Audience", "Placements", "Creative"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export default function CampaignWizard() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { creatives, urls } = useCreatives(accountId);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("New campaign");
  const [objective, setObjective] = useState("traffic");
  const [budgetType, setBudgetType] = useState("daily");
  const [budget, setBudget] = useState(500);
  const [goal, setGoal] = useState("reach");
  const [targeting, setTargeting] = useState<Targeting>(DEFAULT_TARGETING);
  const [placementMode, setPlacementMode] = useState<"auto" | "manual">("auto");
  const [placements, setPlacements] = useState<Placement[]>(["reels", "stories", "feed", "explore"]);
  const [creativeId, setCreativeId] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [cta, setCta] = useState("learn_more");
  const [url, setUrl] = useState("");
  const [reach, setReach] = useState(0);
  const [previewPlacement, setPreviewPlacement] = useState<Placement>("reels");

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("ads_estimate_reach", {
        _targeting: targeting as any,
        _placements: placements,
      });
      setReach(Number(data ?? 0));
    }, 400);
    return () => clearTimeout(t);
  }, [targeting, placements]);

  const selectedCreative = useMemo(() => creatives.find((c) => c.id === creativeId), [creatives, creativeId]);

  const toggleIn = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const publish = async () => {
    if (!accountId || !user) return;
    setSaving(true);
    try {
      const { data: campaign, error: cErr } = await supabase
        .from("ads_campaigns")
        .insert({
          account_id: accountId,
          name,
          objective,
          budget_type: budgetType,
          budget_coins: budget,
          status: "active",
          created_by: user.id,
        })
        .select()
        .single();
      if (cErr) throw cErr;

      const { data: adset, error: sErr } = await supabase
        .from("ads_adsets")
        .insert({
          campaign_id: campaign.id,
          account_id: accountId,
          name: `${name} — ad set`,
          status: "active",
          daily_budget_coins: budgetType === "daily" ? budget : Math.round(budget / 7),
          optimization_goal: goal,
          placement_mode: placementMode,
          placements: placementMode === "auto" ? PLACEMENTS.map((p) => p.id) : placements,
          targeting: targeting as any,
          estimated_reach: reach,
        })
        .select()
        .single();
      if (sErr) throw sErr;

      const { error: aErr } = await supabase.from("ads_ads").insert({
        adset_id: adset.id,
        account_id: accountId,
        creative_id: creativeId,
        name: `${name} — ad`,
        headline,
        primary_text: primaryText,
        cta,
        destination_url: url || null,
        status: "active",
        review_state: "pending",
      });
      if (aErr) throw aErr;

      toast.success("Campaign submitted — Trust & Safety review me chala gaya");
      navigate(`/ads/${accountId}/campaigns`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not publish");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Create campaign</h1>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3 w-3" /> : <span className="tabular-nums">{i + 1}</span>}
              {s}
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-border" />}
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="space-y-5 p-5">
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="c-name">Campaign name</Label>
                <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {OBJECTIVES.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setObjective(o.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      objective === o.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="text-sm font-medium">{o.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{o.desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <Label>Budget type</Label>
                <Select value={budgetType} onValueChange={setBudgetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily budget</SelectItem>
                    <SelectItem value="lifetime">Lifetime budget</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-budget">Budget (Aurelix Coins)</Label>
                <Input
                  id="c-budget"
                  type="number"
                  min={100}
                  value={budget}
                  onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))}
                  className="tabular-nums"
                />
                <p className="text-[11px] text-muted-foreground">
                  Spend aapke universal Aurelix Coin wallet se katega. Balance khatam hone par campaign auto-pause ho jayega.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Optimisation goal</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPTIMIZATION_GOALS.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Locations</Label>
                <div className="flex flex-wrap gap-1.5">
                  {LOCATIONS.map((l) => (
                    <Chip
                      key={l}
                      active={targeting.locations.includes(l)}
                      onClick={() => setTargeting({ ...targeting, locations: toggleIn(targeting.locations, l) })}
                    >
                      {l}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Age <span className="tabular-nums text-muted-foreground">{targeting.age_min}–{targeting.age_max}</span>
                </Label>
                <Slider
                  min={13}
                  max={65}
                  step={1}
                  value={[targeting.age_min, targeting.age_max]}
                  onValueChange={([a, b]) => setTargeting({ ...targeting, age_min: a, age_max: b })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="flex gap-1.5">
                  {["male", "female", "other"].map((g) => (
                    <Chip
                      key={g}
                      active={targeting.genders.includes(g)}
                      onClick={() => setTargeting({ ...targeting, genders: toggleIn(targeting.genders, g) })}
                    >
                      <span className="capitalize">{g}</span>
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Languages</Label>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map((l) => (
                    <Chip
                      key={l}
                      active={targeting.languages.includes(l)}
                      onClick={() => setTargeting({ ...targeting, languages: toggleIn(targeting.languages, l) })}
                    >
                      {l}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Interests</Label>
                <div className="flex flex-wrap gap-1.5">
                  {INTERESTS.map((i) => (
                    <Chip
                      key={i}
                      active={targeting.interests.includes(i)}
                      onClick={() => setTargeting({ ...targeting, interests: toggleIn(targeting.interests, i) })}
                    >
                      {i}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Advantage+ placements</p>
                  <p className="text-[11px] text-muted-foreground">
                    Aurelix automatically best performing placements par budget lagayega.
                  </p>
                </div>
                <Switch
                  checked={placementMode === "auto"}
                  onCheckedChange={(v) => setPlacementMode(v ? "auto" : "manual")}
                  aria-label="Toggle automatic placements"
                />
              </div>
              {placementMode === "manual" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {PLACEMENTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlacements(toggleIn(placements, p.id) as Placement[])}
                      className={`rounded-xl border p-3 text-left transition ${
                        placements.includes(p.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{p.label}</p>
                        <Badge variant="outline" className="text-[10px]">{p.ratio}</Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{p.hint}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label>Creative</Label>
                {creatives.length ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {creatives.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCreativeId(c.id)}
                        className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                          creativeId === c.id ? "border-primary" : "border-transparent"
                        }`}
                      >
                        {c.media_type === "video" ? (
                          <video src={urls[c.id]} className="h-full w-full object-cover" muted />
                        ) : (
                          <img src={urls[c.id]} alt={c.name} className="h-full w-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Koi creative nahi — pehle Creatives page se image ya video upload kariye.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-head">Headline</Label>
                <Input id="c-head" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={60} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-text">Primary text</Label>
                <Textarea id="c-text" value={primaryText} onChange={(e) => setPrimaryText(e.target.value)} rows={3} maxLength={200} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Call to action</Label>
                  <Select value={cta} onValueChange={setCta}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CTAS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-url">Destination URL</Label>
                  <Input id="c-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 border-t border-border pt-4">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button className="ml-auto gap-1.5" onClick={() => setStep(step + 1)}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button className="ml-auto gap-1.5" onClick={publish} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Publish
              </Button>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Estimated daily reach
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums">{fmtCompact(reach)}</p>
          </Card>

          <div className="flex flex-wrap gap-1.5">
            {PLACEMENTS.map((p) => (
              <Chip key={p.id} active={previewPlacement === p.id} onClick={() => setPreviewPlacement(p.id)}>
                {p.label}
              </Chip>
            ))}
          </div>

          <AdPreview
            placement={previewPlacement}
            data={{
              brand: name || "Your brand",
              headline,
              primaryText,
              cta,
              mediaUrl: selectedCreative ? urls[selectedCreative.id] : null,
              mediaType: selectedCreative?.media_type,
            }}
          />
        </div>
      </div>
    </div>
  );
}
