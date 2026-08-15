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
import { collection, query, where, orderBy, limit, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

const Feed = () => {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentPost, setCommentPost] = useState<string | null>(null);

  const PAGE_SIZE = 10;

  // `in` filters are capped by Firestore, so the followed-author set has to be
  // queried in chunks and merged client-side.
  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const loadForYou = async (): Promise<FeedPost[]> => {
    const snap = await getDocs(query(
      collection(db, "posts"),
      where("status", "==", "published"),
      where("is_reel", "==", false),
      orderBy("created_at", "desc"),
      limit(PAGE_SIZE)
    ));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FeedPost[];
  };

  const loadFollowing = async (uid: string): Promise<FeedPost[]> => {
    const followSnap = await getDocs(query(
      collection(db, "follows"),
      where("follower_id", "==", uid)
    ));
    const authorIds = followSnap.docs
      .map((d) => d.data()?.following_id)
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    if (authorIds.length === 0) return [];

    const batches = await Promise.all(
      chunk(authorIds, 10).map((ids) => getDocs(query(
        collection(db, "posts"),
        where("status", "==", "published"),
        where("is_reel", "==", false),
        where("user_id", "in", ids),
        orderBy("created_at", "desc"),
        limit(PAGE_SIZE)
      )))
    );

    const seen = new Set<string>();
    const merged: FeedPost[] = [];
    for (const snap of batches) {
      for (const d of snap.docs) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        merged.push({ id: d.id, ...d.data() } as FeedPost);
      }
    }

    const toMillis = (v: any): number => {
      if (!v) return 0;
      if (typeof v?.toMillis === "function") return v.toMillis();
      const parsed = new Date(v).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    return merged
      .sort((a, b) => toMillis((b as any).created_at) - toMillis((a as any).created_at))
      .slice(0, PAGE_SIZE);
  };

  // The like state was previously hardcoded to false, so every post rendered as
  // un-liked even when the viewer had already liked it.
  const withLikeState = async (rows: FeedPost[], uid: string): Promise<FeedPost[]> => {
    const flags = await Promise.all(rows.map(async (p) => {
      try {
        const likeSnap = await getDoc(doc(db, "likes", `${uid}_${p.id}`));
        return likeSnap.exists();
      } catch {
        return false;
      }
    }));
    return rows.map((p, i) => ({ ...p, liked: flags[i] }));
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const rows = tab === "following"
        ? await loadFollowing(user.id)
        : await loadForYou();
      setPosts(await withLikeState(rows, user.id));
    } catch (err) {
      console.error("Error loading feed:", err);
      toast.error("Could not load your feed");
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
