import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Hash } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";

import { useAuth } from "@/contexts/AuthProvider";

const Tag = () => {
  const { tag } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [commentPost, setCommentPost] = useState<string | null>(null);

  useEffect(() => {
    if (!tag) return;
    (async () => {
      const { data } = await supabase.from("posts").select("id, user_id, content, media_url, media_type, like_count, comment_count, created_at, has_certificate, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url, verified, verification_kind)").ilike("content", `%#${tag}%`).order("created_at", { ascending: false }).limit(50);
      let liked = new Set<string>();
      if (user && data?.length) {
        const { data: l } = await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", data.map((d: any) => d.id));
        liked = new Set((l ?? []).map((x: any) => x.post_id));
      }
      setPosts((data ?? []).map((d: any) => ({ ...d, liked: liked.has(d.id) })));
    })();
  }, [tag, user?.id]);

  return (
    <div>
      <TopBar
        subtitle="Hashtag"
        title={`#${tag}`}
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>}
      />
      <div className="px-5 pb-6 space-y-4">
        {posts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Hash className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No posts for #{tag} yet.</p>
          </div>
        )}
        {posts.map((p) => <PostCard key={p.id} post={p} onOpenComments={setCommentPost} />)}
      </div>
      <CommentSheet postId={commentPost} open={!!commentPost} onOpenChange={(b) => !b && setCommentPost(null)} />
    </div>
  );
};

export default Tag;
