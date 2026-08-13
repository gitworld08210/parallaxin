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
    if (!user) return;
    setLoading(true);

    try {
      // Load posts from Firestore - using a memoized query would be better but let's optimize the execution
      const q = query(
        collection(db, "posts"),
        where("status", "==", "published"),
        where("is_reel", "==", false),
        orderBy("created_at", "desc"),
        limit(10)
      );
      const snap = await getDocs(q);
      const postsData = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        liked: false // Initialize liked state
      })) as FeedPost[];
      setPosts(postsData);
    } catch (err) {
      console.error("Error loading feed:", err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, user?.id]);

  const [chromeHidden, setChromeHidden] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = (e: any) => {
      const y = e.target.scrollTop;
      if (y < 32) { setChromeHidden(false); lastY.current = y; return; }
      const dy = y - lastY.current;
      if (dy > 6) setChromeHidden(true);
      else if (dy < -6) setChromeHidden(false);
      lastY.current = y;
    };
    const main = document.querySelector('main');
    main?.addEventListener("scroll", onScroll, { passive: true });
    return () => main?.removeEventListener("scroll", onScroll);
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
      {/* Instagram-style translucent top chrome */}
      <div
        className={cn(
          "sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/[0.05] transition-transform duration-300",
          chromeHidden ? "-translate-y-full" : "translate-y-0",
        )}
      >
        <header className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SideMenu 
              trigger={
                <button className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-white/10">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <AuraAvatar gradient={gradientFor(profile?.username)} initials={initialsOf(displayName)} />
                  )}
                </button>
              }
            />
            <span className="font-serif italic text-2xl tracking-tighter">
              Parallax
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/notifications" className="relative">
              <Bell className="h-6 w-6" />
            </Link>
            <Link to="/messages">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2">
                <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
        {loading && <FeedSkeleton count={2} />}
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
        <div className="divide-y divide-border flex flex-col">
          {posts.map((p, idx) => (
            <div key={p.id} className="min-h-[200px]">
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
        className="absolute z-40 bottom-24 right-4 h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-glow hover:brightness-110 active:scale-95 transition-all"
      >
        <PenSquare className="h-6 w-6" strokeWidth={2.2} />
      </Link>

      <CommentSheet postId={commentPost} open={!!commentPost} onOpenChange={(b) => !b && setCommentPost(null)} />
    </div>
  );
};

export default Feed;
