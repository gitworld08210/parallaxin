import { useParams, Link } from "react-router-dom";
import { useAdvertiser } from "@/hooks/ads/useAdvertiser";
import { ArrowLeft } from "lucide-react";

export default function AdvertiserShell() {
  const { advertiserId } = useParams();
  const { data, isLoading } = useAdvertiser(advertiserId);

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
            <div className="mt-6 grid gap-3">
              {["Campaigns", "Creatives", "Audiences", "Billing", "Review", "Analytics"].map((t) => (
                <div key={t} className="p-4 rounded-2xl border border-border bg-secondary/40 text-sm">
                  <p className="font-semibold">{t}</p>
                  <p className="text-xs text-muted-foreground mt-1">Coming in the next phase.</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
