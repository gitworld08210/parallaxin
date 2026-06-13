import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Sparkles, DollarSign, BarChart3, ShieldCheck, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

type Props = { open: boolean; onOpenChange: (b: boolean) => void };

const FALLBACK_VERSION = "2026-06-13";
const FALLBACK_SPLIT = { creator: 85, platform: 15 };

export const BecomeCreatorSheet = ({ open, onOpenChange }: Props) => {
  const { refreshProfile } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [split, setSplit] = useState(FALLBACK_SPLIT);
  const [version, setVersion] = useState(FALLBACK_VERSION);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("app_config")
        .select("key, value")
        .in("key", ["creator_revenue_split", "creator_terms_version"]);
      for (const row of data ?? []) {
        if (row.key === "creator_revenue_split" && row.value) {
          const v: any = row.value;
          if (typeof v?.creator === "number" && typeof v?.platform === "number") setSplit(v);
        }
        if (row.key === "creator_terms_version" && typeof row.value === "string") {
          setVersion(row.value as string);
        }
      }
    })();
  }, [open]);

  const submit = async () => {
    if (!agreed) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("become_creator" as any, { _terms_version: version });
    setSubmitting(false);
    if (error) { toast.error(error.message || "Could not enable creator mode"); return; }
    toast.success("Welcome, Creator ✦");
    await refreshProfile();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-background border-t border-border px-5 pt-5 pb-6 max-h-[90vh]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Become a Creator</h2>
        </div>
        <p className="text-sm text-muted-foreground">Unlock publishing, monetization and analytics.</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Feature icon={Sparkles} label="Post, Reels & Stories" />
          <Feature icon={DollarSign} label="Tips & payouts" />
          <Feature icon={BarChart3} label="Analytics & insights" />
          <Feature icon={ShieldCheck} label="Ownership certificates" />
        </div>

        <div className="mt-4 rounded-2xl p-4 bg-gradient-to-r from-primary/15 to-aura/10 border border-primary/30">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Revenue split</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-primary">{split.creator}%</span>
            <span className="text-sm text-muted-foreground">to you</span>
            <span className="ml-auto text-sm font-semibold text-muted-foreground">{split.platform}% platform</span>
          </div>
        </div>

        <ScrollArea className="mt-4 h-40 rounded-xl border border-border p-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Creator Agreement (v{version})</p>
          <p>By becoming a Creator you agree that:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>Aurelix retains {split.platform}% of gross revenue from tips, paid unlocks and other monetization; you receive {split.creator}%.</li>
            <li>Payouts require approved KYC and a valid UPI or bank destination. Minimum payout thresholds and processing times apply.</li>
            <li>You own the content you upload and grant Aurelix a license to host, display and distribute it within the app.</li>
            <li>You will not upload illegal, infringing, or sexually explicit content involving minors. Violations result in removal and possible account termination.</li>
            <li>Tips and unlock revenue are final and non-refundable once verified.</li>
            <li>You are responsible for any taxes on your earnings in your jurisdiction.</li>
            <li>You must be 18+ to enable monetization.</li>
            <li>Aurelix may update this Agreement; continued use after notice constitutes acceptance.</li>
          </ul>
          <p className="mt-2">Full terms: <Link to="/creator/terms" className="text-primary underline">/creator/terms</Link></p>
        </ScrollArea>

        <label className="mt-4 flex items-start gap-3 text-sm">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-0.5" />
          <span>I agree to the Creator Agreement and the {split.creator}/{split.platform} revenue split.</span>
        </label>

        <button
          onClick={submit}
          disabled={!agreed || submitting}
          className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-aura text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Activating…" : "Activate Creator Mode"}
        </button>
      </SheetContent>
    </Sheet>
  );
};

const Feature = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
    <Icon className="h-4 w-4 text-primary" />
    <span className="text-xs font-medium">{label}</span>
  </div>
);
