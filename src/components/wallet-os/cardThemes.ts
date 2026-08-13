import type { BadgeKind, CardTheme, CardType } from "@/hooks/useWalletCard";

export type ThemeSkin = {
  label: string;
  /** Base card surface (deep, expensive, never flat) */
  surface: string;
  /** Soft accent glow layered over the surface */
  glow: string;
  /** Metallic sheen sweep */
  sheen: string;
  /** Foil/edge line colour */
  edge: string;
  /** Accent used for text + chip */
  accent: string;
  finish: "metal" | "glass" | "carbon";
};

export const CARD_THEMES: Record<CardTheme, ThemeSkin> = {
  standard: {
    label: "Standard Edition",
    surface: "linear-gradient(145deg,#191b21 0%,#0d0e12 48%,#1c1f27 100%)",
    glow: "radial-gradient(120% 90% at 85% 0%, rgba(148,163,184,0.22), transparent 62%)",
    sheen: "linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.16) 47%, transparent 60%)",
    edge: "rgba(255,255,255,0.16)",
    accent: "#cbd5e1",
    finish: "metal",
  },
  creator: {
    label: "Creator Edition",
    surface: "linear-gradient(145deg,#2a1230 0%,#120a18 50%,#331538 100%)",
    glow: "radial-gradient(120% 90% at 80% 0%, rgba(236,72,153,0.34), transparent 60%)",
    sheen: "linear-gradient(115deg, transparent 30%, rgba(255,214,236,0.20) 47%, transparent 62%)",
    edge: "rgba(244,114,182,0.42)",
    accent: "#f9a8d4",
    finish: "glass",
  },
  premium: {
    label: "Premium Edition",
    surface: "linear-gradient(145deg,#1b1508 0%,#0c0a06 50%,#241c0b 100%)",
    glow: "radial-gradient(120% 90% at 82% 0%, rgba(234,179,8,0.30), transparent 60%)",
    sheen: "linear-gradient(115deg, transparent 30%, rgba(255,236,179,0.26) 46%, transparent 62%)",
    edge: "rgba(234,179,8,0.45)",
    accent: "#fcd34d",
    finish: "metal",
  },
  elite: {
    label: "Elite Edition",
    surface: "linear-gradient(145deg,#0a1220 0%,#05070c 50%,#101c2e 100%)",
    glow: "radial-gradient(120% 90% at 78% 0%, rgba(56,189,248,0.30), transparent 60%)",
    sheen: "linear-gradient(115deg, transparent 32%, rgba(186,230,253,0.22) 47%, transparent 62%)",
    edge: "rgba(56,189,248,0.40)",
    accent: "#7dd3fc",
    finish: "carbon",
  },
  founder: {
    label: "Founder Edition",
    surface: "linear-gradient(145deg,#161007 0%,#000000 46%,#241a06 100%)",
    glow: "radial-gradient(130% 100% at 76% -10%, rgba(212,175,55,0.42), transparent 58%)",
    sheen: "linear-gradient(115deg, transparent 28%, rgba(255,228,150,0.34) 45%, transparent 60%)",
    edge: "rgba(212,175,55,0.62)",
    accent: "#e8c766",
    finish: "metal",
  },
  organization: {
    label: "Organization Edition",
    surface: "linear-gradient(145deg,#0b1a1a 0%,#050c0d 50%,#0e2528 100%)",
    glow: "radial-gradient(120% 90% at 82% 0%, rgba(45,212,191,0.28), transparent 60%)",
    sheen: "linear-gradient(115deg, transparent 32%, rgba(153,246,228,0.20) 47%, transparent 62%)",
    edge: "rgba(45,212,191,0.42)",
    accent: "#5eead4",
    finish: "glass",
  },
  internal: {
    label: "Internal Staff Edition",
    surface: "linear-gradient(145deg,#14161c 0%,#08090c 50%,#1b1f2a 100%)",
    glow: "radial-gradient(120% 90% at 80% 0%, rgba(129,140,248,0.28), transparent 60%)",
    sheen: "linear-gradient(115deg, transparent 32%, rgba(199,210,254,0.20) 47%, transparent 62%)",
    edge: "rgba(129,140,248,0.42)",
    accent: "#a5b4fc",
    finish: "carbon",
  },
  holiday: {
    label: "Holiday Edition",
    surface: "linear-gradient(145deg,#0d1b13 0%,#07100b 50%,#1d1010 100%)",
    glow: "radial-gradient(120% 90% at 80% 0%, rgba(248,113,113,0.28), transparent 58%)",
    sheen: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.24) 46%, transparent 62%)",
    edge: "rgba(134,239,172,0.45)",
    accent: "#86efac",
    finish: "glass",
  },
  anniversary: {
    label: "Anniversary Edition",
    surface: "linear-gradient(145deg,#1a1024 0%,#0a0710 50%,#211534 100%)",
    glow: "radial-gradient(120% 90% at 80% 0%, rgba(167,139,250,0.32), transparent 60%)",
    sheen: "linear-gradient(115deg, transparent 30%, rgba(221,214,254,0.24) 46%, transparent 62%)",
    edge: "rgba(167,139,250,0.45)",
    accent: "#c4b5fd",
    finish: "glass",
  },
  limited: {
    label: "Limited Edition",
    surface: "linear-gradient(145deg,#1c0f0a 0%,#0a0605 50%,#2a1610 100%)",
    glow: "radial-gradient(120% 90% at 80% 0%, rgba(251,146,60,0.32), transparent 60%)",
    sheen: "linear-gradient(115deg, transparent 30%, rgba(254,215,170,0.26) 46%, transparent 62%)",
    edge: "rgba(251,146,60,0.48)",
    accent: "#fdba74",
    finish: "metal"
  },
};



export const CARD_TYPE_LABEL: Record<CardType, string> = {
  standard: "Standard Wallet",
  verified: "Verified Wallet",
  creator: "Creator Wallet",
  organization: "Organization Wallet",
  premium: "Premium Wallet",
  founder: "Founder Wallet",
  internal: "Internal Staff Wallet",
};

export const BADGE_LABEL: Record<BadgeKind, string> = {
  verified: "Verified",
  creator: "Creator",
  premium: "Premium",
  organization: "Organization",
  early_supporter: "Early Supporter",
  top_creator: "Top Creator",
  top_earner: "Top Earner",
  community_leader: "Community Leader",
  founder: "Founder",
  internal: "Internal",
};

export const REFRESH_REASONS = [
  { id: "security_upgrade", label: "Security upgrade", desc: "Rotate the card's security chip signature" },
  { id: "new_encryption", label: "New encryption", desc: "Move to the latest post-quantum encryption suite" },
  { id: "design_upgrade", label: "Design upgrade", desc: "Regenerate the card with the newest design system" },
  { id: "technology_upgrade", label: "Technology upgrade", desc: "Adopt the newest Aurelix card technology" },
];

export const fmtDate = (v: string) =>
  new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
