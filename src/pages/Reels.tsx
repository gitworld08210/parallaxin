import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Send, Plus, Volume2, VolumeX, Pause, Search, Music2, Bookmark, Home, Compass, User, Mail } from "lucide-react";
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
        limit(10)
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
    <div className="bg-black text-white relative h-[100dvh] w-full overflow-hidden" onMouseMove={bumpChrome} onTouchStart={bumpChrome}>
      {/* TikTok-style top tabs: Following | For You */}
      <header
        className={cn(
          "absolute top-0 inset-x-0 z-30 pt-[env(safe-area-inset-top,12px)] pb-4 flex items-center justify-center transition-opacity duration-500",
          "bg-gradient-to-b from-black/70 to-transparent",
          chromeDim ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <div className="flex items-center gap-6">
          {(["following", "foryou"] as FeedTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative py-2 text-[16px] font-bold transition-colors",
                tab === t ? "text-white" : "text-white/50"
              )}
            >
              {t === "following" ? "Following" : "For You"}
              {tab === t && (
                <motion.span
                  layoutId="reels-tab-pill"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-[3px] w-7 bg-white rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Scrollable video container */}
      <div ref={containerRef} className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {reels.length === 0 && (
          <div className="h-full grid place-items-center text-center px-8">
            <div>
              <p className="font-serif italic text-3xl mb-2">No reels yet</p>
              <p className="text-sm text-white/60 mb-6">Be the first to drop one.</p>
              <Link to="/compose/reel" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black font-semibold text-sm">
                <Plus className="h-4 w-4" /> Create reel
              </Link>
            </div>
          </div>
        )}
        {reels.map((r) => (
          <div key={r.id} className="snap-start h-[100dvh] w-full">
            <ReelItem
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

      {/* Bottom Navigation Bar - TikTok style */}
      <nav
        className={cn(
          "absolute bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom,8px)] pt-2 px-2",
          "bg-gradient-to-t from-black/90 via-black/60 to-transparent",
          "flex items-center justify-around",
          "transition-opacity duration-500",
          chromeDim ? "opacity-30" : "opacity-100"
        )}
      >
        <Link to="/" className="flex flex-col items-center gap-0.5 py-1">
          <Home className="h-6 w-6 text-white/70" strokeWidth={1.75} />
          <span className="text-[10px] text-white/70">Home</span>
        </Link>
        <Link to="/discover" className="flex flex-col items-center gap-0.5 py-1">
          <Compass className="h-6 w-6 text-white/70" strokeWidth={1.75} />
          <span className="text-[10px] text-white/70">Discover</span>
        </Link>
        <Link to="/compose/reel" className="flex items-center justify-center">
          <div className="h-10 w-12 rounded-lg bg-white flex items-center justify-center">
            <Plus className="h-6 w-6 text-black" strokeWidth={2.5} />
          </div>
        </Link>
        <Link to="/messages" className="flex flex-col items-center gap-0.5 py-1">
          <Mail className="h-6 w-6 text-white/70" strokeWidth={1.75} />
          <span className="text-[10px] text-white/70">Inbox</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center gap-0.5 py-1">
          <User className="h-6 w-6 text-white" strokeWidth={1.75} />
          <span className="text-[10px] text-white">Me</span>
        </Link>
      </nav>

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

  const onTap = () => {
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
    <section className="relative h-full w-full grid place-items-center shrink-0">
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

      {/* Gradient overlays for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

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
            <Heart className="h-28 w-28 fill-white text-white drop-shadow-2xl" strokeWidth={0} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none z-10">
          <div className="h-20 w-20 rounded-full bg-white/15 backdrop-blur-xl grid place-items-center animate-in fade-in zoom-in duration-200">
            <Pause className="h-8 w-8 fill-white" />
          </div>
        </div>
      )}

      {/* Mute toggle - top right */}
      <button
        onClick={onToggleMute}
        className={cn(
          "absolute top-14 right-4 h-8 w-8 rounded-full bg-black/30 backdrop-blur-md grid place-items-center transition-opacity duration-500 z-20",
          chromeDim ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* Right side action column - TikTok style */}
      <div
        className={cn(
          "absolute right-3 bottom-32 flex flex-col items-center gap-5 transition-opacity duration-500 z-20",
          chromeDim ? "opacity-30" : "opacity-100"
        )}
      >
        {/* Avatar + follow badge */}
        <Link to={r.profile ? `/u/${r.profile.username}` : "#"} className="relative mb-2">
          {r.profile?.avatar_url ? (
            <img src={r.profile.avatar_url} className="h-12 w-12 rounded-full object-cover ring-2 ring-white" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-zinc-700 ring-2 ring-white grid place-items-center font-bold text-sm">
              {r.profile?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-rose-500 grid place-items-center ring-2 ring-black">
            <Plus className="h-3 w-3 text-white" strokeWidth={3} />
          </span>
        </Link>

        {/* Heart */}
        <ActionButton
          icon={
            <Heart
              className={cn("h-7 w-7 transition-transform", r.liked ? "fill-rose-500 text-rose-500 scale-110" : "text-white")}
              strokeWidth={1.75}
            />
          }
          label={fmt(r.like_count)}
          onClick={() => onToggleLike(r)}
        />

        {/* Comment */}
        <ActionButton
          icon={<MessageCircle className="h-7 w-7 text-white" strokeWidth={1.75} />}
          label={fmt(r.comment_count)}
          onClick={() => onOpenComments(r.id)}
        />

        {/* Share */}
        <ActionButton
          icon={<Send className="h-7 w-7 text-white" strokeWidth={1.75} />}
          label="Share"
          onClick={() => onShare(r)}
        />

        {/* Bookmark */}
        <ActionButton
          icon={<Bookmark className={cn("h-7 w-7", r.bookmarked ? "fill-yellow-400 text-yellow-400" : "text-white")} strokeWidth={1.75} />}
          label="Save"
          onClick={() => onToggleBookmark(r)}
        />

        {/* Spinning album art disc */}
        <motion.div
          animate={{ rotate: isActive && !isPaused ? 360 : 0 }}
          transition={{ duration: 6, ease: "linear", repeat: Infinity }}
          className="mt-2 h-11 w-11 rounded-full bg-gradient-to-br from-zinc-800 to-black ring-[3px] ring-zinc-600 grid place-items-center overflow-hidden"
        >
          {r.profile?.avatar_url ? (
            <img src={r.profile.avatar_url} className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <Music2 className="h-4 w-4 text-white/80" />
          )}
        </motion.div>
      </div>

      {/* Bottom left - Username, caption, music */}
      <div
        className={cn(
          "absolute left-4 right-24 bottom-20 transition-opacity duration-500 z-20",
          chromeDim ? "opacity-50" : "opacity-100"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <Link to={r.profile ? `/u/${r.profile.username}` : "#"} className="font-bold text-[15px] tracking-tight">
            @{r.profile?.username ?? "unknown"}
          </Link>
          {ad && <WhyThisAd explanation={ad.explanation} />}
        </div>
        {r.content && (
          <p
            onClick={() => setCaptionExpanded((v) => !v)}
            className={cn(
              "text-[13px] leading-snug text-white/90",
              !captionExpanded && "line-clamp-2"
            )}
          >
            {r.content}
          </p>
        )}
        {/* Music marquee */}
        <div className="mt-3 flex items-center gap-2 text-[12px] text-white/80">
          <Music2 className="h-3.5 w-3.5 shrink-0" />
          <div className="overflow-hidden max-w-[75%] whitespace-nowrap">
            <motion.span
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="inline-block pr-8"
            >
              Original sound - @{r.profile?.username ?? "unknown"} &nbsp;&nbsp; Original sound - @{r.profile?.username ?? "unknown"} &nbsp;&nbsp;
            </motion.span>
          </div>
        </div>
      </div>

      {/* Bottom progress bar */}
      <div className="absolute left-0 right-0 bottom-[68px] h-[2px] bg-white/20 z-20">
        <div className="h-full bg-white transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
};

const ActionButton = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
    <div className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{icon}</div>
    <span className="text-[11px] font-semibold text-white drop-shadow">{label}</span>
  </button>
);

export default Reels;
