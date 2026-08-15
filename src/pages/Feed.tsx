import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Camera, Send as SendIcon } from "lucide-react";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { StoriesRail } from "@/components/social/StoriesRail";
import { FeedSkeleton } from "@/components/social/FeedSkeleton";
import { EmptyState } from "@/components/empty/EmptyState";
import { collection, query, where, orderBy, limit, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useAuth } from "@/contexts/AuthProvider";

const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentPost, setCommentPost] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "posts"),
        where("status", "==", "published"),
        where("is_reel", "==", false),
        orderBy("created_at", "desc"),
        limit(20),
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FeedPost[];

      // Resolve like state
      const withLikes = await Promise.all(
        rows.map(async (p) => {
          try {
            const likeSnap = await getDoc(doc(db, "likes", `${user.id}_${p.id}`));
            return { ...p, liked: likeSnap.exists() };
          } catch {
            return { ...p, liked: false };
          }
        }),
      );
      setPosts(withLikes);
    } catch (err) {
      console.error("Error loading feed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  return (
    <div className="min-h-screen bg-black">
      <Helmet>
        <title>Parallax</title>
        <meta name="description" content="Parallax — your feed" />
      </Helmet>

      {/* ─── Instagram-style top header ─── */}
      <header className="sticky top-0 z-30 h-[52px] px-4 flex items-center justify-between bg-black border-b border-white/[0.06]">
        <Link to="/compose" aria-label="Camera" className="p-1">
          <Camera className="h-6 w-6 text-white" strokeWidth={1.8} />
        </Link>

        <span className="font-serif italic text-[26px] tracking-tight text-white select-none">
          Parallax
        </span>

        <div className="flex items-center gap-5">
          {/* Activity / likes icon (heart with dot) */}
          <Link to="/notifications" aria-label="Notifications" className="relative p-1">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-black" />
          </Link>

          {/* DM / Messenger icon */}
          <Link to="/messages" aria-label="Messages" className="p-1">
            <SendIcon className="h-6 w-6 text-white -rotate-45" strokeWidth={1.8} />
          </Link>
        </div>
      </header>

      {/* ─── Stories rail ─── */}
      <StoriesRail />

      {/* ─── Posts ─── */}
      <section className="pb-20">
        {loading && <FeedSkeleton count={3} />}
        {!loading && posts.length === 0 && (
          <EmptyState
            icon={Camera}
            title="No posts yet"
            subtitle="Follow people or share something to get started."
            cta={{ label: "Create post", to: "/compose" }}
            size="lg"
          />
        )}
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onOpenComments={setCommentPost} />
        ))}
      </section>

      <CommentSheet postId={commentPost} open={!!commentPost} onOpenChange={(b) => !b && setCommentPost(null)} />
    </div>
  );
};

export default Feed;
