// VibeNexus mock data — placeholder layer for future realtime/AI backends.
export type VerificationKind = "creator" | "gov" | "brand" | "verified" | "founder";

export interface Creator {
  id: string;
  handle: string;
  name: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  xp: number;
  auraCoins: number;
  tier: "free" | "aura+" | "pro" | "infinity";
  badges: VerificationKind[];
  trustScore: number;
}

export interface Reel {
  id: string;
  creator: Creator;
  caption: string;
  cover: string; // gradient seed
  likes: number;
  comments: number;
  shares: number;
}

const grad = (a: string, b: string) =>
  `linear-gradient(135deg, hsl(${a}), hsl(${b}))`;

export const me: Creator = {
  id: "u_me",
  handle: "@nova",
  name: "Nova Aether",
  avatar: grad("268 92% 60%", "320 92% 60%"),
  bio: "Building the future of creator economies ✦ Founder · VibeNexus",
  followers: 128400,
  following: 312,
  xp: 7420,
  auraCoins: 2840,
  tier: "pro",
  badges: ["creator", "verified", "founder"],
  trustScore: 92,
};

export const creators: Creator[] = [
  { id: "c1", handle: "@lumen", name: "Lumen Vale", avatar: grad("195 95% 55%", "268 92% 60%"), bio: "Cinematic storyteller", followers: 482300, following: 188, xp: 22100, auraCoins: 9800, tier: "infinity", badges: ["creator", "verified"], trustScore: 97 },
  { id: "c2", handle: "@kairo", name: "Kairo Sun", avatar: grad("48 100% 60%", "28 100% 55%"), bio: "Music · Visuals · Vibes", followers: 89400, following: 412, xp: 5400, auraCoins: 1240, tier: "aura+", badges: ["creator"], trustScore: 88 },
  { id: "c3", handle: "@minato", name: "Minato Cloud", avatar: grad("280 92% 60%", "320 92% 60%"), bio: "AI artist", followers: 31200, following: 220, xp: 3100, auraCoins: 540, tier: "free", badges: ["verified"], trustScore: 79 },
  { id: "c4", handle: "@ariya", name: "Ariya Bloom", avatar: grad("320 92% 60%", "48 100% 60%"), bio: "Fashion · Lifestyle", followers: 1240000, following: 89, xp: 48200, auraCoins: 24000, tier: "infinity", badges: ["brand", "verified"], trustScore: 99 },
  { id: "c5", handle: "@statefeed", name: "City Hall", avatar: grad("142 70% 45%", "195 95% 55%"), bio: "Official channel", followers: 220000, following: 12, xp: 12000, auraCoins: 0, tier: "free", badges: ["gov"], trustScore: 100 },
];

export const reels: Reel[] = creators.slice(0, 4).map((c, i) => ({
  id: `r${i}`,
  creator: c,
  caption: [
    "Sunset run on the rooftop — felt cinematic ✦",
    "New track dropping at midnight 🎧",
    "AI-generated dreamscape #vibe",
    "Behind the scenes of the new drop",
  ][i],
  cover: c.avatar,
  likes: 4200 + i * 1100,
  comments: 120 + i * 40,
  shares: 60 + i * 18,
}));

export const fmt = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" :
  n >= 1_000 ? (n / 1_000).toFixed(1) + "K" : `${n}`;
