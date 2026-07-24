import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CreditCard, ShieldCheck, AlertCircle, TrendingUp } from "lucide-react";
import { useAdvertiser } from "@/hooks/ads/useAdvertiser";
import {
  useCreditStatus,
  useMyCreditApplications,
  useSubmitCreditApplication,
  useFinancialLedger,
} from "@/hooks/ads/usePostpaid";

const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";
const btn = "inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function CreditCenter() {
  const { advertiserId } = useParams();
  const { data: adv } = useAdvertiser(advertiserId);
  const { data: status } = useCreditStatus(advertiserId);
  const { data: apps = [] } = useMyCreditApplications(advertiserId);
  const { data: ledger = [] } = useFinancialLedger(advertiserId, 25);
  const submit = useSubmitCreditApplication();

  const [limit, setLimit] = useState("");
  const [cycle, setCycle] = useState("30d");
  const [reason, setReason] = useState("");

  if (!advertiserId) return null;
  const currency = status?.currency ?? "INR";
  const fmt = (n: number) => `${currency === "INR" ? "₹" : currency + " "}${Number(n ?? 0).toLocaleString()}`;
  const hasPending = apps.some((a: any) => a.status === "pending" || a.status === "under_review");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-6">
        <Link to={`/ads/${advertiserId}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Credit & Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {adv?.display_name} · {status?.mode?.replace("_", " ") ?? "prepaid"}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <Tile label="Wallet balance" value={fmt(status?.wallet_balance ?? 0)} />
          <Tile label="Credit limit" value={fmt(status?.credit_limit ?? 0)} hint={status?.mode === "postpaid_invoice" ? "Postpaid" : "Prepaid — no credit line"} />
          <Tile label="Available credit" value={fmt(status?.available_credit ?? 0)} hint={status?.over_limit ? "Over limit" : undefined} />
          <Tile label="Outstanding invoices" value={fmt(status?.outstanding ?? 0)} />
        </div>

        {status?.over_limit && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-destructive">Credit limit exceeded</p>
              <p className="text-muted-foreground mt-1">New ad delivery is paused until you pay outstanding invoices or Finance raises your limit.</p>
            </div>
          </div>
        )}

        {status?.mode !== "postpaid_invoice" && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" /> Apply for Enterprise Postpaid</h2>
            <p className="text-xs text-muted-foreground mt-1">Finance L2 reviews every application. Approved accounts get monthly invoicing and can spend beyond wallet up to the credit limit.</p>
            {hasPending ? (
              <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-3 text-xs">
                An application is under Finance review — we'll notify you when there is a decision.
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-border bg-secondary/40 p-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Requested credit limit ({currency})</span>
                  <input className={input + " mt-1"} value={limit} onChange={(e) => setLimit(e.target.value)} type="number" min="1000" placeholder="e.g. 500000" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Billing cycle</span>
                  <select className={input + " mt-1"} value={cycle} onChange={(e) => setCycle(e.target.value)}>
                    <option value="weekly">Weekly</option>
                    <option value="15d">Every 15 days</option>
                    <option value="30d">Monthly (30 days)</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Business justification</span>
                  <textarea className={input + " mt-1 min-h-20"} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Expected monthly spend, previous ad history, GST/tax details…" />
                </label>
                <button
                  className={btn}
                  disabled={submit.isPending || !limit}
                  onClick={() =>
                    submit.mutate({
                      advertiser_id: advertiserId,
                      requested_limit: Number(limit),
                      requested_cycle: cycle,
                      reason,
                    })
                  }
                >
                  {submit.isPending ? "Submitting…" : "Submit for Finance review"}
                </button>
              </div>
            )}
          </section>
        )}

        <section className="mt-6">
          <h2 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Application history</h2>
          {apps.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No applications yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {apps.map((a: any) => (
                <li key={a.id} className="rounded-xl border border-border bg-secondary/40 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{fmt(a.requested_limit)} · {a.requested_cycle}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${a.status === "approved" ? "bg-emerald-500/20 text-emerald-500" : a.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-500"}`}>{a.status}</span>
                  </div>
                  {a.review_notes && <p className="mt-1 text-muted-foreground">{a.review_notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Recent financial events</h2>
          {ledger.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {ledger.map((l: any) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs">
                  <span className="capitalize">{l.event_type.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">{l.amount ? fmt(l.amount) : "—"} · {new Date(l.occurred_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
