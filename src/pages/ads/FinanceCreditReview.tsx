import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import {
  usePendingCreditApplications,
  useApproveCredit,
  useRejectCredit,
  useFounderFinanceOverview,
} from "@/hooks/ads/usePostpaid";

const input = "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40";
const btn = "inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnDanger = "inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20";

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}

function Row({ app }: { app: any }) {
  const [limit, setLimit] = useState(String(app.requested_limit));
  const [cycle, setCycle] = useState(app.requested_cycle || "30d");
  const [risk, setRisk] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [deposit, setDeposit] = useState("0");
  const [method, setMethod] = useState("bank_transfer");
  const [autopay, setAutopay] = useState(false);
  const [notes, setNotes] = useState("");
  const approve = useApproveCredit();
  const reject = useRejectCredit();

  return (
    <li className="rounded-2xl border border-border bg-secondary/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{app.advertiser?.display_name ?? "Advertiser"}</p>
          <p className="text-[11px] text-muted-foreground">
            Requested ₹{Number(app.requested_limit).toLocaleString()} · {app.requested_cycle} · {new Date(app.created_at).toLocaleDateString()}
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-500">{app.status}</span>
      </div>
      {app.reason && <p className="mt-2 text-xs text-muted-foreground">{app.reason}</p>}

      <div className="grid grid-cols-2 gap-2 mt-3">
        <label className="block"><span className="text-[10px] text-muted-foreground">Approved limit</span><input className={input + " mt-1"} type="number" value={limit} onChange={(e) => setLimit(e.target.value)} /></label>
        <label className="block"><span className="text-[10px] text-muted-foreground">Cycle</span>
          <select className={input + " mt-1"} value={cycle} onChange={(e) => setCycle(e.target.value)}>
            <option value="weekly">Weekly</option><option value="15d">15d</option><option value="30d">30d</option>
          </select>
        </label>
        <label className="block"><span className="text-[10px] text-muted-foreground">Risk</span>
          <select className={input + " mt-1"} value={risk} onChange={(e) => setRisk(e.target.value as any)}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
        </label>
        <label className="block"><span className="text-[10px] text-muted-foreground">Security deposit</span><input className={input + " mt-1"} type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></label>
        <label className="block"><span className="text-[10px] text-muted-foreground">Payment method</span>
          <select className={input + " mt-1"} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="bank_transfer">Bank transfer</option><option value="upi">UPI</option><option value="wire">Wire</option><option value="autopay">Autopay</option>
          </select>
        </label>
        <label className="flex items-end gap-2 text-[11px] pb-1"><input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} /> Enable autopay</label>
      </div>
      <textarea className={input + " mt-2 min-h-14"} placeholder="Review notes (visible to advertiser)" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="mt-3 flex gap-2">
        <button className={btn} disabled={approve.isPending}
          onClick={() => approve.mutate({
            application_id: app.id,
            approved_limit: Number(limit),
            approved_cycle: cycle,
            risk_level: risk,
            security_deposit: Number(deposit || 0),
            payment_method: method,
            autopay,
            notes,
          })}>
          <CheckCircle2 className="h-3 w-3" /> Approve
        </button>
        <button className={btnDanger} disabled={reject.isPending || !notes}
          onClick={() => reject.mutate({ application_id: app.id, notes: notes || "Rejected" })}>
          <XCircle className="h-3 w-3" /> Reject
        </button>
      </div>
    </li>
  );
}

export default function FinanceCreditReview() {
  const { data: apps = [], isLoading } = usePendingCreditApplications();
  const { data: overview } = useFounderFinanceOverview();
  const fmt = (n: number) => `₹${Number(n ?? 0).toLocaleString()}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-6">
        <Link to="/admin-os" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ArrowLeft className="h-3 w-3" /> Admin OS
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Ads Credit Review</h1>
        <p className="text-sm text-muted-foreground mt-1">Finance L2 · approve or reject enterprise postpaid credit lines</p>

        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <Tile label="Total credit exposure" value={fmt(overview.total_credit_exposure)} />
            <Tile label="Outstanding revenue" value={fmt(overview.outstanding_revenue)} />
            <Tile label="Overdue" value={fmt(overview.overdue_revenue)} />
            <Tile label="Bad debt" value={fmt(overview.bad_debt)} />
          </div>
        )}

        <h2 className="mt-6 text-sm font-semibold">Pending applications ({apps.length})</h2>
        {isLoading ? (
          <p className="text-xs text-muted-foreground mt-2">Loading…</p>
        ) : apps.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-2">No applications waiting for review.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {apps.map((a: any) => <Row key={a.id} app={a} />)}
          </ul>
        )}
      </div>
    </div>
  );
}
