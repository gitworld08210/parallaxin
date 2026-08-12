import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AdPreview } from "./components/AdPreview";
import { signedCreativeUrl } from "@/hooks/ads/useAdsEntities";
import { statusTone } from "@/features/ads/lib";

type PendingAd = {
  id: string;
  account_id: string;
  name: string;
  headline: string | null;
  primary_text: string | null;
  cta: string;
  destination_url: string | null;
  review_state: string;
  created_at: string;
  creative: { media_type: string; storage_path: string } | null;
};

export default function ReviewQueue() {
  const { user } = useAuth();
  const [ads, setAds] = useState<PendingAd[]>([]);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ads_ads")
      .select("id, account_id, name, headline, primary_text, cta, destination_url, review_state, created_at, creative:ads_creatives(media_type, storage_path)")
      .eq("review_state", "pending")
      .order("created_at", { ascending: true });
    const rows = (data ?? []) as unknown as PendingAd[];
    setAds(rows);
    const entries = await Promise.all(
      rows.map(async (a) => [a.id, a.creative ? ((await signedCreativeUrl(a.creative.storage_path)) ?? "") : ""] as const),
    );
    setMedia(Object.fromEntries(entries));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (ad: PendingAd, state: "approved" | "rejected") => {
    if (!user) return;
    if (state === "rejected" && !reason[ad.id]?.trim()) {
      return toast.error("Reject karne ke liye reason likhna zaroori hai");
    }
    setBusy(ad.id);
    try {
      const { error } = await supabase
        .from("ads_ads")
        .update({
          review_state: state,
          review_reason: state === "rejected" ? reason[ad.id].trim() : null,
          status: state === "rejected" ? "paused" : "active",
        })
        .eq("id", ad.id);
      if (error) throw error;
      await supabase.from("ads_reviews").insert({
        ad_id: ad.id,
        state,
        reason: state === "rejected" ? reason[ad.id].trim() : null,
        reviewer_id: user.id,
      });
      toast.success(state === "approved" ? "Ad approved" : "Ad rejected");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not save decision");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">Ad review queue</h1>
        <Badge variant="outline" className="tabular-nums">{ads.length} pending</Badge>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : ads.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Queue clear — koi ad pending nahi.</Card>
      ) : (
        <div className="space-y-4">
          {ads.map((ad) => (
            <Card key={ad.id} className="grid gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <AdPreview
                placement="reels"
                data={{
                  brand: ad.name,
                  headline: ad.headline ?? "",
                  primaryText: ad.primary_text ?? "",
                  cta: ad.cta,
                  mediaUrl: media[ad.id] || null,
                  mediaType: (ad.creative?.media_type as "image" | "video") ?? undefined,
                }}
              />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">{ad.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Account {ad.account_id.slice(0, 8)} · {new Date(ad.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Headline:</span> {ad.headline || "—"}</p>
                  <p><span className="text-muted-foreground">Primary text:</span> {ad.primary_text || "—"}</p>
                  <p className="break-all"><span className="text-muted-foreground">Destination:</span> {ad.destination_url || "—"}</p>
                </div>
                <Badge variant="outline" className={statusTone(ad.review_state)}>{ad.review_state}</Badge>
                <Input
                  value={reason[ad.id] ?? ""}
                  onChange={(e) => setReason({ ...reason, [ad.id]: e.target.value })}
                  placeholder="Rejection reason (policy violation, misleading claim…)"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1.5" disabled={busy === ad.id} onClick={() => decide(ad, "approved")}>
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1.5" disabled={busy === ad.id} onClick={() => decide(ad, "rejected")}>
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
