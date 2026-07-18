import { TopBar } from "@/components/vibe/TopBar";
import { fmt } from "@/lib/format";
import { useAuth } from "@/contexts/AuthProvider";
import { Coins, ShieldCheck, FileText, Sparkles, Plus, Gift, Radio, Users, Video } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { CreatorEarnings } from "@/components/wallet/CreatorEarnings";
import { PayoutHistory } from "@/components/wallet/PayoutHistory";
import { TransactionsList } from "@/components/wallet/TransactionsList";
import { BuyCoinsSheet } from "@/components/wallet/BuyCoinsSheet";
import { useIsCreator } from "@/hooks/useIsCreator";
import { useEffect, useState } from "react";
import { BecomeCreatorSheet } from "@/components/creator/BecomeCreatorSheet";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { cn } from "@/lib/utils";

const TIER_LABEL: Record<string, string> = { free: "Free", pro: "Aurelix Pro", ultra: "Aurelix Ultra" };

const Wallet = () => {
  const { profile } = useAuth();
  const { isCreator } = useIsCreator();
  const { balance, loading: balLoading } = useCoinBalance();
  const [becomeOpen, setBecomeOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "history">("overview");
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (params.get("buy") === "1") {
      setBuyOpen(true);
      params.delete("buy");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const tier = TIER_LABEL[(profile as any)?.tier ?? "free"] ?? "Free";

  return (
    <div>
      <TopBar subtitle="Aurelix economy" title="Wallet" />

      <div className="px-5 space-y-5 pb-8">
        {/* Balance hero — REAL coin_balance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 shadow-elevated"
          style={{ backgroundImage: "var(--gradient-infinity)" }}
        >
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-gold opacity-30 blur-3xl" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Aurelix Coin balance</p>
          <div className="mt-2 flex items-baseline gap-2">
            <Coins className="h-7 w-7 text-aura" />
            <span className="font-display text-5xl font-semibold text-gradient-gold">
              {balLoading ? "—" : fmt(balance)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Spend on gifts, tips, subscriptions & post unlocks</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setBuyOpen(true)}
              className="rounded-xl py-2.5 text-xs font-semibold bg-gradient-primary text-primary-foreground shadow-glow flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Buy coins
            </button>
            <Link
              to="/store"
              className="glass-strong rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Gift className="h-4 w-4" /> Store
            </Link>
          </div>
        </motion.div>

        <Link
          to="/wallet/payslips"
          className="w-full flex items-center gap-3 rounded-2xl p-4 border border-border/60 bg-card/40 hover:border-primary/40 hover:bg-muted/30 transition-colors"
        >
          <span className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center">
            <FileText className="h-5 w-5 text-primary" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">My Payslips</span>
            <span className="block text-xs text-muted-foreground">View & download monthly salary slips</span>
          </span>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary">Open</span>
        </Link>

        {/* Tabs */}
        <div role="tablist" className="grid grid-cols-2 rounded-full border border-border bg-card p-1">
          {[
            { id: "overview", label: "Overview" },
            { id: "history", label: "History" },
          ].map((t: any) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("rounded-full py-2 text-xs font-semibold transition",
                tab === t.id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground")}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <>
            {isCreator ? (
              <>
                <CreatorEarnings />
                <PayoutHistory />
              </>
            ) : (
              <button
                onClick={() => setBecomeOpen(true)}
                className="w-full text-left rounded-2xl p-5 border border-primary/30 bg-gradient-to-r from-primary/10 to-aura/10 flex items-center gap-3"
              >
                <span className="h-11 w-11 rounded-2xl bg-primary/20 grid place-items-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">Become a Creator</span>
                  <span className="block text-xs text-muted-foreground">Receive tips, subscriptions & payouts</span>
                </span>
                <span className="text-xs font-semibold px-3 py-2 rounded-full bg-gradient-primary text-primary-foreground shadow-glow">Start</span>
              </button>
            )}

            {/* Ways to earn — honest, no fake XP */}
            <div className="rounded-2xl border border-border bg-card/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Ways to earn</p>
              </div>
              <div className="space-y-2 text-xs">
                <EarnRow icon={Coins} title="Receive tips" desc="Fans can send you tips from ₹49" />
                <EarnRow icon={Users} title="Fan subscriptions" desc="Monthly recurring access to exclusive content" />
                <EarnRow icon={Video} title="Sell exclusive posts" desc="Set a coin price on posts, reels & stories" />
                <EarnRow icon={Radio} title="Live gifts & paid lives" desc="Sell tickets or receive gifts on stream" />
              </div>
            </div>

            {/* Tier badge — honest, from profiles.tier */}
            <div className="rounded-2xl border border-border bg-card/40 p-5 flex items-center gap-3">
              <span className="h-11 w-11 rounded-xl bg-aura/15 grid place-items-center">
                <ShieldCheck className="h-5 w-5 text-aura" />
              </span>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your tier</p>
                <p className="font-display text-lg font-semibold">{tier}</p>
              </div>
              <Link to="/premium" className="text-xs font-semibold px-3 py-2 rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                Upgrade
              </Link>
            </div>
          </>
        ) : (
          <TransactionsList />
        )}

        <BecomeCreatorSheet open={becomeOpen} onOpenChange={setBecomeOpen} />
        <BuyCoinsSheet open={buyOpen} onOpenChange={setBuyOpen} />
      </div>
    </div>
  );
};

const EarnRow = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="flex items-center gap-3 py-1.5">
    <span className="h-8 w-8 rounded-lg bg-muted/40 grid place-items-center shrink-0">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </span>
    <div className="min-w-0">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-[11px] text-muted-foreground">{desc}</p>
    </div>
  </div>
);

export default Wallet;
