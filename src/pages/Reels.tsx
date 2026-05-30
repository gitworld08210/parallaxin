import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Send, Plus, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { CommentSheet } from "@/components/social/CommentSheet";
import { fmt } from "@/lib/format";
import { toast } from "sonner";

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
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!containerRef.current) return;
    const videos = Array.from(containerRef.current.querySelectorAll("video"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        if (e.intersectionRatio > 0.7) { v.play().catch(() => {}); } else { v.pause(); }
      });
    }, { threshold: [0, 0.7, 1] });
    videos.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [reels.length]);

  const toggleLike = async (r: Reel) => {
    if (!user) return toast.error("Sign in to like");
    const next = !r.liked;
    setReels((arr) => arr.map((x) => x.id === r.id ? { ...x, liked: next, like_count: x.like_count + (next ? 1 : -1) } : x));
    if (next) await supabase.from("likes").insert({ user_id: user.id, post_id: r.id });
    else await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", r.id);
  };

  const share = async (r: Reel) => {
    const url = `${window.location.origin}/p/${r.id}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch {}
  };

  return (
    <div className="bg-black text-white -mt-0">
      <div ref={containerRef} className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory">
        {reels.length === 0 && (
          <div className="h-[100dvh] grid place-items-center text-center px-8">
            <div>
              <p className="font-display text-3xl mb-2">No reels yet</p>
              <p className="text-sm text-white/60 mb-6">Be the first to drop one.</p>
              <Link to="/compose/reel" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow">
                <Plus className="h-4 w-4" /> Create reel
              </Link>
            </div>
          </div>
        )}
        {reels.map((r) => (
          <section key={r.id} className="relative h-[100dvh] snap-start grid place-items-center">
            <video
              src={r.media_url}
              loop
              playsInline
              muted={muted}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            <button
              onClick={() => setMuted((m) => !m)}
              className="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/10 backdrop-blur-xl grid place-items-center"
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>

            <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
              <Link to={r.profile ? `/u/${r.profile.username}` : "#"}>
                {r.profile?.avatar_url ? (
                  <img src={r.profile.avatar_url} className="h-11 w-11 rounded-full object-cover ring-2 ring-white" />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-gradient-primary ring-2 ring-white" />
                )}
              </Link>
              <button onClick={() => toggleLike(r)} className="flex flex-col items-center gap-1">
                <Heart className={`h-7 w-7 ${r.liked ? "fill-accent text-accent" : ""}`} strokeWidth={2.25} />
                <span className="text-xs font-semibold">{fmt(r.like_count)}</span>
              </button>
              <button onClick={() => setCommentPost(r.id)} className="flex flex-col items-center gap-1">
                <MessageCircle className="h-7 w-7" strokeWidth={2.25} />
                <span className="text-xs font-semibold">{fmt(r.comment_count)}</span>
              </button>
              <button onClick={() => share(r)} className="flex flex-col items-center gap-1">
                <Send className="h-7 w-7" strokeWidth={2.25} />
              </button>
            </div>

            <div className="absolute left-4 right-20 bottom-32">
              <Link to={r.profile ? `/u/${r.profile.username}` : "#"} className="font-semibold text-sm">
                @{r.profile?.username ?? "unknown"}
              </Link>
              {r.content && <p className="mt-1 text-sm leading-snug line-clamp-3">{r.content}</p>}
            </div>
          </section>
        ))}
      </div>

      <Link
        to="/compose/reel"
        className="fixed bottom-24 right-5 z-40 h-14 w-14 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center shadow-glow"
        aria-label="New reel"
      >
        <Plus className="h-6 w-6" />
      </Link>

      <CommentSheet postId={commentPost} open={!!commentPost} onOpenChange={(b) => !b && setCommentPost(null)} />
    </div>
  );
};

export default Reels;
