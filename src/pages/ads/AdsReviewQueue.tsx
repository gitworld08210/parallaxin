import { useState } from "react";
import { useReviewQueue, useDecideReview } from "@/hooks/ads/useReviewQueue";
import { Shield, Check, X, RefreshCw, ExternalLink } from "lucide-react";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
] as const;

const REASONS = [
  "policy.violence",
  "policy.adult",
  "policy.misleading",
  "policy.trademark",
  "policy.spam",
  "quality.low_resolution",
  "quality.landing_page",
  "other",
];

export default function AdsReviewQueue() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending");
  const { data: items = [], isLoading, refetch, isFetching } = useReviewQueue(tab);
  const decide = useDecideReview();
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [notes, setNotes] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-5 w-5" /> Ads Review
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Moderator inbox for advertiser submissions.
            </p>
          </div>
          <button onClick={() => refetch()} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs">
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap border ${
                tab === t.key ? "bg-primary text-primary-foreground border-primary" : "border-border bg-secondary/40"
              }`}>{t.label}</button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-secondary/40 p-6 text-center">
            <p className="text-sm text-muted-foreground">Inbox zero. Nothing waiting here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((r: any) => {
              const ad = r.aap_ads;
              const isOpen = openId === r.id;
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-secondary/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{ad?.name ?? "Untitled ad"}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.aap_advertisers?.display_name} · {ad?.format} · priority {r.priority}
                      </p>
                      {ad?.headline && <p className="text-xs mt-1 line-clamp-1">{ad.headline}</p>}
                      {ad?.destination_url && (
                        <a href={ad.destination_url} target="_blank" rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary">
                          {ad.destination_url} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      r.state === "pending" ? "border-amber-500 text-amber-500" :
                      r.state === "approved" ? "border-emerald-500 text-emerald-500" :
                      "border-rose-500 text-rose-500"
                    }`}>{r.state}</span>
                  </div>

                  {r.state === "pending" && (
                    isOpen ? (
                      <div className="mt-3 space-y-2">
                        <select value={reason} onChange={(e) => setReason(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs">
                          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                          rows={2} placeholder="Notes to advertiser (optional)"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs" />
                        <div className="flex flex-wrap gap-2 justify-end">
                          <button onClick={() => { setOpenId(null); setNotes(""); }}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                          <button
                            onClick={async () => {
                              await decide.mutateAsync({ review_id: r.id, ad_id: r.ad_id, decision: "need_changes", reason_code: reason, notes });
                              setOpenId(null); setNotes("");
                            }}
                            className="rounded-lg border border-amber-500 px-3 py-1.5 text-xs text-amber-600">Needs changes</button>
                          <button
                            onClick={async () => {
                              await decide.mutateAsync({ review_id: r.id, ad_id: r.ad_id, decision: "rejected", reason_code: reason, notes });
                              setOpenId(null); setNotes("");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
                            <X className="h-3 w-3" /> Reject
                          </button>
                          <button
                            onClick={async () => {
                              await decide.mutateAsync({ review_id: r.id, ad_id: r.ad_id, decision: "approved", notes });
                              setOpenId(null); setNotes("");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                            <Check className="h-3 w-3" /> Approve
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setOpenId(r.id)}
                        className="mt-3 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium">
                        Review
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
