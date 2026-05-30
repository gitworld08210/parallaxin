import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Search, Sparkles, Users, ChevronDown } from "lucide-react";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { StoriesRail } from "@/components/social/StoriesRail";
import { SuggestedUsersRail } from "@/components/social/SuggestedUsersRail";
import { FeedSkeleton } from "@/components/social/FeedSkeleton";
import { EmptyState } from "@/components/empty/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { cn } from "@/lib/utils";

const Feed = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentPost, setCommentPost] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const blocksOut = user ? (supabase.from("blocks" as any).select("blocked_id").eq("blocker_id", user.id) as any) : Promise.resolve({ data: [] });
    const blocksIn = user ? (supabase.from("blocks" as any).select("blocker_id").eq("blocked_id", user.id) as any) : Promise.resolve({ data: [] });
    const mutesP = user ? (supabase.from("mutes" as any).select("muted_id").eq("muter_id", user.id) as any) : Promise.resolve({ data: [] });
    const followsP = (tab === "following" && user)
      ? supabase.from("follows").select("following_id").eq("follower_id", user.id)
      : Promise.resolve({ data: null as any });

    // For You: ask ranker for ordered post ids
    let foryouIds: string[] | null = null;
    if (tab === "foryou" && user) {
      try {
        const { data } = await supabase.functions.invoke("rank-foryou", { body: {} });
        if (Array.isArray(data?.post_ids) && data.post_ids.length) foryouIds = data.post_ids;
      } catch { /* fallback to chronological */ }
    }

    const sel = "id, user_id, content, media_url, media_type, like_count, comment_count, created_at, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url, verified, verification_kind)";
    const postsP = foryouIds
      ? supabase.from("posts").select(sel).in("id", foryouIds)
      : supabase.from("posts").select(sel).eq("is_reel", false).order("created_at", { ascending: false }).limit(50);

    const [{ data: bOut }, { data: bIn }, { data: mu }, followsRes, postsRes] = await Promise.all([
      blocksOut, blocksIn, mutesP, followsP, postsP,
    ]);

    const excluded = new Set<string>();
    (bOut ?? []).forEach((x: any) => excluded.add(x.blocked_id));
    (bIn ?? []).forEach((x: any) => excluded.add(x.blocker_id));
    (mu ?? []).forEach((x: any) => excluded.add(x.muted_id));

    let visible = (postsRes.data ?? []).filter((d: any) => !excluded.has(d.user_id));

    if (foryouIds) {
      const order = new Map(foryouIds.map((id, i) => [id, i]));
      visible.sort((a: any, b: any) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
    }

    if (tab === "following" && user) {
      const followIds = new Set(((followsRes as any).data ?? []).map((f: any) => f.following_id));
      visible = visible.filter((d: any) => followIds.has(d.user_id));
    }

    let liked: Set<string> = new Set();
    if (user && visible.length) {
      const { data: l } = await supabase.from("likes").select("post_id").eq("user_id", user.id)
        .in("post_id", visible.map((d: any) => d.id));
      liked = new Set((l ?? []).map((x) => x.post_id));
    }
    setPosts(visible.map((d: any) => ({ ...d, liked: liked.has(d.id) })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, user?.id]);

  // Collapsing top bar on scroll-down, restore on scroll-up
  const [chromeHidden, setChromeHidden] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 32) { setChromeHidden(false); lastY.current = y; return; }
      const dy = y - lastY.current;
      if (dy > 6) setChromeHidden(true);
      else if (dy < -6) setChromeHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      <div
        className={cn(
          "sticky top-0 z-30 bg-background/95 backdrop-blur-sm transition-transform duration-300",
          chromeHidden ? "-translate-y-full" : "translate-y-0",
        )}
      >
        <header className="h-14 px-5 flex items-center justify-between gap-3 border-b border-border">
          <button className="flex items-center gap-1.5">
            <span className="font-display text-2xl font-black tracking-wide text-primary">AURELIX</span>
            <ChevronDown className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex items-center gap-1">
            <Link to="/discover" className="p-2" aria-label="Search">
              <Search className="h-6 w-6 text-foreground" strokeWidth={1.75} />
            </Link>
            <Link to="/notifications" className="p-2" aria-label="Notifications">
              <Bell className="h-6 w-6 text-foreground" strokeWidth={1.75} />
            </Link>
          </div>
        </header>
      </div>

      <StoriesRail />

      {/* Underline tabs */}
      <div className="flex border-b border-border">
        {[
          { id: "foryou", label: "For you" },
          { id: "following", label: "Following" },
        ].map((t: any) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold relative",
              tab === t.id ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-foreground" />
            )}
          </button>
        ))}
      </div>

      <section className="pb-6">
        {loading && <FeedSkeleton count={3} />}
        {!loading && posts.length === 0 && (
          tab === "following" ? (
            <EmptyState
              icon={Users}
              title="Your following feed is empty"
              subtitle="Follow people you find interesting to see their posts here."
              cta={{ label: "Discover people", to: "/discover" }}
              size="lg"
            />
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Nothing here yet"
              subtitle="Be the first to share something with the Aurelix community."
              cta={{ label: "Create post", to: "/compose" }}
              size="lg"
            />
          )
        )}
        <div className="divide-y divide-border">
          {posts.map((p, idx) => (
            <div key={p.id}>
              <PostCard post={p} onOpenComments={setCommentPost} />
              {idx === 2 && <SuggestedUsersRail />}
            </div>
          ))}
        </div>
      </section>

      <CommentSheet postId={commentPost} open={!!commentPost} onOpenChange={(b) => !b && setCommentPost(null)} />
    </div>
  );
};

export default Feed;
