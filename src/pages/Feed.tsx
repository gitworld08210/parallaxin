import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Sparkles, Plus, Wand2, Compass } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { StoriesRail } from "@/components/social/StoriesRail";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

const Feed = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentPost, setCommentPost] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    // gather blocks (both directions) + mutes to exclude
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

  return (
    <div>
      <TopBar
        subtitle="Aurelix"
        title="Feed"
        right={
          <div className="flex gap-2">
            <Link to="/assistant" className="glass h-11 w-11 rounded-full grid place-items-center" aria-label="Aurelix AI">
              <Wand2 className="h-5 w-5 text-primary" />
            </Link>
            <Link to="/notifications" className="glass h-11 w-11 rounded-full grid place-items-center">
              <Bell className="h-5 w-5" />
            </Link>
          </div>
        }
      />

      <StoriesRail />

      <div className="px-5 mb-4 flex glass rounded-full p-1">
        {[
          { id: "foryou", label: "For You", icon: Sparkles },
          { id: "following", label: "Following", icon: null },
        ].map((t: any) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-semibold rounded-full flex items-center justify-center gap-1.5 transition-all ${
              tab === t.id ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
            }`}
          >
            {t.icon && <t.icon className="h-3.5 w-3.5" />}
            {t.label}
          </button>
        ))}
      </div>

      <section className="px-5 space-y-4 pb-6">
        {loading && <p className="text-sm text-muted-foreground text-center py-12">Loading the universe…</p>}
        {!loading && posts.length === 0 && (
          <div className="text-center py-16">
            <p className="font-display text-2xl mb-2">Nothing here yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              {tab === "following" ? "Follow creators to fill your feed." : "Be the first to share a vibe."}
            </p>
            <Link to="/compose" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow">
              <Plus className="h-4 w-4" /> Create post
            </Link>
          </div>
        )}
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onOpenComments={setCommentPost} />
        ))}
      </section>

      <Sheet>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-24 right-5 z-40 h-14 w-14 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center shadow-glow"
            aria-label="Create"
          >
            <Plus className="h-6 w-6" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <div className="grid grid-cols-3 gap-3 pt-6 pb-4">
            <Link to="/compose" className="glass-strong rounded-2xl py-5 flex flex-col items-center gap-2">
              <ImageIcon className="h-6 w-6 text-primary" />
              <span className="text-xs font-semibold">Post</span>
            </Link>
            <Link to="/compose/reel" className="glass-strong rounded-2xl py-5 flex flex-col items-center gap-2">
              <Film className="h-6 w-6 text-primary" />
              <span className="text-xs font-semibold">Reel</span>
            </Link>
            <Link to="/compose/story" className="glass-strong rounded-2xl py-5 flex flex-col items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xs font-semibold">Story</span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      <CommentSheet postId={commentPost} open={!!commentPost} onOpenChange={(b) => !b && setCommentPost(null)} />
    </div>
  );
};

export default Feed;
