export const fmt = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" :
  n >= 1_000 ? (n / 1_000).toFixed(1) + "K" : `${n}`;

export const initialsOf = (name?: string | null) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";

const palettes: [string, string][] = [
  ["268 92% 60%", "320 92% 60%"],
  ["195 95% 55%", "268 92% 60%"],
  ["48 100% 60%", "28 100% 55%"],
  ["280 92% 60%", "320 92% 60%"],
  ["320 92% 60%", "48 100% 60%"],
  ["142 70% 45%", "195 95% 55%"],
];

export const gradientFor = (seed?: string | null) => {
  const s = seed || "?";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const [a, b] = palettes[Math.abs(h) % palettes.length];
  return `linear-gradient(135deg, hsl(${a}), hsl(${b}))`;
};

export const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString();
};
