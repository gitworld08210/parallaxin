import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthProvider";
import { fmt, gradientFor, initialsOf, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { ShareToDM } from "@/components/social/ShareToDM";
import { ReportSheet } from "@/components/social/ReportSheet";
import { DoubleTapHeart } from "@/components/social/DoubleTapHeart";
import { cn } from "@/lib/utils";

export type FeedPost = {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  has_certificate?: boolean | null;
  location?: string | null;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    verified: boolean;
    verification_kind?: string | null;
    is_founder?: boolean | null;
    join_era?: string | null;
  } | null;
  liked: boolean;
  collaborators?: { username: string; display_name: string; avatar_url: string | null }[];
};

const viewedThisSession = new Set<string>();

export const PostCard = ({ post, onOpenComments }: { post: FeedPost; onOpenComments: (id: string) => void }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.like_count);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);
  const articleRef = useRef<HTMLElement>(null);
  const isOwner = user?.id === post.user_id;

  useEffect(() => { setLiked(post.liked); setLikes(post.like_count); }, [post.liked, post.like_count]);

  // Check saved state
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "saves", `${user.id}_${post.id}`));
        setSaved(snap.exists());
      } catch {}
    })();
  }, [user?.id, post.id]);

  // View tracking
  useEffect(() => {
    if (!user || !articleRef.current || viewedThisSession.has(post.id)) return;
    const el = articleRef.current;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= 0.6 && !viewedThisSession.has(post.id)) {
          viewedThisSession.add(post.id);
          try { updateDoc(doc(db, "posts", post.id), { view_count: increment(1) }); } catch {}
          obs.disconnect();
        }
      }
    }, { threshold: [0.6] });
    obs.observe(el);
    return () => obs.disconnect();
  }, [user?.id, post.id]);

  const toggleLike = async () => {
    if (!user) return toast.error("Sign in to like");
    const next = !liked;
    setLiked(next);
    setLikes((c) => c + (next ? 1 : -1));
    try {
      const likeId = `${user.id}_${post.id}`;
      const likeRef = doc(db, "likes", likeId);
      const postRef = doc(db, "posts", post.id);
      if (next) {
        await setDoc(likeRef, { user_id: user.id, post_id: post.id, created_at: serverTimestamp() });
        await updateDoc(postRef, { like_count: increment(1) });
      } else {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { like_count: increment(-1) });
      }
    } catch {
      setLiked(!next);
      setLikes((c) => c + (next ? -1 : 1));
      toast.error("Could not update like");
    }
  };

  const toggleSave = async () => {
    if (!user) return toast.error("Sign in to save");
    const next = !saved;
    setSaved(next);
    try {
      const saveRef = doc(db, "saves", `${user.id}_${post.id}`);
      if (next) {
        await setDoc(saveRef, { user_id: user.id, post_id: post.id, created_at: serverTimestamp() });
      } else {
        await deleteDoc(saveRef);
      }
    } catch {
      setSaved(!next);
      toast.error("Could not update save");
    }
  };

  const onMediaTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) toggleLike();
      setBurst((n) => n + 1);
    }
    lastTap.current = now;
  };

  const remove = async () => {
    if (!confirm("Delete this post?")) return;
    try {
      await deleteDoc(doc(db, "posts", post.id));
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handle = post.profile?.username ?? "unknown";
  const caption = post.content || "";

  return (
    <article ref={articleRef} className="bg-black border-b border-white/[0.04]">
      {/* ─── Post header: avatar · username · location · ... menu ─── */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Link to={`/u/${handle}`} className="shrink-0">
          {post.profile?.avatar_url ? (
            <img src={post.profile.avatar_url} alt={handle} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white" style={{ backgroundImage: gradientFor(handle) }}>
              {initialsOf(post.profile?.display_name || handle)}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link to={`/u/${handle}`} className="text-[13px] font-semibold text-white truncate hover:underline">
              {handle}
            </Link>
            {post.profile?.verified && (
              <svg viewBox="0 0 18 18" className="h-3.5 w-3.5 shrink-0" fill="#3897f0">
                <path d="M17.1 7.9c-.2-.3-.4-.6-.5-1-.1-.4-.1-.8-.1-1.2 0-.7-.3-1.3-.8-1.7-.5-.4-1.1-.6-1.8-.6-.4 0-.8 0-1.2-.2-.4-.1-.7-.3-1-.5C11.3 2.3 10.7 2 10 2h-.1c-.7 0-1.3.3-1.7.7-.3.2-.6.4-1 .5-.4.2-.8.2-1.2.2-.7 0-1.3.2-1.8.6-.5.4-.8 1-.8 1.7 0 .4 0 .8-.1 1.2-.1.4-.3.7-.5 1-.4.4-.7 1-.7 1.7v.1c0 .7.3 1.3.7 1.7.2.3.4.6.5 1 .1.4.1.8.1 1.2 0 .7.3 1.3.8 1.7.5.4 1.1.6 1.8.6.4 0 .8 0 1.2.2.4.1.7.3 1 .5.4.4 1 .7 1.7.7h.1c.7 0 1.3-.3 1.7-.7.3-.2.6-.4 1-.5.4-.2.8-.2 1.2-.2.7 0 1.3-.2 1.8-.6.5-.4.8-1 .8-1.7 0-.4 0-.8.1-1.2.1-.4.3-.7.5-1 .4-.4.7-1 .7-1.7v-.1c0-.7-.3-1.3-.7-1.7zM7.9 12.4L5.2 9.7l1.1-1.1 1.6 1.6 3.7-3.7 1.1 1.1-4.8 4.8z" />
              </svg>
            )}
          </div>
          {(post as any).location && (
            <p className="text-[11px] text-zinc-400 truncate">{(post as any).location}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 -mr-2 text-white" aria-label="More options">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {!isOwner && <DropdownMenuItem onSelect={() => setReportOpen(true)} className="text-destructive">Report</DropdownMenuItem>}
            {isOwner && <DropdownMenuItem onSelect={remove} className="text-destructive">Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ─── Full-width media ─── */}
      {post.media_url && (
        <div onClick={onMediaTap} className="relative w-full bg-zinc-900 select-none">
          {post.media_type === "video" ? (
            <video src={post.media_url} controls playsInline className="w-full aspect-square object-cover" />
          ) : (
            <img src={post.media_url} alt="" className="w-full aspect-square object-cover" draggable={false} />
          )}
          <DoubleTapHeart trigger={burst} />
        </div>
      )}

      {/* ─── Action icons row ─── */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} aria-label={liked ? "Unlike" : "Like"} className="active:scale-90 transition-transform">
            <Heart className={cn("h-6 w-6", liked ? "fill-rose-500 text-rose-500" : "text-white")} strokeWidth={1.8} />
          </button>
          <button onClick={() => onOpenComments(post.id)} aria-label="Comment" className="active:scale-90 transition-transform">
            <MessageCircle className="h-6 w-6 text-white" strokeWidth={1.8} />
          </button>
          <button onClick={() => setShareOpen(true)} aria-label="Share" className="active:scale-90 transition-transform">
            <Send className="h-6 w-6 text-white -rotate-45" strokeWidth={1.8} />
          </button>
        </div>
        <button onClick={toggleSave} aria-label={saved ? "Unsave" : "Save"} className="active:scale-90 transition-transform">
          <Bookmark className={cn("h-6 w-6", saved ? "fill-white text-white" : "text-white")} strokeWidth={1.8} />
        </button>
      </div>

      {/* ─── Like count ─── */}
      {likes > 0 && (
        <p className="px-3 text-[13px] font-semibold text-white">
          {fmt(likes).toLocaleString()} {likes === 1 ? "like" : "likes"}
        </p>
      )}

      {/* ─── Caption ─── */}
      {caption && (
        <p className="px-3 pt-0.5 pb-1 text-[13px] text-white leading-[1.4]">
          <Link to={`/u/${handle}`} className="font-semibold mr-1.5 hover:underline">{handle}</Link>
          <span className="text-zinc-200">{caption}</span>
        </p>
      )}

      {/* ─── View comments link ─── */}
      {post.comment_count > 0 && (
        <button onClick={() => onOpenComments(post.id)} className="px-3 pb-1 text-[13px] text-zinc-500">
          View all {post.comment_count} comments
        </button>
      )}

      {/* ─── Timestamp ─── */}
      <p className="px-3 pb-3 text-[10px] text-zinc-500 uppercase tracking-wide">
        {timeAgo(post.created_at)}
      </p>

      <ShareToDM postId={post.id} open={shareOpen} onOpenChange={setShareOpen} />
      <ReportSheet open={reportOpen} onOpenChange={setReportOpen} targetKind="post" targetId={post.id} />
    </article>
  );
};
