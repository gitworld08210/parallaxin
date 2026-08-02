import { Loader2, Coins } from "lucide-react";
import { WalletShell } from "@/components/wallet-os/WalletShell";
import { useWalletOS } from "@/hooks/useWalletOS";

const nf = new Intl.NumberFormat("en-IN");




const DEFS = [
  { key: "purchased", label: "Purchased Coins", hint: "Bought with money", color: "#60a5fa" },
  { key: "reward", label: "Reward Coins", hint: "Earned from platform rewards", color: "#f472b6" },
  { key: "gift", label: "Gift Coins", hint: "Received from other users", color: "#8b5cf6" },
  { key: "ads", label: "Ads Coins", hint: "Earned from ad revenue share", color: "#22d3ee" },
  { key: "bonus", label: "Bonus Coins", hint: "Promotional credits", color: "#facc15" },
  { key: "locked", label: "Locked Coins", hint: "Held against pending obligations", color: "#94a3b8" },
  { key: "pending", label: "Pending Coins", hint: "Awaiting settlement or review", color: "#fb923c" },
  { key: "withdrawable", label: "Withdrawable Coins", hint: "Eligible for payout to bank", color: "#34d399" },
] as const;

export default function WalletCoins() {
  const { wallet, loading } = useWalletOS();

  return (
    <WalletShell title="Coin Breakdown" subtitle="Balances are never mixed" back>
      {loading || !wallet ? (
        <div className="grid place-items-center py-24 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          <ul className="wallet-os-tile divide-y divide-border/40 overflow-hidden">
            {DEFS.map((d) => (
              <li key={d.key} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${d.color}22` }}>
                  <Coins className="h-4 w-4" style={{ color: d.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{d.hint}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{nf.format(wallet.balances[d.key])} <span className="text-[10px] text-muted-foreground">AURA</span></p>
              </li>
            ))}
          </ul>

          <div className="wallet-os-tile flex items-center justify-between p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total balance</p>
            <p className="text-lg font-semibold tabular-nums">{nf.format(wallet.total)} <span className="text-xs text-muted-foreground">AURA</span></p>
          </div>
        </div>
      )}
    </WalletShell>
  );
}
