import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Send, Plus, Volume2, VolumeX, Pause, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
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
};

const Reels = () => {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [muted, setMuted] = useState(true);
  const [commentPost, setCommentPost] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pausedIds, setPausedIds] = useState<Set<string>>(new Set());
  const [chromeDim, setChromeDim] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimTimer = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, user_id, content, media_url, like_count, comment_count, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url)")
        .eq("is_reel", true)
        .not("media_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      let liked = new Set<string>();
      if (user && data?.length) {
        const { data: l } = await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", data.map((d: any) => d.id));
        liked = new Set((l ?? []).map((x) => x.post_id));
      }
      setReels((data ?? []).map((d: any) => ({ ...d, liked: liked.has(d.id) })));
    })();
  }, [user?.id]);

  // Play the most-visible video; pause others.
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

  // Auto-dim chrome after 2.2s of inactivity
  const bumpChrome = () => {
    setChromeDim(false);
    if (dimTimer.current) window.clearTimeout(dimTimer.current);
    dimTimer.current = window.setTimeout(() => setChromeDim(true), 2200);
  };
  useEffect(() => {
    bumpChrome();
    return () => { if (dimTimer.current) window.clearTimeout(dimTimer.current); };
  }, [activeId]);

  const toggleLike = async (r: Reel) => {
    if (!user) return toast.error("Sign in to like");
    const next = !r.liked;
    setReels((arr) => arr.map((x) => x.id === r.id ? { ...x, liked: next, like_count: x.like_count + (next ? 1 : -1) } : x));
    if (next) await supabase.from("likes").insert({ user_id: user.id, post_id: r.id });
    else await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", r.id);
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
    <div className="bg-black text-white relative" onMouseMove={bumpChrome} onTouchStart={bumpChrome}>
      {/* Reels title */}
      <header className={cn(
        "absolute top-0 inset-x-0 z-30 h-14 px-5 flex items-center justify-between transition-opacity duration-500",
        chromeDim ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <h1 className="text-xl font-bold tracking-tight">Reels</h1>
        <Link to="/compose/reel" className="p-2" aria-label="Create reel">
          <Camera className="h-5 w-5" strokeWidth={1.75} />
        </Link>
      </header>
      <div ref={containerRef} className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory">

        {reels.length === 0 && (
          <div className="h-[100dvh] grid place-items-center text-center px-8">
            <div>
              <p className="font-display text-3xl mb-2">No reels yet</p>
              <p className="text-sm text-white/60 mb-6">Be the first to drop one.</p>
              <Link to="/compose/reel" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                <Plus className="h-4 w-4" /> Create reel
              </Link>
            </div>
          </div>
        )}
        {reels.map((r) => {
          const isPaused = pausedIds.has(r.id);
          return (
            <ReelItem
              key={r.id}
              r={r}
              muted={muted}
              chromeDim={chromeDim}
              isPaused={isPaused}
              onTogglePause={togglePause}
              onToggleMute={() => { setMuted((m) => !m); bumpChrome(); }}
              onToggleLike={toggleLike}
              onOpenComments={(id) => setCommentPost(id)}
              onShare={share}
            />
          );
        })}
      </div>

      <CommentSheet postId={commentPost} open={!!commentPost} onOpenChange={(b) => !b && setCommentPost(null)} />
    </div>
  );
};

const ReelItem = ({
  r, muted, chromeDim, isPaused, onTogglePause, onToggleMute, onToggleLike, onOpenComments, onShare,
}: {
  r: Reel;
  muted: boolean;
  chromeDim: boolean;
  isPaused: boolean;
  onTogglePause: (r: Reel, el: HTMLVideoElement | null) => void;
  onToggleMute: () => void;
  onToggleLike: (r: Reel) => void;
  onOpenComments: (id: string) => void;
  onShare: (r: Reel) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTap = useRef(0);

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      // double-tap → like
      if (!r.liked) onToggleLike(r);
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

  return (
    <section className="relative h-[100dvh] snap-start grid place-items-center">
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

      {/* Pause indicator overlay */}
      {isPaused && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="h-20 w-20 rounded-full bg-white/15 backdrop-blur-xl grid place-items-center animate-in fade-in zoom-in duration-200">
            <Pause className="h-8 w-8 fill-white" />
          </div>
        </div>
      )}

      {/* Mute toggle (top) */}
      <button
        onClick={onToggleMute}
        className={cn(
          "absolute top-5 right-5 h-10 w-10 rounded-full bg-white/10 backdrop-blur-xl grid place-items-center transition-opacity duration-500",
          chromeDim ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* Right action rail */}
      <div
        className={cn(
          "absolute right-3 bottom-32 flex flex-col items-center gap-5 transition-opacity duration-500",
          chromeDim ? "opacity-30" : "opacity-100"
        )}
      >
        <Link to={r.profile ? `/u/${r.profile.username}` : "#"}>
          {r.profile?.avatar_url ? (
            <img src={r.profile.avatar_url} className="h-11 w-11 rounded-full object-cover ring-2 ring-white" />
          ) : (
            <div className="h-11 w-11 rounded-full bg-primary ring-2 ring-white" />
          )}
        </Link>
        <button onClick={() => onToggleLike(r)} className="flex flex-col items-center gap-1">
          <Heart className={cn("h-7 w-7 transition-transform", r.liked ? "fill-accent text-accent scale-110" : "")} strokeWidth={2.25} />
          <span className="text-xs font-semibold">{fmt(r.like_count)}</span>
        </button>
        <button onClick={() => onOpenComments(r.id)} className="flex flex-col items-center gap-1">
          <MessageCircle className="h-7 w-7" strokeWidth={2.25} />
          <span className="text-xs font-semibold">{fmt(r.comment_count)}</span>
        </button>
        <button onClick={() => onShare(r)} className="flex flex-col items-center gap-1">
          <Send className="h-7 w-7" strokeWidth={2.25} />
        </button>
      </div>

      {/* Bottom caption */}
      <div
        className={cn(
          "absolute left-4 right-20 bottom-6 transition-opacity duration-500",
          chromeDim ? "opacity-50" : "opacity-100"
        )}
      >
        <Link to={r.profile ? `/u/${r.profile.username}` : "#"} className="font-semibold text-sm">
          @{r.profile?.username ?? "unknown"}
        </Link>
        {r.content && <p className="mt-1 text-sm leading-snug line-clamp-3">{r.content}</p>}
      </div>
    </section>
  );
};

export default Reels;
