import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/vibe/GlassCard";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const sources = [
  { label: "Reels Bonus", value: "$0" },
  { label: "Creator Fund", value: "$0" },
  { label: "Brand Collabs", value: "$0" },
  { label: "Tips & Gifts", value: "$0" },
];

export default function Monetization() {
  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Monetization" />
      <div className="p-4 space-y-5">
        <GlassCard className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Balance</p>
            <p className="text-2xl font-bold">$0.00</p>
            <p className="text-[11px] text-muted-foreground">Available to withdraw</p>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Earnings Overview</p>
            <span className="text-xs text-muted-foreground">This Month</span>
          </div>
          <p className="text-2xl font-bold mt-2">$0.00</p>
          <p className="text-[11px] text-muted-foreground">+0%</p>
          <div className="mt-4 h-24 rounded-lg bg-muted/20 grid place-items-center text-xs text-muted-foreground">
            No earnings yet
          </div>
        </GlassCard>

        <div>
          <p className="text-sm font-semibold mb-3">Revenue Sources</p>
          <GlassCard className="divide-y divide-border p-0 overflow-hidden">
            {sources.map((s) => (
              <div key={s.label} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm">{s.label}</span>
                <span className="text-sm font-semibold">{s.value}</span>
              </div>
            ))}
          </GlassCard>
        </div>

        <Button className="w-full" disabled>Withdraw Earnings</Button>
      </div>
    </div>
  );
}
