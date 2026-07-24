import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Wallet, Receipt, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  useWallet, useWalletLedger, usePayments, useSubmitTopup, useInvoices,
} from "@/hooks/ads/useBilling";
import { useAdvertiser } from "@/hooks/ads/useAdvertiser";

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";
const btnPrimary = "inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnGhost = "inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-secondary/60";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-secondary/40 p-4 ${className}`}>{children}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any }> = {
    verified: { cls: "bg-emerald-500/15 text-emerald-500", icon: CheckCircle2 },
    paid: { cls: "bg-emerald-500/15 text-emerald-500", icon: CheckCircle2 },
    pending: { cls: "bg-amber-500/15 text-amber-500", icon: Clock },
    open: { cls: "bg-amber-500/15 text-amber-500", icon: Clock },
    rejected: { cls: "bg-rose-500/15 text-rose-500", icon: XCircle },
    void: { cls: "bg-muted text-muted-foreground", icon: XCircle },
  };
  const m = map[status] ?? { cls: "bg-muted text-muted-foreground", icon: Clock };
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}>
      <Icon className="h-3 w-3" /> {status}
    </span>
  );
}

export default function BillingCenter() {
  const { advertiserId } = useParams();
  const { data: adv } = useAdvertiser(advertiserId);
  const { data: wallet } = useWallet(advertiserId);
  const { data: ledger = [] } = useWalletLedger(advertiserId);
  const { data: payments = [] } = usePayments(advertiserId);
  const { data: invoices = [] } = useInvoices(advertiserId);
  const submit = useSubmitTopup();

  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [notes, setNotes] = useState("");

  if (!advertiserId) return null;

  const balance = Number(wallet?.balance ?? 0);
  const reserved = Number(wallet?.reserved ?? 0);
  const available = balance - reserved;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-6">
        <Link to={`/ads/${advertiserId}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ArrowLeft className="h-3 w-3" /> {adv?.display_name ?? "Advertiser"}
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">Billing & wallet</h1>
        <p className="text-sm text-muted-foreground mt-1">Top up with UPI, track spend, download invoices.</p>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <Card>
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <p className="mt-2 text-xl font-bold">₹{available.toFixed(0)}</p>
            <p className="text-[11px] text-muted-foreground">Available</p>
          </Card>
          <Card>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="mt-1 text-lg font-semibold">₹{balance.toFixed(0)}</p>
          </Card>
          <Card>
            <p className="text-xs text-muted-foreground">Reserved</p>
            <p className="mt-1 text-lg font-semibold">₹{reserved.toFixed(0)}</p>
          </Card>
        </div>

        {/* Top-up */}
        <div className="mt-6">
          <h2 className="text-base font-semibold mb-2">Add funds (UPI)</h2>
          <Card className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Pay to <span className="font-semibold text-foreground">aurelix@upi</span> and paste the UTR / reference below. Finance verifies within 24 hours.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} type="number" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <input className={inputCls} placeholder="UTR / reference" value={utr} onChange={(e) => setUtr(e.target.value)} />
            </div>
            <input className={inputCls} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex justify-end">
              <button
                className={btnPrimary}
                disabled={!amount || !utr || submit.isPending}
                onClick={async () => {
                  await submit.mutateAsync({
                    advertiser_id: advertiserId,
                    amount: Number(amount),
                    utr,
                    notes: notes || null,
                  });
                  setAmount(""); setUtr(""); setNotes("");
                }}
              >
                <Upload className="h-3 w-3" /> Submit top-up
              </button>
            </div>
          </Card>
        </div>

        {/* Payments */}
        <div className="mt-6">
          <h2 className="text-base font-semibold mb-2">Top-up history</h2>
          {payments.length === 0 ? (
            <Card><p className="text-sm text-muted-foreground">No top-ups yet.</p></Card>
          ) : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <Card key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">₹{Number(p.amount).toFixed(0)} · {p.method?.toUpperCase()}</p>
                    <p className="text-[11px] text-muted-foreground">UTR {p.utr} · {new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="mt-6">
          <h2 className="text-base font-semibold mb-2 inline-flex items-center gap-1">
            <Receipt className="h-4 w-4" /> Invoices
          </h2>
          {invoices.length === 0 ? (
            <Card><p className="text-sm text-muted-foreground">No invoices yet. They generate at the end of each billing period.</p></Card>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv: any) => (
                <Card key={inv.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{inv.invoice_number ?? inv.id.slice(0, 8)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {inv.period_start} → {inv.period_end} · {inv.currency}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">₹{Number(inv.total).toFixed(2)}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                  {inv.aap_invoice_lines?.length ? (
                    <div className="mt-3 border-t border-border/60 pt-2 space-y-1">
                      {inv.aap_invoice_lines.map((l: any) => (
                        <div key={l.id} className="flex justify-between text-[11px] text-muted-foreground">
                          <span className="truncate">{l.description}</span>
                          <span>₹{Number(l.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Ledger */}
        <div className="mt-6 mb-10">
          <h2 className="text-base font-semibold mb-2">Wallet ledger</h2>
          {ledger.length === 0 ? (
            <Card><p className="text-sm text-muted-foreground">No transactions yet.</p></Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <ul className="divide-y divide-border/60">
                {ledger.map((l: any) => (
                  <li key={l.id} className="flex items-center justify-between px-4 py-2 text-xs">
                    <div>
                      <p className="font-medium">{l.reason ?? l.reference_type}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p>
                    </div>
                    <span className={l.direction === "credit" ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                      {l.direction === "credit" ? "+" : "−"}₹{Number(l.amount).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
