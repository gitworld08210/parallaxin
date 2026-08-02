import { cn } from "@/lib/utils";
import type { WalletBuckets } from "@/hooks/useWalletOS";

const nf = new Intl.NumberFormat("en-IN");

export function BalanceStrip({ b }: { b: WalletBuckets }) {
  const items = [
    { label: "Available", value: b.purchased + b.reward + b.gift + b.ads + b.bonus },
    { label: "Pending", value: b.pending },
    { label: "Locked", value: b.locked },
    { label: "Reward", value: b.reward },
    { label: "Withdrawable", value: b.withdrawable },
  ];
  return (
    <div className="grid grid-cols-5 gap-2 overflow-x-auto">
      {items.map((i) => (
        <div key={i.label} className={cn("wallet-os-tile px-2 py-2.5 text-center")}>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{i.label}</p>
          <p className="mt-0.5 text-[13px] font-semibold tabular-nums">{nf.format(i.value)}</p>
          <p className="text-[8px] uppercase tracking-wider text-muted-foreground/70">Aura</p>
        </div>
      ))}
    </div>
  );
}
