import { BadgeCheck, Crown, Building2, Sparkle, Star, Coins, Users, Shield, Clapperboard, Gem } from "lucide-react";
import type { BadgeKind } from "@/hooks/useWalletCard";
import { BADGE_LABEL } from "./cardThemes";

const STYLE: Record<BadgeKind, { icon: any; tone: string }> = {
  verified: { icon: BadgeCheck, tone: "text-sky-400 bg-sky-500/12 border-sky-500/25" },
  creator: { icon: Clapperboard, tone: "text-pink-400 bg-pink-500/12 border-pink-500/25" },
  premium: { icon: Gem, tone: "text-amber-300 bg-amber-500/12 border-amber-500/25" },
  organization: { icon: Building2, tone: "text-teal-300 bg-teal-500/12 border-teal-500/25" },
  early_supporter: { icon: Sparkle, tone: "text-violet-300 bg-violet-500/12 border-violet-500/25" },
  top_creator: { icon: Star, tone: "text-fuchsia-300 bg-fuchsia-500/12 border-fuchsia-500/25" },
  top_earner: { icon: Coins, tone: "text-emerald-300 bg-emerald-500/12 border-emerald-500/25" },
  community_leader: { icon: Users, tone: "text-cyan-300 bg-cyan-500/12 border-cyan-500/25" },
  founder: { icon: Crown, tone: "text-[#e8c766] bg-[#e8c766]/12 border-[#e8c766]/30" },
  internal: { icon: Shield, tone: "text-indigo-300 bg-indigo-500/12 border-indigo-500/25" },
};

export function WalletBadges({ badges, size = "md" }: { badges: BadgeKind[]; size?: "sm" | "md" }) {
  if (!badges?.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Wallet badges">
      {badges.map((b) => {
        const s = STYLE[b];
        if (!s) return null;
        const Icon = s.icon;
        return (
          <li key={b}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${s.tone} ${size === "sm" ? "text-[9px]" : "text-[10px]"}`}>
            <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} /> {BADGE_LABEL[b]}
          </li>
        );
      })}
    </ul>
  );
}
