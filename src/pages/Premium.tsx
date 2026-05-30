import { TopBar } from "@/components/vibe/TopBar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { Check, Crown, Sparkles, Infinity as InfinityIcon, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const tiers = [
  {
    id: "aura+",
    name: "Aura+",
    tagline: "Unlocked through XP",
    icon: Sparkles,
    gradient: "bg-gradient-primary",
    glow: "shadow-glow",
    perks: [
      "Premium profile visuals",
      "Animated profile aura",
      "Earn Aura Coins faster",
      "Priority discovery boost",
    ],
    cta: "Unlock with XP",
    unlock: "10,000 XP",
  },
  {
    id: "pro",
    name: "Aura Pro",
    tagline: "Coin unlockable",
    icon: Crown,
    gradient: "bg-gradient-gold",
    glow: "shadow-gold",
    perks: [
      "AI image generation · 8/day",
      "Advanced creator tools",
      "Reduced ads experience",
      "Advanced profile effects",
    ],
    cta: "Unlock for 5,000 Aura",
    unlock: "5,000 Aura Coins",
  },
  {
    id: "infinity",
    name: "Aura Infinity",
    tagline: "Elite tier",
    icon: InfinityIcon,
    gradient: "bg-gradient-infinity",
    glow: "shadow-aura",
    perks: [
      "Cinematic elite UI theming",
      "AI generation · 25/day",
      "Future ad-free support",
      "Elite aura visuals & effects",
      "Founder council access",
    ],
    cta: "Ascend to Infinity",
    unlock: "Invite + 25,000 Aura",
  },
];

const Premium = () => {
  return (
    <div>
      <TopBar subtitle="Premium tiers" title="Aura Universe" />

      <div className="px-5 space-y-5">
        <Link to="/store" className="block">
          <GlassCard className="p-4 flex items-center justify-between gap-3 hover:opacity-90 transition">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-2xl grid place-items-center bg-gradient-gold shadow-gold">
                <ShoppingBag className="h-5 w-5 text-primary-foreground" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Real money</p>
                <p className="font-semibold">Open Store · Subscriptions & Coin packs</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">→</span>
          </GlassCard>
        </Link>

        {tiers.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <GlassCard className="relative overflow-hidden p-0">
              <div className={`absolute inset-0 opacity-30 ${t.gradient}`} />
              <div className="relative p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`h-12 w-12 rounded-2xl grid place-items-center ${t.gradient} ${t.glow}`}>
                    <t.icon className="h-6 w-6 text-primary-foreground" />
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t.tagline}</p>
                    <h3 className="font-display text-2xl font-semibold">{t.name}</h3>
                  </div>
                </div>

                <ul className="space-y-2 mb-5">
                  {t.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">{t.unlock}</p>
                  <button className={`text-xs font-semibold px-4 py-2.5 rounded-full text-primary-foreground ${t.gradient} ${t.glow}`}>
                    {t.cta}
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}

        <p className="text-center text-xs text-muted-foreground pt-2">
          All tiers powered by the Aura economy · No fiat required
        </p>
      </div>
    </div>
  );
};

export default Premium;
