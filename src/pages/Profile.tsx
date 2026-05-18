import { TopBar } from "@/components/vibe/TopBar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { creators, fmt, me } from "@/lib/mock";
import { motion } from "framer-motion";
import { Grid3x3, PlaySquare, Settings, Sparkles, BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const tabs = [
  { id: "reels", icon: PlaySquare, label: "Reels" },
  { id: "grid", icon: Grid3x3, label: "Posts" },
  { id: "aura", icon: Sparkles, label: "Aura" },
] as const;

const Profile = () => {
  const [tab, setTab] = useState<typeof tabs[number]["id"]>("reels");

  return (
    <div>
      <TopBar
        subtitle="Creator"
        title="Profile"
        right={
          <Link to="/verification" className="glass h-11 w-11 rounded-full grid place-items-center">
            <Settings className="h-5 w-5" />
          </Link>
        }
      />

      {/* Hero */}
      <div className="px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl overflow-hidden p-6 shadow-elevated"
          style={{ backgroundImage: "var(--gradient-infinity)" }}
        >
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-primary opacity-30 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-gradient-gold opacity-20 blur-3xl" />

          <div className="relative flex flex-col items-center text-center">
            <AuraAvatar gradient={me.avatar} size="xl" glow initials={me.name[0]} />
            <div className="mt-4 flex items-center gap-2">
              <h2 className="font-display text-2xl font-semibold">{me.name}</h2>
              {me.badges.map((b) => <VerificationBadge key={b} kind={b} />)}
            </div>
            <p className="text-sm text-muted-foreground">{me.handle}</p>
            <p className="mt-3 text-sm max-w-xs">{me.bio}</p>

            <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] font-semibold px-3 py-1 rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-3 w-3" /> Aura Pro
            </span>
          </div>

          {/* Stat cards */}
          <div className="relative mt-6 grid grid-cols-3 gap-2">
            <StatCard label="Followers" value={fmt(me.followers)} to="/profile/followers" />
            <StatCard label="Following" value={fmt(me.following)} to="/profile/following" />
            <StatCard label="Aura" value={fmt(me.auraCoins)} accent />
          </div>

          <div className="relative mt-5 grid grid-cols-2 gap-3">
            <button className="rounded-xl py-2.5 text-sm font-semibold bg-gradient-primary text-primary-foreground shadow-glow">
              Edit profile
            </button>
            <Link to="/premium" className="glass-strong rounded-xl py-2.5 text-sm font-semibold text-center">
              Upgrade
            </Link>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mt-6 glass rounded-full p-1 flex">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                tab === id ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-xl"
              style={{ backgroundImage: creators[i % creators.length].avatar }}
            />
          ))}
        </div>

        {/* Verification CTA */}
        <Link to="/verification" className="block mt-6">
          <GlassCard className="flex items-center gap-3">
            <BadgeCheck className="h-6 w-6 text-verified" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Request verification</p>
              <p className="text-xs text-muted-foreground">Creator · Brand · Government · Standard</p>
            </div>
            <span className="text-xs text-muted-foreground">›</span>
          </GlassCard>
        </Link>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, accent, to }: { label: string; value: string; accent?: boolean; to?: string }) => {
  const inner = (
    <div className="glass-strong rounded-2xl px-3 py-4 text-center">
      <p className={`font-display text-xl font-semibold ${accent ? "text-gradient-gold" : ""}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

export default Profile;
