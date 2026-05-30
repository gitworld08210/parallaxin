import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { fmt, gradientFor, initialsOf, timeAgo } from "@/lib/format";
import { toast } from "sonner";

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
  } | null;
  liked: boolean;
};

export const PostCard = ({ post, onOpenComments }: { post: FeedPost; onOpenComments: (id: string) => void }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.like_count);

  useEffect(() => { setLiked(post.liked); setLikes(post.like_count); }, [post.liked, post.like_count]);

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

  const share = async () => {
    const url = `${window.location.origin}/u/${post.profile?.username}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Couldn't copy"); }
  };

  const handle = post.profile?.username ?? "unknown";
  const name = post.profile?.display_name || handle;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard className="p-0 overflow-hidden">
        <header className="flex items-center gap-3 p-4">
          <Link to={`/u/${handle}`}>
            {post.profile?.avatar_url ? (
              <img src={post.profile.avatar_url} alt={name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <AuraAvatar gradient={gradientFor(handle)} size="sm" initials={initialsOf(name)} />
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/u/${handle}`} className="flex items-center gap-1.5">
              <p className="font-semibold truncate text-sm">{name}</p>
              {post.profile?.verified && <VerificationBadge kind="verified" />}
            </Link>
            <p className="text-xs text-muted-foreground">@{handle} · {timeAgo(post.created_at)}</p>
          </div>
          <button className="text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
        </header>

        {post.content && (
          <p className="px-4 pb-3 text-sm leading-snug whitespace-pre-wrap">{post.content}</p>
        )}

        {post.media_url && (
          <div className="relative w-full bg-muted/30">
            {post.media_type === "video" ? (
              <video src={post.media_url} controls className="w-full max-h-[520px] object-cover" />
            ) : (
              <img src={post.media_url} alt="" className="w-full max-h-[560px] object-cover" />
            )}
          </div>
        )}

        <footer className="flex items-center gap-1 px-2 py-2">
          <ActionBtn active={liked} onClick={toggleLike} icon={Heart} label={fmt(likes)} accent={liked} />
          <ActionBtn onClick={() => onOpenComments(post.id)} icon={MessageCircle} label={fmt(post.comment_count)} />
          <ActionBtn onClick={share} icon={Send} label="Share" />
          <div className="ml-auto">
            <button className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted/40"><Bookmark className="h-4 w-4" /></button>
          </div>
        </footer>
      </GlassCard>
    </motion.article>
  );
};

const ActionBtn = ({ icon: Icon, label, onClick, active, accent }: any) => (
  <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-muted/40">
    <Icon className={`h-4 w-4 ${accent ? "fill-current text-accent" : ""}`} strokeWidth={2.25} />
    <span className="text-xs font-semibold">{label}</span>
  </button>
);
