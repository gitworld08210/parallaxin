import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Send, Plus, Volume2, VolumeX, Pause, Camera, Search, Music2, Bookmark, MoreHorizontal, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useAuth } from "@/contexts/AuthProvider";
import { useAdInteraction } from "@/features/content-understanding/hooks/useAdIntelligence";
import { useAdRanking } from "@/features/content-understanding/hooks/useAdRanking";
import { WhyThisAd } from "@/features/content-understanding/components/WhyThisAd";
import { useContentContext } from "@/features/content-understanding/hooks/useContentContext";
import { CommentSheet } from "@/components/social/CommentSheet";
import { ShareToDM } from "@/components/social/ShareToDM";
import { fmt } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Reel = {
  id: string;
  user_id: string;
  content: string;
  media_url: string;
  like_count: number;
  comment_count: number;
  profile: { username: string; display_name: string; avatar_url: string | null } | null;
  liked?: boolean;
  bookmarked?: boolean;
};

type FeedTab = "following" | "foryou";

const Reels = () => {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [muted, setMuted] = useState(true);
  const [tab, setTab] = useState<FeedTab>("foryou");
  const [commentPost, setCommentPost] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pausedIds, setPausedIds] = useState<Set<string>>(new Set());
  const [chromeDim, setChromeDim] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimTimer = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const q = query(
        collection(db, "posts"),
        where("is_reel", "==", true),
        where("status", "==", "published"),
        orderBy("created_at", "desc"),
        limit(10) // Reduced from 50 to 10 for faster initial load
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        liked: false 
      })) as Reel[];

      setReels(data);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!containerRef.current) return;
    const videos = Array.from(containerRef.current.querySelectorAll<HTMLVideoElement>("video[data-reel-id]"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        const id = v.dataset.reelId!;
        if (e.intersectionRatio > 0.7) {
          setActiveId(id);
          if (!pausedIds.has(id)) v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { threshold: [0, 0.7, 1] });
    videos.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [reels.length, pausedIds]);

  const bumpChrome = () => {
    setChromeDim(false);
    if (dimTimer.current) window.clearTimeout(dimTimer.current);
    dimTimer.current = window.setTimeout(() => setChromeDim(true), 2400);
  };
  useEffect(() => {
    bumpChrome();
    return () => { if (dimTimer.current) window.clearTimeout(dimTimer.current); };
  }, [activeId]);

  const toggleLike = async (r: Reel) => {
    if (!user) return toast.error("Sign in to like");
    const next = !r.liked;
    setReels((arr) => arr.map((x) => x.id === r.id ? { ...x, liked: next, like_count: x.like_count + (next ? 1 : -1) } : x));
  };

  const toggleBookmark = (r: Reel) => {
    setReels((arr) => arr.map((x) => x.id === r.id ? { ...x, bookmarked: !x.bookmarked } : x));
    toast.success(r.bookmarked ? "Removed from saved" : "Saved");
  };

  const togglePause = (r: Reel, videoEl: HTMLVideoElement | null) => {
    if (!videoEl) return;
    const next = new Set(pausedIds);
    if (next.has(r.id)) { next.delete(r.id); videoEl.play().catch(() => {}); }
    else { next.add(r.id); videoEl.pause(); }
    setPausedIds(next);
    bumpChrome();
  };

  const share = (r: Reel) => {
    setSharePost(r.id);
    bumpChrome();
  };

  return (
    <div className="bg-black text-white relative h-full w-full overflow-hidden" onMouseMove={bumpChrome} onTouchStart={bumpChrome}>
      {/* TikTok-style top: For You / Following with animated pill underline */}
      <header
        className={cn(
          "absolute top-0 inset-x-0 z-30 pt-3 pb-4 px-4 flex items-center justify-between transition-opacity duration-500",
          "bg-gradient-to-b from-black/80 via-black/40 to-transparent",
          chromeDim ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <Link to="/search" className="p-2 -ml-2" aria-label="Search">
          <Search className="h-5 w-5" strokeWidth={2} />
        </Link>

        <div className="flex items-center gap-6">
          {(["following", "foryou"] as FeedTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative py-1 text-[15px] font-semibold transition-colors",
                tab === t ? "text-white" : "text-white/60"
              )}
            >
              {t === "following" ? "Following" : "For You"}
              {tab === t && (
                <motion.span
                  layoutId="reels-tab-underline"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-white rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-2 -mr-2 w-9 h-9" /> {/* Placeholder to balance search icon */}
      </header>

      <div ref={containerRef} className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {reels.length === 0 && (
          <div className="h-full grid place-items-center text-center px-8">
            <div>
              <p className="font-display text-3xl mb-2">No reels yet</p>
              <p className="text-sm text-white/60 mb-6">Be the first to drop one.</p>
              <Link to="/compose/reel" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                <Plus className="h-4 w-4" /> Create reel
              </Link>
            </div>
          </div>
        )}
        {reels.map((r) => (
          <div key={r.id} className="snap-start min-h-full w-full">
            <ReelItem
            key={r.id}
            r={r}
            muted={muted}
            chromeDim={chromeDim}
            isPaused={pausedIds.has(r.id)}
            isActive={activeId === r.id}
            onTogglePause={togglePause}
            onToggleMute={() => { setMuted((m) => !m); bumpChrome(); }}
            onToggleLike={toggleLike}
            onToggleBookmark={toggleBookmark}
            onOpenComments={(id) => setCommentPost(id)}
            onShare={share}
            />
          </div>
        ))}
      </div>

      <CommentSheet postId={commentPost} open={!!commentPost} onOpenChange={(b) => !b && setCommentPost(null)} />
      <ShareToDM postId={sharePost} open={!!sharePost} onOpenChange={(b) => !b && setSharePost(null)} />
    </div>
  );
};

const ReelItem = ({
  r, muted, chromeDim, isPaused, isActive, onTogglePause, onToggleMute, onToggleLike, onToggleBookmark, onOpenComments, onShare,
}: {
  r: Reel;
  muted: boolean;
  chromeDim: boolean;
  isPaused: boolean;
  isActive: boolean;
  onTogglePause: (r: Reel, el: HTMLVideoElement | null) => void;
  onToggleMute: () => void;
  onToggleLike: (r: Reel) => void;
  onToggleBookmark: (r: Reel) => void;
  onOpenComments: (id: string) => void;
  onShare: (r: Reel) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTap = useRef(0);
  const watchTimer = useRef<number | null>(null);
  const lastActiveId = useRef<string | null>(null);
  
  const [progress, setProgress] = useState(0);
  const [heartBurst, setHeartBurst] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const { mutate: recordInteraction } = useAdInteraction();
  const { data: context } = useContentContext(isActive ? r.id : undefined);
  const { data: ads = [] } = useAdRanking(isActive ? r.id : undefined);
  const ad = ads[0];

  useEffect(() => {
    if (isActive && r.id !== lastActiveId.current) {
      lastActiveId.current = r.id;
      // Start tracking watch time for interest engine
      if (watchTimer.current) window.clearInterval(watchTimer.current);
      
      const checkpoints = new Set([25, 50, 90]);
      watchTimer.current = window.setInterval(() => {
        if (!videoRef.current || isPaused) return;
        const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        
        checkpoints.forEach(cp => {
          if (p >= cp) {
            recordInteraction({ 
              contentId: r.id, 
              topicIds: context ? [(context as any).primary_category_id, ...((context as any).secondary_category_ids ?? [])].filter(Boolean) as string[] : [], 
              signalType: `watch_${cp}` as any 
            });
            checkpoints.delete(cp);
          }
        });
        
        if (p >= 99) window.clearInterval(watchTimer.current!);
      }, 1000);
    }
    
    return () => {
      if (watchTimer.current) window.clearInterval(watchTimer.current);
    };
  }, [isActive, isPaused, r.id]);

  const onTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (!r.liked) onToggleLike(r);
      setHeartBurst((n) => n + 1);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current && Date.now() - lastTap.current >= 280) {
          onTogglePause(r, videoRef.current);
          lastTap.current = 0;
        }
      }, 290);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (!muted) { v.volume = 1; v.play().catch(() => {}); }
  }, [muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, []);

  return (
    <section className="relative h-full w-full snap-start grid place-items-center shrink-0">
      <video
        ref={videoRef}
        data-reel-id={r.id}
        src={r.media_url}
        loop
        playsInline
        muted={muted}
        onClick={onTap}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Vignette + top/bottom scrims for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none" />

      {/* Double-tap heart burst */}
      <AnimatePresence>
        {heartBurst > 0 && (
          <motion.div
            key={heartBurst}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 grid place-items-center pointer-events-none"
            onAnimationComplete={() => setHeartBurst(0)}
          >
            <Heart className="h-32 w-32 fill-white text-white drop-shadow-2xl" strokeWidth={0} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="h-20 w-20 rounded-full bg-white/15 backdrop-blur-xl grid place-items-center animate-in fade-in zoom-in duration-200">
            <Pause className="h-8 w-8 fill-white" />
          </div>
        </div>
      )}

      {/* Mute toggle */}
      <button
        onClick={onToggleMute}
        className={cn(
          "absolute top-4 right-4 h-9 w-9 rounded-full bg-black/20 backdrop-blur-md border border-white/10 grid place-items-center transition-opacity duration-500 z-20",
          chromeDim ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* Right action rail — TikTok style */}
      <div
        className={cn(
          "absolute right-2.5 bottom-28 flex flex-col items-center gap-4 transition-opacity duration-500 z-20",
          chromeDim ? "opacity-30" : "opacity-100"
        )}
      >
        {/* Avatar + follow plus */}
        <Link to={r.profile ? `/u/${r.profile.username}` : "#"} className="relative pb-2">
          {r.profile?.avatar_url ? (
            <img src={r.profile.avatar_url} className="h-12 w-12 rounded-full object-cover ring-2 ring-white" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary ring-2 ring-white grid place-items-center font-bold">
              {r.profile?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-accent grid place-items-center ring-2 ring-black">
            <Plus className="h-3 w-3 text-accent-foreground" strokeWidth={3} />
          </span>
        </Link>

        <ActionButton
          icon={
            <Heart
              className={cn("h-8 w-8 transition-transform", r.liked ? "fill-accent text-accent scale-110" : "text-white")}
              strokeWidth={1.75}
            />
          }
          label={fmt(r.like_count)}
          onClick={() => onToggleLike(r)}
        />

        <ActionButton
          icon={<MessageCircle className="h-8 w-8 text-white" strokeWidth={1.75} />}
          label={fmt(r.comment_count)}
          onClick={() => onOpenComments(r.id)}
        />

        <ActionButton
          icon={<Bookmark className={cn("h-8 w-8", r.bookmarked ? "fill-yellow-400 text-yellow-400" : "text-white")} strokeWidth={1.75} />}
          label="Save"
          onClick={() => onToggleBookmark(r)}
        />

        <ActionButton
          icon={<Send className="h-8 w-8 text-white" strokeWidth={1.75} />}
          label="Share"
          onClick={() => onShare(r)}
        />

        {/* Spinning music disc */}
        <motion.div
          animate={{ rotate: isActive && !isPaused ? 360 : 0 }}
          transition={{ duration: 6, ease: "linear", repeat: Infinity }}
          className="mt-1 h-10 w-10 rounded-full bg-gradient-to-br from-neutral-800 to-black ring-2 ring-white/30 grid place-items-center overflow-hidden"
        >
          {r.profile?.avatar_url ? (
            <img src={r.profile.avatar_url} className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <Music2 className="h-4 w-4 text-white/80" />
          )}
        </motion.div>
      </div>

      {/* Bottom caption block */}
      <div
        className={cn(
          "absolute left-4 right-20 bottom-8 transition-opacity duration-500 z-20",
          chromeDim ? "opacity-50" : "opacity-100"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <Link to={r.profile ? `/u/${r.profile.username}` : "#"} className="font-semibold text-[15px] tracking-tight">
            @{r.profile?.username ?? "unknown"}
          </Link>
          {ad && <WhyThisAd explanation={ad.explanation} />}
        </div>
        {r.content && (
          <p
            onClick={() => setCaptionExpanded((v) => !v)}
            className={cn(
              "mt-1.5 text-[13.5px] leading-snug text-white/95",
              !captionExpanded && "line-clamp-2"
            )}
          >
            {r.content}
          </p>
        )}
        <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-white/85">
          <Music2 className="h-3.5 w-3.5" />
          <div className="overflow-hidden max-w-[80%] whitespace-nowrap">
            <motion.span
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="inline-block pr-8"
            >
              Original sound — @{r.profile?.username ?? "unknown"} · Original sound — @{r.profile?.username ?? "unknown"} ·
            </motion.span>
          </div>
        </div>
      </div>

      {/* Bottom progress scrubber */}
      <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-white/15 z-20">
        <div className="h-full bg-white transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
};

const ActionButton = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform">
    <div className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">{icon}</div>
    <span className="text-[11px] font-semibold drop-shadow">{label}</span>
  </button>
);

export default Reels;
