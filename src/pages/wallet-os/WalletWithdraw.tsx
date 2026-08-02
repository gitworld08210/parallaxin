import { useEffect, useState } from "react";
import { Banknote, Loader2, Check, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { WalletShell } from "@/components/wallet-os/WalletShell";
import { useWalletOS } from "@/hooks/useWalletOS";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("en-IN");
const MIN = 500;

const STEPS = [
  { k: "requested", label: "Requested", desc: "Withdrawal submitted" },
  { k: "review", label: "Finance review", desc: "Verified by Finance Department" },
  { k: "processing", label: "Processing", desc: "Bank transfer initiated" },
  { k: "paid", label: "Completed", desc: "Money credited to your account" },
];

const STATUS_STEP: Record<string, number> = { pending: 1, approved: 2, paid: 4, rejected: 1 };

type Req = { id: string; amount_cents: number; status: string; method: string; created_at: string; admin_note: string | null };

export default function WalletWithdraw() {
  const { wallet, refresh } = useWalletOS();
  const { user } = useAuth();
  const [amount, setAmount] = useState(MIN);
  const [method, setMethod] = useState("upi");
  const [busy, setBusy] = useState(false);
  const [reqs, setReqs] = useState<Req[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("payout_requests")
      .select("id, amount_cents, status, method, created_at, admin_note")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
    setReqs((data as any) ?? []);
  };
  useEffect(() => { load(); }, [user?.id]);

  const available = wallet?.balances.withdrawable ?? 0;

  const submit = async () => {
    if (amount < MIN) return toast.error(`Minimum withdrawal is ${MIN} AURA`);
    if (amount > available) return toast.error("Insufficient withdrawable balance");
    setBusy(true);
    const { error } = await supabase.rpc("wallet_request_withdrawal" as any, { _amount: amount, _method: method });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Withdrawal requested — Finance will review it");
    refresh(); load();
  };

  return (
    <WalletShell title="Withdraw" subtitle="Payouts are reviewed by Finance" back>
      <div className="space-y-4">
        <div className="wallet-os-tile p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Withdrawable balance</p>
          <p className="text-3xl font-semibold tabular-nums">{nf.format(available)} <span className="text-sm text-muted-foreground">AURA</span></p>
        </div>

        <div className="wallet-os-tile p-4">
          <label htmlFor="wd-amount" className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount to withdraw</label>
          <input id="wd-amount" type="number" min={MIN} value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="w-full bg-transparent text-3xl font-semibold tabular-nums outline-none" />
          <div className="mt-3 flex gap-2">
            {[MIN, 1000, 5000].map((p) => (
              <button key={p} onClick={() => setAmount(p)}
                className={cn("flex-1 rounded-full border py-1.5 text-xs", amount === p ? "border-[hsl(var(--wallet-accent))] bg-[hsl(var(--wallet-accent)/0.15)]" : "border-border/60 text-muted-foreground")}>{nf.format(p)}</button>
            ))}
            <button onClick={() => setAmount(available)} className="flex-1 rounded-full border border-border/60 py-1.5 text-xs text-muted-foreground">Max</button>
          </div>
        </div>

        <div className="wallet-os-tile p-4">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Payout method</p>
          <div className="flex gap-2">
            {["upi", "bank"].map((m) => (
              <button key={m} onClick={() => setMethod(m)}
                className={cn("flex-1 rounded-xl border py-2 text-xs font-medium uppercase",
                  method === m ? "border-[hsl(var(--wallet-accent))] bg-[hsl(var(--wallet-accent)/0.12)]" : "border-border/60 text-muted-foreground")}>{m}</button>
            ))}
          </div>
        </div>

        <Button className="h-12 w-full gap-2" onClick={submit} disabled={busy || available < MIN}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />} Request withdrawal
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" /> Minimum {nf.format(MIN)} AURA · settled within 3–5 working days
        </p>

        {reqs.length > 0 && (
          <div className="wallet-os-tile p-4">
            <p className="mb-3 text-sm font-semibold">Withdrawal timeline</p>
            <div className="space-y-4">
              {reqs.map((r) => {
                const step = STATUS_STEP[r.status] ?? 1;
                return (
                  <div key={r.id} className="rounded-xl border border-border/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold tabular-nums">{nf.format(r.amount_cents / 100)} AURA</p>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                    </div>
                    <ol className="space-y-2">
                      {STEPS.map((s, i) => {
                        const done = i < step && r.status !== "rejected";
                        return (
                          <li key={s.k} className="flex items-start gap-2">
                            <span className={cn("mt-0.5 grid h-5 w-5 place-items-center rounded-full",
                              done ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground")}>
                              {done ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            </span>
                            <div>
                              <p className={cn("text-xs font-medium", !done && "text-muted-foreground")}>{s.label}</p>
                              <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                    {r.status === "rejected" && r.admin_note && (
                      <p className="mt-2 text-[11px] text-rose-400">Rejected: {r.admin_note}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </WalletShell>
  );
}
