export type Placement = "reels" | "stories" | "feed" | "explore";

export const PLACEMENTS: { id: Placement; label: string; hint: string; ratio: string }[] = [
  { id: "reels", label: "Reels", hint: "Full-screen video between reels", ratio: "9:16" },
  { id: "stories", label: "Stories", hint: "Between user stories, skippable after 5s", ratio: "9:16" },
  { id: "feed", label: "Feed", hint: "Sponsored post in the home feed", ratio: "1:1 / 4:5" },
  { id: "explore", label: "Explore", hint: "Grid tile inside Explore & Search", ratio: "1:1" },
];

export const OBJECTIVES = [
  { id: "awareness", label: "Awareness", desc: "Show your ad to as many people as possible" },
  { id: "traffic", label: "Traffic", desc: "Send people to your website or profile" },
  { id: "engagement", label: "Engagement", desc: "Get more likes, comments and shares" },
  { id: "leads", label: "Leads", desc: "Collect enquiries from interested people" },
  { id: "app_installs", label: "App installs", desc: "Drive installs of your app" },
  { id: "conversions", label: "Conversions", desc: "Optimise for purchases and sign-ups" },
] as const;

export const CTAS = [
  { id: "learn_more", label: "Learn more" },
  { id: "shop_now", label: "Shop now" },
  { id: "sign_up", label: "Sign up" },
  { id: "book_now", label: "Book now" },
  { id: "download", label: "Download" },
  { id: "contact_us", label: "Contact us" },
  { id: "watch_more", label: "Watch more" },
];

export const OPTIMIZATION_GOALS = [
  { id: "reach", label: "Reach" },
  { id: "impressions", label: "Impressions" },
  { id: "link_clicks", label: "Link clicks" },
  { id: "video_views", label: "Video views" },
  { id: "conversions", label: "Conversions" },
];

export const INTERESTS = [
  "Fashion", "Beauty", "Fitness", "Food", "Travel", "Technology",
  "Gaming", "Finance", "Music", "Movies", "Education", "Business",
  "Sports", "Automotive", "Home & decor", "Parenting", "Photography", "Comedy",
];

export const LOCATIONS = [
  "India", "Delhi NCR", "Mumbai", "Bengaluru", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "United States",
  "United Kingdom", "UAE", "Canada", "Australia", "Singapore",
];

export const LANGUAGES = ["Hindi", "English", "Bengali", "Marathi", "Tamil", "Telugu", "Gujarati", "Kannada", "Punjabi"];

export type Targeting = {
  locations: string[];
  age_min: number;
  age_max: number;
  genders: string[];
  languages: string[];
  interests: string[];
};

export const DEFAULT_TARGETING: Targeting = {
  locations: ["India"],
  age_min: 18,
  age_max: 55,
  genders: ["male", "female", "other"],
  languages: [],
  interests: [],
};

export const TARGETING = DEFAULT_TARGETING;

const nf = new Intl.NumberFormat("en-IN");

export const fmtInt = (n: number | null | undefined) => nf.format(Math.round(Number(n ?? 0)));
export const fmtCoins = (n: number | null | undefined) => `${nf.format(Math.round(Number(n ?? 0)))} AC`;

export const fmtCompact = (n: number | null | undefined) => {
  const v = Number(n ?? 0);
  if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return nf.format(Math.round(v));
};

export const fmtPct = (n: number | null | undefined) => `${Number(n ?? 0).toFixed(2)}%`;

export const dateStr = (d: Date) => d.toISOString().slice(0, 10);

export const rangeFor = (preset: string): { from: string; to: string } => {
  const to = new Date();
  const from = new Date();
  const days = preset === "today" ? 0 : preset === "7d" ? 6 : preset === "14d" ? 13 : preset === "90d" ? 89 : 29;
  from.setDate(to.getDate() - days);
  return { from: dateStr(from), to: dateStr(to) };
};

export const DATE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "14d", label: "Last 14 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

export const statusTone = (s: string) =>
  s === "active"
    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
    : s === "paused"
      ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
      : s === "rejected"
        ? "bg-destructive/15 text-destructive border-destructive/30"
        : s === "approved"
          ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
          : "bg-muted text-muted-foreground border-border";