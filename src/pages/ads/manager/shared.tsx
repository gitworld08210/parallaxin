import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMyAdvertisers, useAdvertiser } from "@/hooks/ads/useAdvertiser";
import { Image as ImageIcon } from "lucide-react";

/* ------------------------------- formatting ------------------------------- */

export const inr = (v: number) =>
  "₹" + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: Math.abs(v) < 100 ? 2 : 0 });
export const num = (v: number) => Number(v || 0).toLocaleString("en-IN");
export const pct = (v: number) => `${Number(v || 0).toFixed(2)}%`;
export const mult = (v: number) => `${Number(v || 0).toFixed(2)}x`;

export const compact = (v: number) => {
  const n = Number(v || 0);
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
};

/* -------------------------------- advertiser ------------------------------- */

/**
 * Resolves the advertiser account for the manager: the :advertiserId route
 * param when present, otherwise the first account the user is a member of.
 */
export function useResolvedAdvertiser() {
  const { advertiserId: paramId } = useParams();
  const { data: memberships = [], isLoading: loadingList } = useMyAdvertisers();
  const fallbackId = (memberships[0] as any)?.advertiser?.id as string | undefined;
  const id = paramId ?? fallbackId;
  const { data: advertiser, isLoading } = useAdvertiser(id);
  return {
    advertiserId: id,
    advertiser: advertiser ?? (memberships[0] as any)?.advertiser ?? null,
    memberships,
    isLoading: loadingList || (!!id && isLoading),
  };
}

/* -------------------------------- placements ------------------------------- */

export const SURFACES = [
  { key: "feed", label: "Aurelix Feed", hint: "In-feed image & video ads" },
  { key: "reels", label: "Aurelix Reels", hint: "Full-screen ads between reels" },
  { key: "stories", label: "Aurelix Stories", hint: "9:16 story ads with swipe-up" },
  { key: "explore", label: "Aurelix Explore", hint: "Discovery grid placements" },
  { key: "search", label: "In-Stream Ads (Videos)", hint: "Mid-roll on long videos" },
  { key: "profile", label: "Profile Feed", hint: "Creator profile placements" },
] as const;

export type SurfaceKey = (typeof SURFACES)[number]["key"];

export const surfaceLabel = (key: string) =>
  SURFACES.find((s) => s.key === key)?.label ?? String(key).replace(/_/g, " ");

/* --------------------------------- UI atoms -------------------------------- */

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  delta,
  sub,
}: {
  label: string;
  value: string;
  delta?: number | null;
  sub?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {delta != null && Number.isFinite(delta) && (
        <p className={`mt-0.5 text-[11px] font-medium ${up ? "text-emerald-500" : "text-destructive"}`}>
          {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%{sub ? ` ${sub}` : ""}
        </p>
      )}
      {delta == null && sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function StatusDot({ tone }: { tone: "active" | "learning" | "limited" | "inactive" | "rejected" }) {
  const color =
    tone === "active" ? "bg-emerald-500"
      : tone === "learning" ? "bg-amber-500"
        : tone === "limited" ? "bg-sky-500"
          : tone === "rejected" ? "bg-destructive"
            : "bg-muted-foreground";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

/* ------------------------------ creative media ----------------------------- */

/** Resolves a signed URL for a private ad creative (or uses the public URL). */
export function useCreativeUrl(creative: any): { url: string | null; isVideo: boolean } {
  const [url, setUrl] = useState<string | null>(creative?.media_url ?? null);
  const path = creative?.media_path as string | undefined;
  const direct = creative?.media_url as string | undefined;

  useEffect(() => {
    let cancelled = false;
    if (direct) { setUrl(direct); return; }
    if (!path) { setUrl(null); return; }
    supabase.storage.from("ad-creatives").createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [path, direct]);

  const isVideo = String(creative?.media_mime ?? "").startsWith("video/") || creative?.format === "video";
  return { url, isVideo };
}

export function CreativeMedia({ creative, className = "" }: { creative: any; className?: string }) {
  const { url, isVideo } = useCreativeUrl(creative);
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }
  if (isVideo) {
    return <video src={url} className={className} muted loop playsInline autoPlay preload="metadata" />;
  }
  return <img src={url} alt={creative?.name ?? "Ad creative"} className={className} loading="lazy" />;
}

/* ---------------------------------- misc ---------------------------------- */

export const OBJECTIVES = [
  { key: "awareness", label: "Awareness", hint: "Build brand recall" },
  { key: "reach", label: "Reach", hint: "Show to the most people" },
  { key: "traffic", label: "Traffic", hint: "Send people to a destination" },
  { key: "engagement", label: "Engagement", hint: "Get more engagement" },
  { key: "app_promotion", label: "App Promotion", hint: "Get more installs" },
  { key: "video_views", label: "Video Views", hint: "Get more views on reels" },
  { key: "conversions", label: "Conversions", hint: "Drive valuable actions" },
] as const;

export const CTA_OPTIONS = [
  "Learn More", "Shop Now", "Sign Up", "Book Now", "Download",
  "Get Offer", "Subscribe", "Contact Us", "Watch More", "Install Now",
];

export const AD_FORMAT_SPECS = [
  { label: "Reels Ads", ratio: "9:16", size: "1080 × 1920" },
  { label: "Stories Ads", ratio: "9:16", size: "1080 × 1920" },
  { label: "Feed Ads", ratio: "1:1 / 4:5", size: "1080 × 1350" },
  { label: "In-Stream", ratio: "16:9", size: "1920 × 1080" },
];
