import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Sparkles, Users, PenSquare } from "lucide-react";
import { motion } from "framer-motion";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { StoriesRail } from "@/components/social/StoriesRail";
import { SuggestedUsersRail } from "@/components/social/SuggestedUsersRail";
import { FeedSkeleton } from "@/components/social/FeedSkeleton";
import { EmptyState } from "@/components/empty/EmptyState";
import { SideMenu } from "@/components/layout/SideMenu";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

const Feed = () => {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentPost, setCommentPost] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    const sel = "id, user_id, content, media_url, media_type, like_count, comment_count, created_at, has_certificate, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url, verified, verification_kind)";

    const blocksOut = user ? (supabase.from("blocks" as any).select("blocked_id").eq("blocker_id", user.id) as any) : Promise.resolve({ data: [] });
    const blocksIn = user ? (supabase.from("blocks" as any).select("blocker_id").eq("blocked_id", user.id) as any) : Promise.resolve({ data: [] });
    const mutesP = user ? (supabase.from("mutes" as any).select("muted_id").eq("muter_id", user.id) as any) : Promise.resolve({ data: [] });
    const followsP = (tab === "following" && user)
      ? supabase.from("follows").select("following_id").eq("follower_id", user.id)
      : Promise.resolve({ data: null as any });
    const postsP = supabase.from("posts").select(sel).eq("is_reel", false).order("created_at", { ascending: false }).limit(30);

    const [{ data: bOut }, { data: bIn }, { data: mu }, followsRes, postsRes] = await Promise.all([
      blocksOut, blocksIn, mutesP, followsP, postsP,
    ]);

    const excluded = new Set<string>();
    (bOut ?? []).forEach((x: any) => excluded.add(x.blocked_id));
    (bIn ?? []).forEach((x: any) => excluded.add(x.blocker_id));
    (mu ?? []).forEach((x: any) => excluded.add(x.muted_id));

    let visible = (postsRes.data ?? []).filter((d: any) => !excluded.has(d.user_id));

    if (tab === "following" && user) {
      const followIds = new Set(((followsRes as any).data ?? []).map((f: any) => f.following_id));
      visible = visible.filter((d: any) => followIds.has(d.user_id));
    }

    setPosts(visible.map((d: any) => ({ ...d, liked: false })));
    setLoading(false);

    if (user && visible.length) {
      supabase.from("likes").select("post_id").eq("user_id", user.id)
        .in("post_id", visible.map((d: any) => d.id))
        .then(({ data: l }) => {
          const liked = new Set((l ?? []).map((x: any) => x.post_id));
          setPosts((cur) => cur.map((p) => ({ ...p, liked: liked.has(p.id) })));
        });
    }

    if (tab === "foryou" && user && visible.length) {
      supabase.functions.invoke("rank-foryou", { body: {} }).then(({ data }) => {
        const ids: string[] | undefined = data?.post_ids;
        if (!Array.isArray(ids) || !ids.length) return;
        const order = new Map(ids.map((id, i) => [id, i]));
        setPosts((cur) => [...cur].sort(
          (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999),
        ));
      }).catch(() => {});
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, user?.id]);

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

  const displayName = profile?.display_name || profile?.username || "";

  return (
    <div>
      {/* X-style translucent top chrome */}
      <div
        className={cn(
          "sticky top-0 z-30 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-transform duration-300 border-b border-border/70",
          chromeHidden ? "-translate-y-full" : "translate-y-0",
        )}
      >
        <header className="h-14 px-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <SideMenu
            trigger={
              <button className="p-1 rounded-full" aria-label="Menu">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <AuraAvatar
                    gradient={gradientFor(profile?.username)}
                    size="sm"
                    initials={initialsOf(displayName)}
                  />
                )}
              </button>
            }
          />
          <div className="flex items-center justify-center">
            <span className="font-display text-xl font-black tracking-[0.2em] text-primary">
              AURELIX
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/messages"
              className="p-2 rounded-full hover:bg-secondary/60 transition-colors"
              aria-label="Messages"
            >
              <MessageCircle className="h-5 w-5 text-foreground" strokeWidth={2} />
            </Link>
            <Link
              to="/discover"
              className="p-2 rounded-full hover:bg-secondary/60 transition-colors"
              aria-label="Feed settings"
            >
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={2} />
            </Link>
          </div>
        </header>

        {/* X-style tabs — animated underline with layoutId */}
        <div role="tablist" className="grid grid-cols-2">
          {[
            { id: "foryou", label: "For you" },
            { id: "following", label: "Following" },
          ].map((t: any) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative h-12 text-[15px] font-semibold transition-colors hover:bg-secondary/40",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span className="relative inline-flex h-full items-center justify-center">
                  {t.label}
                  {active && (
                    <motion.span
                      layoutId="feed-tab-underline"
                      className="absolute -bottom-px left-0 right-0 h-1 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <StoriesRail />

      <section className="pb-24">
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

      {/* Floating compose FAB — X-style */}
      <Link
        to="/compose"
        aria-label="Compose"
        className="fixed z-40 bottom-24 right-4 h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-glow hover:brightness-110 active:scale-95 transition-all"
      >
        <PenSquare className="h-6 w-6" strokeWidth={2.2} />
      </Link>

      <CommentSheet postId={commentPost} open={!!commentPost} onOpenChange={(b) => !b && setCommentPost(null)} />
    </div>
  );
};

export default Feed;
