import { Loader2, IdCard } from "lucide-react";
import { WalletShell } from "@/components/wallet-os/WalletShell";
import { useWalletOS, useWalletLedgerOS } from "@/hooks/useWalletOS";
import { useAuth } from "@/contexts/AuthProvider";
import { useMemo } from "react";

const nf = new Intl.NumberFormat("en-IN");

export default function WalletPassport() {
  const { wallet, loading } = useWalletOS();
  const { rows } = useWalletLedgerOS(500);
  const { profile } = useAuth();

  const agg = useMemo(() => {
    const sum = (fn: (r: typeof rows[number]) => boolean) =>
      rows.filter(fn).reduce((a, r) => a + r.amount, 0);
    return {
      giftsReceived: sum((r) => r.source === "gift" && r.direction === "credit"),
      giftsSent: sum((r) => r.source === "gift" && r.direction === "debit"),
      withdrawn: sum((r) => r.source === "withdrawal" && r.direction === "debit"),
      ads: sum((r) => r.source === "ads" && r.direction === "credit"),
      marketplace: sum((r) => r.source === "marketplace" && r.direction === "credit"),
      subscription: sum((r) => r.source === "subscription" && r.direction === "credit"),
      activity: rows.length,
    };
  }, [rows]);

  if (loading || !wallet) {
    return (
      <WalletShell title="Wallet Passport" back>
        <div className="grid place-items-center py-24 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      </WalletShell>
    );
  }

  const created = new Date(wallet.created_at);
  const months = Math.max(0, Math.round((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const p = profile as any;

  const rows2: { k: string; v: string; accent?: boolean }[] = [
    { k: "Wallet age", v: months < 1 ? "New" : `${months} month${months > 1 ? "s" : ""}` },
    { k: "Creator since", v: p?.creator_since ? new Date(p.creator_since).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—" },
    { k: "Verification", v: p?.verified ? "Verified" : "Unverified", accent: !!p?.verified },
    { k: "Creator level", v: p?.aura_rank ?? "—" },
    { k: "Premium status", v: (p?.tier ?? "free") === "free" ? "Free" : String(p?.tier).toUpperCase(), accent: (p?.tier ?? "free") !== "free" },
    { k: "Trust score", v: `${wallet.trust_score} / 100`, accent: true },
    { k: "Total Aura earned", v: nf.format(wallet.earned) },
    { k: "Total Aura spent", v: nf.format(wallet.spent) },
    { k: "Total withdrawn", v: nf.format(agg.withdrawn) },
    { k: "Gifts received", v: nf.format(agg.giftsReceived) },
    { k: "Gifts sent", v: nf.format(agg.giftsSent) },
    { k: "Ads earnings", v: nf.format(agg.ads) },
    { k: "Marketplace earnings", v: nf.format(agg.marketplace) },
    { k: "Subscription earnings", v: nf.format(agg.subscription) },
    { k: "Lifetime activity", v: `${nf.format(agg.activity)} transactions` },
  ];

  return (
    <WalletShell title="Wallet Passport" subtitle={`@${wallet.handle}`} back>
      <div className="space-y-4">
        <div className="wallet-os-tile flex items-center gap-3 p-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(var(--wallet-accent)/0.15)]">
            <IdCard className="h-5 w-5 text-[hsl(var(--wallet-accent))]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{p?.display_name ?? p?.username ?? "Aurelix member"}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{wallet.wallet_id}</p>
            {cardState && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {CARD_TYPE_LABEL[cardState.card.card_type]} · V{cardState.card.version}
              </p>
            )}
          </div>
        </div>

        {cardState && cardState.badges.length > 0 && (
          <div className="wallet-os-tile p-4">
            <h2 className="mb-2 text-xs font-semibold">Badges</h2>
            <WalletBadges badges={cardState.badges} />
          </div>
        )}


        <dl className="wallet-os-tile divide-y divide-border/40 overflow-hidden">
          {rows2.map((r) => (
            <div key={r.k} className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-xs text-muted-foreground">{r.k}</dt>
              <dd className={`text-sm font-medium tabular-nums ${r.accent ? "text-[hsl(var(--wallet-accent))]" : ""}`}>{r.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </WalletShell>
  );
}
