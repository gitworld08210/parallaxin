import { TopBar } from "@/components/vibe/TopBar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { fmt } from "@/lib/format";
import { useAuth } from "@/contexts/AuthProvider";
import { Coins, Gift, ShieldCheck, Trophy, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CreatorEarnings } from "@/components/wallet/CreatorEarnings";
import { useIsCreator } from "@/hooks/useIsCreator";
import { useState } from "react";
import { BecomeCreatorSheet } from "@/components/creator/BecomeCreatorSheet";
import { Sparkles } from "lucide-react";

const XP_PER_LEVEL = 10_000;

const Wallet = () => {
  const { profile } = useAuth();
  const { isCreator } = useIsCreator();
  const [becomeOpen, setBecomeOpen] = useState(false);
  const xp = (profile?.posts_count ?? 0) * 100 + (profile?.followers_count ?? 0) * 10;
  const auraCoins = Math.floor(xp / 4);
  const trustScore = profile?.verified ? 95 : 70;
  const me = { xp, auraCoins, trustScore };
  const level = Math.floor(me.xp / XP_PER_LEVEL) + 1;
  const progress = (me.xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  const eligible = me.auraCoins >= 10_000;


  return (
    <div>
      <TopBar subtitle="Aura economy" title="Wallet" />

      <div className="px-5 space-y-5">
        <Link
          to="/wallet/payslips"
          className="w-full flex items-center gap-3 rounded-3xl p-5 border border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30 transition-colors"
        >
          <span className="h-11 w-11 rounded-2xl bg-primary/15 grid place-items-center">
            <FileText className="h-5 w-5 text-primary" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold">My Payslips</span>
            <span className="block text-xs text-muted-foreground">View & download your monthly salary slips</span>
          </span>
          <span className="text-xs font-semibold px-3 py-2 rounded-full bg-primary/10 text-primary">Open</span>
        </Link>

        {isCreator ? (
          <CreatorEarnings />
        ) : (
          <button
            onClick={() => setBecomeOpen(true)}
            className="w-full text-left rounded-3xl p-5 border border-primary/30 bg-gradient-to-r from-primary/10 to-aura/10 flex items-center gap-3"
          >
            <span className="h-11 w-11 rounded-2xl bg-primary/20 grid place-items-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">Become a Creator to earn</span>
              <span className="block text-xs text-muted-foreground">Receive tips & request payouts. 85/15 split.</span>
            </span>
            <span className="text-xs font-semibold px-3 py-2 rounded-full bg-gradient-primary text-primary-foreground shadow-glow">Start</span>
          </button>
        )}
        <BecomeCreatorSheet open={becomeOpen} onOpenChange={setBecomeOpen} />

        {/* Balance hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 shadow-elevated"
          style={{ backgroundImage: "var(--gradient-infinity)" }}
        >
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-gold opacity-30 blur-3xl" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Aura Coin balance</p>
          <div className="mt-2 flex items-baseline gap-2">
            <Coins className="h-7 w-7 text-aura" />
            <span className="font-display text-5xl font-semibold text-gradient-gold">
              {fmt(me.auraCoins)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Earned through XP, streaks & seasonal pools</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="glass-strong rounded-xl py-2.5 text-xs font-semibold">Earn</button>
            <button className="rounded-xl py-2.5 text-xs font-semibold bg-gradient-primary text-primary-foreground shadow-glow">
              Redeem
            </button>
          </div>
        </motion.div>

        {/* XP progression */}
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Level</p>
              <p className="font-display text-2xl font-semibold">Lv {level}</p>
            </div>
            <Trophy className="h-6 w-6 text-aura" />
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-primary shadow-glow"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{fmt(me.xp)} XP · {fmt(XP_PER_LEVEL - (me.xp % XP_PER_LEVEL))} to next level</p>
        </GlassCard>

        {/* Reward pool eligibility */}
        <GlassCard>
          <div className="flex items-start gap-3">
            <span className="h-10 w-10 rounded-xl bg-gradient-gold grid place-items-center shadow-gold">
              <Gift className="h-5 w-5 text-aura-foreground" />
            </span>
            <div className="flex-1">
              <p className="font-semibold">Seasonal Reward Pool</p>
              <p className="text-xs text-muted-foreground">
                Reach 10,000 Aura Coins to enter the seasonal draw. Coins are deducted on win.
              </p>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
                <div
                  className="h-full bg-gradient-gold"
                  style={{ width: `${Math.min(100, (me.auraCoins / 10_000) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {eligible ? "Eligible ✦" : `${fmt(10_000 - me.auraCoins)} coins to qualify`}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Trust & anti-farming placeholders */}
        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="p-4">
            <ShieldCheck className="h-5 w-5 text-verified mb-2" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Trust score</p>
            <p className="font-display text-2xl font-semibold">{me.trustScore}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <Sparkles className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Anti-farming</p>
            <p className="font-display text-base font-semibold">Protected</p>
          </GlassCard>
        </div>

        <Link to="/premium" className="block">
          <GlassCard className="flex items-center justify-between bg-gradient-primary/0 border-primary/30">
            <div>
              <p className="font-semibold">Unlock Aura Pro</p>
              <p className="text-xs text-muted-foreground">AI tools · creator suite · reduced ads</p>
            </div>
            <span className="text-xs font-semibold px-3 py-2 rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
              Explore
            </span>
          </GlassCard>
        </Link>
      </div>
    </div>
  );
};

export default Wallet;
