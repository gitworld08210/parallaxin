import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Loader2, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WalletShell } from "@/components/wallet-os/WalletShell";
import { useWalletOS } from "@/hooks/useWalletOS";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("en-IN");
const PRESETS = [100, 250, 500, 1000];

type Recipient = { handle: string; display_name: string | null; username: string | null; avatar_url: string | null; verified: boolean };

export default function WalletGift() {
  const { wallet, refresh } = useWalletOS();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Recipient[]>([]);
  const [picked, setPicked] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState(500);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<{ txn_id: string; amount: number; fee: number } | null>(null);

  useEffect(() => {
    if (picked || q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("wallet_search_handles" as any, { _q: q.trim() });
      setResults((data as unknown as Recipient[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, picked]);

  const fee = Math.max(1, Math.floor(amount / 100));

  const send = async () => {
    if (!picked) return;
    setSending(true);
    const { data, error } = await supabase.rpc("wallet_gift" as any, { _to_handle: picked.handle, _amount: amount });
    setSending(false);
    if (error) return toast.error(error.message);
    setReceipt(data as any);
    refresh();
  };

  return (
    <WalletShell title="Gift Aura" subtitle="Send Aura to any creator" back>
      <AnimatePresence mode="wait">
        {receipt ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="wallet-os-tile grid place-items-center gap-3 p-8 text-center">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15">
              <Check className="h-7 w-7 text-emerald-400" />
            </motion.span>
            <p className="text-base font-semibold">Gift sent successfully</p>
            <p className="text-sm text-muted-foreground">{nf.format(receipt.amount)} AURA to @{picked?.handle}</p>
            <dl className="mt-2 w-full space-y-1 text-xs">
              <Row k="Platform fee" v={`${nf.format(receipt.fee)} AURA`} />
              <Row k="Total payable" v={`${nf.format(receipt.amount + receipt.fee)} AURA`} />
              <Row k="Transaction ID" v={receipt.txn_id} />
            </dl>
            <Button className="mt-3 w-full" onClick={() => { setReceipt(null); setPicked(null); setQ(""); }}>Send another gift</Button>
          </motion.div>
        ) : (
          <motion.div key="form" className="space-y-4">
            {!picked ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search creator or @wallet handle"
                    aria-label="Search recipient" className="h-11 pl-8" />
                </div>
                {results.map((r) => (
                  <button key={r.handle} onClick={() => setPicked(r)} className="wallet-os-tile flex w-full items-center gap-3 p-3 text-left">
                    <img src={r.avatar_url ?? "/placeholder.svg"} alt="" className="h-9 w-9 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.display_name ?? r.username}</p>
                      <p className="truncate text-[11px] text-muted-foreground">@{r.handle}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="wallet-os-tile flex items-center gap-3 p-3">
                  <img src={picked.avatar_url ?? "/placeholder.svg"} alt="" className="h-11 w-11 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{picked.display_name ?? picked.username}</p>
                    <p className="truncate text-[11px] text-muted-foreground">@{picked.handle}</p>
                  </div>
                  <button onClick={() => setPicked(null)} className="text-xs text-muted-foreground underline">Change</button>
                </div>

                <div className="wallet-os-tile p-4">
                  <label htmlFor="gift-amount" className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount</label>
                  <input id="gift-amount" type="number" min={1} value={amount}
                    onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-transparent text-3xl font-semibold tabular-nums outline-none" />
                  <div className="mt-3 flex gap-2">
                    {PRESETS.map((p) => (
                      <button key={p} onClick={() => setAmount(p)}
                        className={cn("flex-1 rounded-full border py-1.5 text-xs",
                          amount === p ? "border-[hsl(var(--wallet-accent))] bg-[hsl(var(--wallet-accent)/0.15)]" : "border-border/60 text-muted-foreground")}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <dl className="wallet-os-tile space-y-1.5 p-4 text-xs">
                  <Row k="Platform fee" v={`${nf.format(fee)} AURA`} />
                  <Row k="Total payable" v={`${nf.format(amount + fee)} AURA`} />
                  <Row k="Your balance" v={`${nf.format(wallet?.balances.purchased ?? 0)} AURA`} />
                </dl>

                <Button className="h-12 w-full gap-2" onClick={send} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />} Send gift
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">Gifts cannot be refunded.</p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </WalletShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>;
}
