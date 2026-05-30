import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

const PostDetail = () => {
  const { postId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, user_id, content, media_url, media_type, like_count, comment_count, created_at, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url, verified)")
        .eq("id", postId).maybeSingle();
      if (!data) return;
      let liked = false;
      if (user) {
        const { data: l } = await supabase.from("likes").select("post_id").eq("user_id", user.id).eq("post_id", postId).maybeSingle();
        liked = !!l;
      }
      setPost({ ...(data as any), liked });
    })();
  }, [postId, user?.id]);

  return (
    <div>
      <TopBar
        subtitle="Post"
        title=""
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>}
      />
      <div className="px-5 pb-6">
        {!post && <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>}
        {post && <PostCard post={post} onOpenComments={() => setOpen(true)} />}
      </div>
      {post && <CommentSheet postId={open ? post.id : null} open={open} onOpenChange={setOpen} />}
    </div>
  );
};

export default PostDetail;
