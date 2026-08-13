import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Menu, Sparkles, Users, PenSquare, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { StoriesRail } from "@/components/social/StoriesRail";
import { SuggestedUsersRail } from "@/components/social/SuggestedUsersRail";
import { FeedSkeleton } from "@/components/social/FeedSkeleton";
import { EmptyState } from "@/components/empty/EmptyState";
import { SideMenu } from "@/components/layout/SideMenu";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

    // Mutes/Blocks/Follows migration needed. For now, we load all public Firestore posts.
    const qFirestore = query(
      collection(db, "posts"),
      where("is_reel", "==", false),
      orderBy("created_at", "desc"),
      limit(30)
    );
    const postsSnap = await getDocs(qFirestore);
    const postsData = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Mocking visibility filter until social graph is in Firestore
    const visible = postsData as any[];

    setPosts(visible.map((d: any) => ({ ...d, liked: false })));
    setLoading(false);
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
      <Helmet>
        <title>Aurelix Feed — Discover creators, reels & live culture</title>
        <meta name="description" content="Your personalized Aurelix feed: creators, reels, live streams, and AI-native community moments in one place." />
        <meta property="og:title" content="Aurelix Feed — Discover creators, reels & live culture" />
        <meta property="og:description" content="Your personalized Aurelix feed: creators, reels, live streams, and AI-native community moments in one place." />
        <link rel="canonical" href="https://parallaxai.in/" />
        <meta property="og:url" content="https://parallaxai.in/" />
      </Helmet>
      <h1 className="sr-only">Aurelix Feed</h1>
      {/* X-style translucent top chrome */}
      <div
        className={cn(
          "sticky top-0 z-30 liquid-nav border-b border-border/50 rounded-none transition-transform duration-300",
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
              to="/notifications"
              className="p-2 rounded-full hover:bg-secondary/60 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-foreground" strokeWidth={2} />
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
