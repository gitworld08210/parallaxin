import { Heart, MessageCircle, Send, MoreHorizontal, Bookmark, ChevronRight } from "lucide-react";
import { CreativeMedia } from "../shared";

export interface PreviewData {
  brand: string;
  avatarUrl?: string | null;
  headline?: string | null;
  description?: string | null;
  cta?: string | null;
  creative?: any;
}

function Phone({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[520px] w-[260px] overflow-hidden rounded-[2.2rem] border-[8px] border-foreground/85 bg-black shadow-xl">
        <div className="absolute left-1/2 top-1.5 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-foreground/85" />
        <div className="relative h-full w-full overflow-hidden">{children}</div>
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function Avatar({ data }: { data: PreviewData }) {
  return data.avatarUrl ? (
    <img src={data.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
  ) : (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
      {data.brand.slice(0, 1).toUpperCase()}
    </div>
  );
}

function CtaBar({ data, dark = true }: { data: PreviewData; dark?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold ${
        dark ? "bg-white/95 text-black" : "bg-primary text-primary-foreground"
      }`}
    >
      <span className="truncate">{data.cta || "Learn More"}</span>
      <ChevronRight className="h-3.5 w-3.5" />
    </div>
  );
}

/* ---------------------------------- Reels --------------------------------- */

export function ReelsPreview({ data }: { data: PreviewData }) {
  return (
    <Phone label="Reels">
      <CreativeMedia creative={data.creative} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4 text-white">
        <Heart className="h-6 w-6" />
        <MessageCircle className="h-6 w-6" />
        <Send className="h-6 w-6" />
        <MoreHorizontal className="h-6 w-6" />
      </div>
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-3 text-white">
        <div className="flex items-center gap-2">
          <Avatar data={data} />
          <span className="text-xs font-semibold">{data.brand}</span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">Sponsored</span>
        </div>
        <p className="line-clamp-2 text-[11px] leading-snug text-white/90">
          {data.headline || "Your reel ad headline appears here"}
        </p>
        <CtaBar data={data} />
      </div>
    </Phone>
  );
}

/* --------------------------------- Stories -------------------------------- */

export function StoriesPreview({ data }: { data: PreviewData }) {
  return (
    <Phone label="Stories">
      <CreativeMedia creative={data.creative} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-x-2 top-3 flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-0.5 flex-1 rounded-full ${i === 0 ? "bg-white" : "bg-white/35"}`} />
        ))}
      </div>
      <div className="absolute inset-x-3 top-6 flex items-center gap-2 text-white">
        <Avatar data={data} />
        <span className="text-xs font-semibold">{data.brand}</span>
        <span className="text-[10px] text-white/70">Sponsored</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pb-5 text-white">
        <p className="mb-2 line-clamp-2 text-[11px]">{data.headline || "Swipe up to explore the offer"}</p>
        <div className="mx-auto w-40 rounded-full bg-white/95 py-1.5 text-center text-[11px] font-semibold text-black">
          {data.cta || "Learn More"}
        </div>
      </div>
    </Phone>
  );
}

/* ---------------------------------- Feed ---------------------------------- */

export function FeedPreview({ data }: { data: PreviewData }) {
  return (
    <Phone label="Feed">
      <div className="h-full w-full overflow-hidden bg-background">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Avatar data={data} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{data.brand}</p>
            <p className="text-[10px] text-muted-foreground">Sponsored</p>
          </div>
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
        <CreativeMedia creative={data.creative} className="aspect-square w-full object-cover" />
        <div className="border-b border-border px-3 py-2">
          <CtaBar data={data} dark={false} />
        </div>
        <div className="flex items-center gap-4 px-3 py-2 text-foreground">
          <Heart className="h-5 w-5" />
          <MessageCircle className="h-5 w-5" />
          <Send className="h-5 w-5" />
          <Bookmark className="ml-auto h-5 w-5" />
        </div>
        <div className="px-3 pb-3">
          <p className="text-[11px] leading-snug">
            <span className="font-semibold">{data.brand}</span>{" "}
            {data.description || data.headline || "Your feed ad primary text appears here."}
          </p>
        </div>
      </div>
    </Phone>
  );
}

/* -------------------------------- In-stream ------------------------------- */

export function InStreamPreview({ data }: { data: PreviewData }) {
  return (
    <Phone label="In-Stream Video">
      <div className="flex h-full w-full flex-col bg-background">
        <div className="relative aspect-video w-full bg-black">
          <CreativeMedia creative={data.creative} className="h-full w-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
            Ad · 0:05
          </span>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/30">
            <div className="h-full w-1/4 bg-primary" />
          </div>
        </div>
        <div className="space-y-2 p-3">
          <p className="text-xs font-semibold">{data.headline || "Your in-stream headline"}</p>
          <p className="line-clamp-3 text-[11px] text-muted-foreground">
            {data.description || "Short supporting copy shown under the video player."}
          </p>
          <CtaBar data={data} dark={false} />
        </div>
      </div>
    </Phone>
  );
}

export function PreviewSwitcher({
  data,
  surfaces,
}: {
  data: PreviewData;
  surfaces: string[];
}) {
  const list = surfaces.length ? surfaces : ["reels", "stories", "feed"];
  return (
    <div className="flex flex-wrap justify-center gap-6">
      {list.includes("reels") && <ReelsPreview data={data} />}
      {list.includes("stories") && <StoriesPreview data={data} />}
      {(list.includes("feed") || list.includes("explore") || list.includes("profile")) && <FeedPreview data={data} />}
      {list.includes("search") && <InStreamPreview data={data} />}
    </div>
  );
}
