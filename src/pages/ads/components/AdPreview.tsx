import { Eye, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdPreviewProps = {
  mediaUrl?: string;
  mediaType?: "image" | "video";
  headline?: string;
  primaryText?: string;
  cta?: string;
  accountName?: string;
  placement?: "feed" | "stories" | "reels" | "explore";
};

export function AdPreview({
  mediaUrl,
  mediaType = "image",
  headline,
  primaryText,
  cta = "Learn More",
  accountName = "Aurelix Ads",
  placement = "feed"
}: AdPreviewProps) {
  
  if (placement === "reels" || placement === "stories") {
    return (
      <div className="relative aspect-[9/16] w-full max-w-[320px] mx-auto overflow-hidden rounded-[2.5rem] bg-black border-[6px] border-[#1f1f1f] shadow-2xl">
        {mediaUrl ? (
          mediaType === "video" ? (
            <video src={mediaUrl} className="h-full w-full object-cover" autoPlay muted loop />
          ) : (
            <img src={mediaUrl} className="h-full w-full object-cover" alt="Preview" />
          )
        ) : (
          <div className="h-full w-full bg-white/5 flex items-center justify-center">
            <Sparkles className="h-12 w-12 text-white/10" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        
        <div className="absolute bottom-16 left-4 right-12 text-white">
          <div className="flex items-center gap-2 mb-3">
             <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold">A</div>
             <span className="text-sm font-bold">{accountName}</span>
             <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded uppercase tracking-widest font-bold">Sponsored</span>
          </div>
          <p className="text-sm line-clamp-2 mb-2">{primaryText || "Your primary ad text will appear here."}</p>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg py-2.5 px-4 flex items-center justify-between text-xs font-bold uppercase tracking-widest">
            {cta}
            <Send className="h-3 w-3" />
          </div>
        </div>
        
        <div className="absolute right-3 bottom-24 flex flex-col gap-6 text-white">
          <div className="flex flex-col items-center gap-1">
            <Heart className="h-7 w-7" />
            <span className="text-[10px] font-bold">1.2K</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <MessageCircle className="h-7 w-7" />
            <span className="text-[10px] font-bold">48</span>
          </div>
          <Send className="h-7 w-7" />
          <MoreHorizontal className="h-7 w-7" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] mx-auto overflow-hidden rounded-2xl bg-[#0f0f0f] border border-white/5 shadow-xl">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
           <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">A</div>
           <div>
             <p className="text-sm font-bold text-white">{accountName}</p>
             <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Sponsored</p>
           </div>
        </div>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="aspect-square w-full bg-black flex items-center justify-center">
        {mediaUrl ? (
          mediaType === "video" ? (
            <video src={mediaUrl} className="h-full w-full object-cover" autoPlay muted loop />
          ) : (
            <img src={mediaUrl} className="h-full w-full object-cover" alt="Preview" />
          )
        ) : (
          <Sparkles className="h-12 w-12 text-white/10" />
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-white">
            <Heart className="h-6 w-6" />
            <MessageCircle className="h-6 w-6" />
            <Send className="h-6 w-6" />
          </div>
          <Bookmark className="h-6 w-6 text-white" />
        </div>
        
        <div className="space-y-1.5">
          <p className="text-sm text-white"><span className="font-bold mr-2">{accountName}</span>{primaryText || "Your primary ad text will appear here."}</p>
          <p className="text-xs text-muted-foreground font-medium">{headline || "Ad Headline"}</p>
        </div>

        <button className="w-full mt-4 bg-primary text-white text-xs font-bold uppercase tracking-widest py-2.5 rounded-xl shadow-glow transition hover:brightness-110">
          {cta}
        </button>
      </div>
    </div>
  );
}

function Sparkles(props: any) {
  return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>
}