import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { WalletShell } from "@/components/wallet-os/WalletShell";
import { WalletCard } from "@/components/wallet-os/WalletCard";
import { useWalletCard } from "@/hooks/useWalletCard";
import { BalanceStrip } from "@/components/wallet-os/BalanceStrip";
import { QuickActions } from "@/components/wallet-os/QuickActions";
import { WalletEmpty } from "@/components/wallet-os/WalletEmpty";
import { BuyCoinsSheet } from "@/components/wallet/BuyCoinsSheet";
import { useWalletOS, useWalletLedgerOS } from "@/hooks/useWalletOS";
import { Receipt } from "lucide-react";

const nf = new Intl.NumberFormat("en-IN");

export default function WalletHome() {
  const { wallet, loading } = useWalletOS();
  const { state: cardState } = useWalletCard();
  const { rows } = useWalletLedgerOS(5);
  const [params, setParams] = useSearchParams();
  const [buyOpen, setBuyOpen] = useState(false);

  useEffect(() => {
    if (params.get("buy") === "1") {
      setBuyOpen(true);
      params.delete("buy");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  return (
    <WalletShell title="Wallet" subtitle="Your financial identity">
      {loading || !wallet ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <WalletCard wallet={wallet} card={cardState} />
            <Link to="/wallet/card" className="block rounded-xl border border-border/60 px-3 py-2 text-center text-[11px] font-medium text-muted-foreground hover:text-foreground">
              Card details, editions &amp; security review{cardState ? ` · V${cardState.card.version}` : ""}
            </Link>
          </div>
          <BalanceStrip b={wallet.balances} />

          <section aria-label="Quick actions" className="space-y-2">
            <h2 className="px-1 text-[11px] uppercase tracking-wider text-muted-foreground">Quick actions</h2>
            <QuickActions />
          </section>

          <section className="grid grid-cols-2 gap-2.5">
            <div className="wallet-os-tile p-3">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-emerald-400" /> Lifetime earned
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{nf.format(wallet.earned)}</p>
            </div>
            <div className="wallet-os-tile p-3">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <TrendingDown className="h-3 w-3 text-rose-400" /> Lifetime spent
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{nf.format(wallet.spent)}</p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="px-1 text-[11px] uppercase tracking-wider text-muted-foreground">Recent activity</h2>
            {rows.length === 0 ? (
              <WalletEmpty icon={Receipt} title="No transactions yet" hint="Your Aura movement will appear here the moment it happens." />
            ) : (
              <div className="wallet-os-tile divide-y divide-border/40 overflow-hidden">
                {rows.map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.label ?? r.source}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.bucket} · {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${r.direction === "credit" ? "text-emerald-400" : "text-foreground"}`}>
                      {r.direction === "credit" ? "+" : "−"}{nf.format(r.amount)}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <p className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Aurelix Wallet OS {wallet.version}
          </p>
        </div>
      )}

      <BuyCoinsSheet open={buyOpen} onOpenChange={setBuyOpen} />
    </WalletShell>
  );
}
