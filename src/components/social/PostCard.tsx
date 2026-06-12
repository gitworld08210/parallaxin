import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, BarChart3, FolderPlus, Trash2, Flag, Sparkles, ShieldCheck } from "lucide-react";
import { TipSheet } from "@/components/social/TipSheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { fmt, gradientFor, initialsOf, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { ShareToDM } from "@/components/social/ShareToDM";
import { SaveToCollectionSheet } from "@/components/social/SaveToCollectionSheet";
import { ReportSheet } from "@/components/social/ReportSheet";
import { FounderBadge } from "@/components/founders/FounderBadge";
import { GenesisMark } from "@/components/founders/GenesisMark";
import { DoubleTapHeart } from "@/components/social/DoubleTapHeart";

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

// Session-scoped view dedupe
const viewedThisSession = new Set<string>();

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
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [burst, setBurst] = useState(0);
  const [collabs, setCollabs] = useState<NonNullable<FeedPost["collaborators"]>>(post.collaborators ?? []);
  const lastTap = useRef(0);
  const articleRef = useRef<HTMLElement>(null);
  const isOwner = user?.id === post.user_id;
  const isFounder = !!post.profile?.is_founder;
  const tier: "genesis" | "founder" = post.profile?.join_era === "genesis" ? "genesis" : "founder";

  useEffect(() => { setLiked(post.liked); setLikes(post.like_count); }, [post.liked, post.like_count]);

  useEffect(() => {
    if (!user) return;
    supabase.from("saves").select("post_id").eq("user_id", user.id).eq("post_id", post.id).maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user?.id, post.id]);

  useEffect(() => {
    if (post.collaborators) return;
    (async () => {
      const { data } = await supabase
        .from("post_collaborators" as any)
        .select("user_id")
        .eq("post_id", post.id).eq("status", "accepted");
      const ids = (data ?? []).map((r: any) => r.user_id);
      if (!ids.length) { setCollabs([]); return; }
      const { data: profs } = await supabase.from("profiles")
        .select("username, display_name, avatar_url").in("user_id", ids);
      setCollabs((profs ?? []) as any);
    })();
  }, [post.id]);



  // View tracker — fires once per session when card crosses 60% visible
  useEffect(() => {
    if (!user || !articleRef.current || viewedThisSession.has(post.id)) return;
    const el = articleRef.current;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= 0.6 && !viewedThisSession.has(post.id)) {
          viewedThisSession.add(post.id);
          (supabase.from("post_views" as any).insert({ post_id: post.id, viewer_id: user.id } as any) as any).then(() => {});
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
    if (now - lastTap.current < 300) {
      if (!liked) toggleLike();
      setBurst((n) => n + 1);
    }
    lastTap.current = now;
  };

  const remove = async () => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) toast.error(error.message); else toast.success("Deleted");
  };

  const handle = post.profile?.username ?? "unknown";
  const name = post.profile?.display_name || handle;
  const caption = post.content || "";
  const longCaption = caption.length > 110;

  return (
    <article ref={articleRef} className="bg-background">
      <header className="flex items-center gap-3 px-3 py-2.5">
        <Link to={`/u/${handle}`} className="shrink-0 flex -space-x-2">
          {post.profile?.avatar_url ? (
            <img src={post.profile.avatar_url} alt={name} className="h-8 w-8 rounded-full object-cover ring-2 ring-background" />
          ) : (
            <AuraAvatar gradient={gradientFor(handle)} size="sm" initials={initialsOf(name)} />
          )}
          {collabs.slice(0, 2).map((c) =>
            c.avatar_url ? (
              <img key={c.username} src={c.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-background" />
            ) : (
              <AuraAvatar key={c.username} gradient={gradientFor(c.username)} size="sm" initials={initialsOf(c.display_name || c.username)} />
            )
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/u/${handle}`} className="inline-flex items-center gap-1">
            <p className="font-semibold text-sm truncate leading-tight">{handle}</p>
            {isFounder && <FounderBadge tier={tier} size={12} />}
            {post.profile?.verification_kind
              ? <VerificationBadge kind={post.profile.verification_kind as any} />
              : post.profile?.verified && <VerificationBadge kind="verified" />}
            {post.has_certificate && (
              <Link to={`/certificate/${post.id}`} aria-label="Ownership certificate" className="inline-flex">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              </Link>
            )}
          </Link>
          {collabs.length > 0 && (
            <p className="text-[11px] text-muted-foreground truncate leading-tight">
              with {collabs.slice(0, 2).map((c, i) => (
                <span key={c.username}>
                  {i > 0 && " & "}
                  <Link to={`/u/${c.username}`} className="text-foreground/80 font-medium">@{c.username}</Link>
                </span>
              ))}
              {collabs.length > 2 && ` +${collabs.length - 2}`}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-foreground p-1" aria-label="More"><MoreHorizontal className="h-5 w-5" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => setCollectionOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-2" /> Save to collection
            </DropdownMenuItem>
            {post.has_certificate && (
              <DropdownMenuItem asChild>
                <Link to={`/certificate/${post.id}`}>
                  <ShieldCheck className="h-4 w-4 mr-2" /> View certificate
                </Link>
              </DropdownMenuItem>
            )}
            {isOwner && !post.has_certificate && post.media_url && (
              <DropdownMenuItem onSelect={async () => {
                toast.loading("Generating certificate…", { id: "cert" });
                const { data, error } = await supabase.functions.invoke("ownership-certify", { body: { post_id: post.id } });
                if (error) toast.error(error.message, { id: "cert" });
                else { toast.success("Certificate created", { id: "cert" }); window.location.href = `/certificate/${post.id}`; }
              }}>
                <ShieldCheck className="h-4 w-4 mr-2" /> Generate certificate
              </DropdownMenuItem>
            )}
            {isOwner && (
              <DropdownMenuItem asChild>
                <Link to={`/p/${post.id}/insights`}>
                  <BarChart3 className="h-4 w-4 mr-2" /> View insights
                </Link>
              </DropdownMenuItem>
            )}
            {!isOwner && (
              <DropdownMenuItem onSelect={() => setReportOpen(true)} className="text-destructive focus:text-destructive">
                <Flag className="h-4 w-4 mr-2" /> Report
              </DropdownMenuItem>
            )}
            {isOwner && (
              <DropdownMenuItem onSelect={remove} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {post.media_url && (
        <div onClick={onMediaTap} className="relative w-full bg-muted select-none">
          {post.media_type === "video" ? (
            <video src={post.media_url} controls playsInline className="w-full max-h-[560px] object-cover" />
          ) : (
            <img src={post.media_url} alt="" className="w-full max-h-[560px] object-cover" draggable={false} />
          )}
          <DoubleTapHeart trigger={burst} />
        </div>
      )}

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
        {!isOwner && (
          <button onClick={() => setTipOpen(true)} aria-label="Send Aura" className="p-2 active:scale-90 transition-transform">
            <Sparkles className="h-7 w-7 text-primary" strokeWidth={1.75} />
          </button>
        )}
        <button onClick={toggleSave} aria-label="Save" className="ml-auto p-2 active:scale-90 transition-transform">
          <Bookmark className={`h-7 w-7 ${saved ? "fill-foreground text-foreground" : "text-foreground"}`} strokeWidth={1.75} />
        </button>
      </div>

      {likes > 0 && (
        <p className="px-3 text-sm font-semibold">{fmt(likes)} {likes === 1 ? "like" : "likes"}</p>
      )}

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

      {post.comment_count > 0 && (
        <button onClick={() => onOpenComments(post.id)} className="px-3 mt-1 text-sm text-muted-foreground block">
          View all {fmt(post.comment_count)} comments
        </button>
      )}

      <div className="flex items-center justify-between px-3 mt-1 pb-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {timeAgo(post.created_at)}
        </p>
        {isFounder && <GenesisMark />}
      </div>

      <ShareToDM postId={post.id} open={shareOpen} onOpenChange={setShareOpen} />
      <SaveToCollectionSheet postId={post.id} open={collectionOpen} onOpenChange={setCollectionOpen} />
      <ReportSheet open={reportOpen} onOpenChange={setReportOpen} targetKind="post" targetId={post.id} />
      <TipSheet
        open={tipOpen}
        onOpenChange={setTipOpen}
        recipientId={post.user_id}
        recipientName={handle}
        postId={post.id}
      />
    </article>
  );
};
