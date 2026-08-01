import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Volume2, ChevronRight } from "lucide-react";
import { CTAS, type Placement } from "../lib";

export type PreviewData = {
  brand: string;
  headline?: string;
  primaryText?: string;
  cta: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video";
};

const ctaLabel = (id: string) => CTAS.find((c) => c.id === id)?.label ?? "Learn more";

function Media({ data, className }: { data: PreviewData; className?: string }) {
  if (!data.mediaUrl) {
    return (
      <div className={`grid place-items-center bg-muted/40 text-[11px] text-muted-foreground ${className}`}>
        Creative preview
      </div>
    );
  }
  if (data.mediaType === "video") {
    return <video src={data.mediaUrl} className={`object-cover ${className}`} muted loop autoPlay playsInline />;
  }
  return <img src={data.mediaUrl} alt={`${data.brand} ad creative preview`} className={`object-cover ${className}`} />;
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[248px] shrink-0 rounded-[2rem] border-[6px] border-foreground/85 bg-background shadow-xl">
      <div className="relative h-[500px] overflow-hidden rounded-[1.55rem] bg-black">
        <div className="absolute left-1/2 top-1.5 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-black/90" />
        {children}
      </div>
    </div>
  );
}

function SponsoredChip() {
  return (
    <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/90 backdrop-blur">
      Sponsored
    </span>
  );
}

function ReelsPreview({ data }: { data: PreviewData }) {
  return (
    <Phone>
      <Media data={data} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-3.5 text-white">
        {[Heart, MessageCircle, Send, Bookmark, MoreHorizontal].map((Icon, i) => (
          <Icon key={i} className="h-5 w-5 drop-shadow" />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-3 text-white">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-white/25" />
          <span className="text-[11px] font-semibold">{data.brand}</span>
          <SponsoredChip />
        </div>
        <p className="line-clamp-2 text-[11px] leading-snug text-white/90">
          {data.primaryText || "Your primary text appears here."}
        </p>
        <button className="flex w-full items-center justify-between rounded-lg bg-white/95 px-3 py-2 text-[11px] font-semibold text-black">
          {ctaLabel(data.cta)}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </Phone>
  );
}

function StoryPreview({ data }: { data: PreviewData }) {
  return (
    <Phone>
      <Media data={data} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-x-0 top-0 space-y-2 bg-gradient-to-b from-black/70 to-transparent p-3 pt-6">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-0.5 flex-1 rounded-full bg-white/30">
              {i === 0 && <div className="h-full w-2/3 rounded-full bg-white" />}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-white">
          <div className="h-6 w-6 rounded-full bg-white/25" />
          <span className="text-[11px] font-semibold">{data.brand}</span>
          <SponsoredChip />
          <Volume2 className="ml-auto h-4 w-4" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
        <p className="line-clamp-2 text-center text-[11px] text-white/90">{data.headline || data.primaryText || "Headline"}</p>
        <button className="rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold text-black">
          {ctaLabel(data.cta)}
        </button>
        <span className="text-[9px] text-white/60">Skip in 5s</span>
      </div>
    </Phone>
  );
}

function FeedPreview({ data }: { data: PreviewData }) {
  return (
    <Phone>
      <div className="flex h-full flex-col bg-background pt-7">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="h-7 w-7 rounded-full bg-muted" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-foreground">{data.brand}</p>
            <p className="text-[9px] text-muted-foreground">Sponsored</p>
          </div>
          <MoreHorizontal className="ml-auto h-4 w-4 text-muted-foreground" />
        </div>
        <Media data={data} className="aspect-square w-full" />
        <button className="flex items-center justify-between border-y border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold text-foreground">
          {ctaLabel(data.cta)}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-3 px-3 py-2 text-foreground">
          <Heart className="h-4 w-4" />
          <MessageCircle className="h-4 w-4" />
          <Send className="h-4 w-4" />
          <Bookmark className="ml-auto h-4 w-4" />
        </div>
        <p className="line-clamp-2 px-3 text-[11px] text-foreground">
          <span className="font-semibold">{data.brand}</span>{" "}
          <span className="text-muted-foreground">{data.primaryText || "Your primary text appears here."}</span>
        </p>
      </div>
    </Phone>
  );
}

function ExplorePreview({ data }: { data: PreviewData }) {
  return (
    <Phone>
      <div className="h-full bg-background pt-8">
        <div className="grid grid-cols-3 gap-0.5 px-0.5">
          {Array.from({ length: 9 }).map((_, i) =>
            i === 4 ? (
              <div key={i} className="relative col-span-2 row-span-2 aspect-square">
                <Media data={data} className="h-full w-full" />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[8px] font-medium text-white">
                  Sponsored
                </span>
              </div>
            ) : (
              <div key={i} className="aspect-square bg-muted/60" />
            ),
          )}
        </div>
      </div>
    </Phone>
  );
}

export function AdPreview({ placement, data }: { placement: Placement; data: PreviewData }) {
  if (placement === "reels") return <ReelsPreview data={data} />;
  if (placement === "stories") return <StoryPreview data={data} />;
  if (placement === "explore") return <ExplorePreview data={data} />;
  return <FeedPreview data={data} />;
}
