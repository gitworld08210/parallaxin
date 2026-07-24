import { Link } from "react-router-dom";
import { Plus, Building2, Sparkles } from "lucide-react";
import { useMyAdvertisers } from "@/hooks/ads/useAdvertiser";

export default function AdsBusinessCenter() {
  const { data, isLoading } = useMyAdvertisers();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ads Business Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your advertiser accounts, campaigns and billing.
            </p>
          </div>
          <Link
            to="/ads/get-started"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow"
          >
            <Plus className="h-4 w-4" /> New advertiser
          </Link>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-border bg-secondary/40 p-8 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-primary mb-3" />
            <p className="text-sm font-semibold">No advertiser accounts yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Create one to start running campaigns on Aurelix.
            </p>
            <Link
              to="/ads/get-started"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Get started
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {data!.map(({ advertiser, role }: any) => (
              <li key={advertiser.id}>
                <Link
                  to={`/ads/${advertiser.id}`}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-secondary/40 hover:bg-secondary transition-colors"
                >
                  <div className="h-11 w-11 rounded-xl bg-gradient-primary/20 grid place-items-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{advertiser.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {advertiser.type} · {advertiser.status} · {advertiser.billing_mode.replace("_", " ")}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-lg bg-primary/10 text-primary">
                    {role.replace("advertiser_", "")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
