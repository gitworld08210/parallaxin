import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { fmt, gradientFor, initialsOf, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { ShareToDM } from "@/components/social/ShareToDM";

export type FeedPost = {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    verified: boolean;
    verification_kind?: string | null;
  } | null;
  liked: boolean;
};

const linkify = (text: string) =>
  text.split(/(\s+)/).map((tok, i) => {
    if (tok.startsWith("#") && tok.length > 1) {
      const tag = tok.slice(1).replace(/[^\w]/g, "");
      if (tag) return <Link key={i} to={`/tag/${tag}`} className="text-primary">{tok}</Link>;
    }
    if (tok.startsWith("@") && tok.length > 1) {
      const u = tok.slice(1).replace(/[^\w.]/g, "");
      if (u) return <Link key={i} to={`/u/${u}`} className="text-primary">{tok}</Link>;
    }
    return <span key={i}>{tok}</span>;
  });

export const PostCard = ({ post, onOpenComments }: { post: FeedPost; onOpenComments: (id: string) => void }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.like_count);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lastTap = useRef(0);

  useEffect(() => { setLiked(post.liked); setLikes(post.like_count); }, [post.liked, post.like_count]);

  useEffect(() => {
    if (!user) return;
    supabase.from("saves").select("post_id").eq("user_id", user.id).eq("post_id", post.id).maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user?.id, post.id]);

  const toggleLike = async () => {
    if (!user) return toast.error("Sign in to like");
    const next = !liked;
    setLiked(next); setLikes((c) => c + (next ? 1 : -1));
    if (next) {
      const { error } = await supabase.from("likes").insert({ user_id: user.id, post_id: post.id });
      if (error) { setLiked(false); setLikes((c) => c - 1); }
    } else {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", post.id);
    }
  };

  const toggleSave = async () => {
    if (!user) return toast.error("Sign in to save");
    const next = !saved;
    setSaved(next);
    if (next) {
      const { error } = await supabase.from("saves").insert({ user_id: user.id, post_id: post.id });
      if (error) setSaved(false); else toast.success("Saved");
    } else {
      await supabase.from("saves").delete().eq("user_id", user.id).eq("post_id", post.id);
    }
  };

  const onMediaTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) { if (!liked) toggleLike(); }
    lastTap.current = now;
  };

  const handle = post.profile?.username ?? "unknown";
  const name = post.profile?.display_name || handle;
  const caption = post.content || "";
  const longCaption = caption.length > 110;

  return (
    <article className="bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-3 py-2.5">
        <Link to={`/u/${handle}`} className="shrink-0">
          {post.profile?.avatar_url ? (
            <img src={post.profile.avatar_url} alt={name} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <AuraAvatar gradient={gradientFor(handle)} size="sm" initials={initialsOf(name)} />
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/u/${handle}`} className="inline-flex items-center gap-1">
            <p className="font-semibold text-sm truncate leading-tight">{handle}</p>
            {post.profile?.verification_kind
              ? <VerificationBadge kind={post.profile.verification_kind as any} />
              : post.profile?.verified && <VerificationBadge kind="verified" />}
          </Link>
        </div>
        <button className="text-foreground p-1" aria-label="More"><MoreHorizontal className="h-5 w-5" /></button>
      </header>

      {/* Media */}
      {post.media_url && (
        <div onClick={onMediaTap} className="relative w-full bg-muted">
          {post.media_type === "video" ? (
            <video src={post.media_url} controls playsInline className="w-full max-h-[560px] object-cover" />
          ) : (
            <img src={post.media_url} alt="" className="w-full max-h-[560px] object-cover" />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center px-2 pt-2 pb-1">
        <button onClick={toggleLike} aria-label="Like" className="p-2 active:scale-90 transition-transform">
          <Heart className={`h-7 w-7 ${liked ? "fill-destructive text-destructive" : "text-foreground"}`} strokeWidth={1.75} />
        </button>
        <button onClick={() => onOpenComments(post.id)} aria-label="Comment" className="p-2 active:scale-90 transition-transform">
          <MessageCircle className="h-7 w-7 text-foreground" strokeWidth={1.75} />
        </button>
        <button onClick={() => setShareOpen(true)} aria-label="Share" className="p-2 active:scale-90 transition-transform">
          <Send className="h-7 w-7 text-foreground" strokeWidth={1.75} />
        </button>
        <button onClick={toggleSave} aria-label="Save" className="ml-auto p-2 active:scale-90 transition-transform">
          <Bookmark className={`h-7 w-7 ${saved ? "fill-foreground text-foreground" : "text-foreground"}`} strokeWidth={1.75} />
        </button>
      </div>

      {/* Like count */}
      {likes > 0 && (
        <p className="px-3 text-sm font-semibold">{fmt(likes)} {likes === 1 ? "like" : "likes"}</p>
      )}

      {/* Caption */}
      {caption && (
        <p className="px-3 mt-1 text-sm leading-snug whitespace-pre-wrap break-words">
          <Link to={`/u/${handle}`} className="font-semibold mr-1.5">{handle}</Link>
          {expanded || !longCaption ? linkify(caption) : (
            <>
              {linkify(caption.slice(0, 110))}
              <span className="text-muted-foreground">… </span>
              <button onClick={() => setExpanded(true)} className="text-muted-foreground">more</button>
            </>
          )}
        </p>
      )}

      {/* Comments preview */}
      {post.comment_count > 0 && (
        <button onClick={() => onOpenComments(post.id)} className="px-3 mt-1 text-sm text-muted-foreground block">
          View all {fmt(post.comment_count)} comments
        </button>
      )}

      {/* Timestamp */}
      <p className="px-3 mt-1 pb-4 text-[11px] uppercase tracking-wider text-muted-foreground">
        {timeAgo(post.created_at)}
      </p>

      <ShareToDM postId={post.id} open={shareOpen} onOpenChange={setShareOpen} />
    </article>
  );
};
