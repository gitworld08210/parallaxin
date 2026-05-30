import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Compass, Sparkles, Users } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
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
    let excluded = new Set<string>();
    if (user) {
      const [{ data: bOut }, { data: bIn }, { data: mu }] = await Promise.all([
        (supabase.from("blocks" as any).select("blocked_id").eq("blocker_id", user.id) as any),
        (supabase.from("blocks" as any).select("blocker_id").eq("blocked_id", user.id) as any),
        (supabase.from("mutes" as any).select("muted_id").eq("muter_id", user.id) as any),
      ]);
      (bOut ?? []).forEach((x: any) => excluded.add(x.blocked_id));
      (bIn ?? []).forEach((x: any) => excluded.add(x.blocker_id));
      (mu ?? []).forEach((x: any) => excluded.add(x.muted_id));
    }

    let q = supabase
      .from("posts")
      .select("id, user_id, content, media_url, media_type, like_count, comment_count, created_at, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url, verified, verification_kind)")
      .eq("is_reel", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (tab === "following" && user) {
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      const ids = (follows ?? []).map((f) => f.following_id).filter((id) => !excluded.has(id));
      if (ids.length === 0) { setPosts([]); setLoading(false); return; }
      q = q.in("user_id", ids);
    }
    const { data } = await q;
    let visible = (data ?? []).filter((d: any) => !excluded.has(d.user_id));
    let liked: Set<string> = new Set();
    if (user && visible.length) {
      const { data: l } = await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", visible.map((d: any) => d.id));
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
        <TopBar
          title="Aurelix"
          right={
            <>
              <Link to="/discover" className="p-2" aria-label="Discover">
                <Compass className="h-6 w-6 text-foreground" strokeWidth={1.75} />
              </Link>
              <Link to="/notifications" className="p-2" aria-label="Notifications">
                <Heart className="h-6 w-6 text-foreground" strokeWidth={1.75} />
              </Link>
            </>
          }
        />
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
