import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
      const docRef = doc(db, "posts", postId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() };
      let liked = false;
      if (user) {
        const { doc: likeDoc, getDoc: getLikeDoc } = await import("firebase/firestore");
        const likeSnap = await getLikeDoc(likeDoc(db, "posts", postId, "likes", user.id));
        liked = likeSnap.exists();
      }
      setPost({ ...(data as any), liked });
    })();
  }, [postId, user?.id]);

  return (
    <div>
      <header className="h-14 px-2 flex items-center justify-between border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <button onClick={() => nav(-1)} className="h-10 w-10 grid place-items-center" aria-label="Back">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold">Post</h1>
        <button className="h-10 w-10 grid place-items-center" aria-label="More">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>
      <div className="px-5 pb-6">
        {!post && <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>}
        {post && <PostCard post={post} onOpenComments={() => setOpen(true)} />}
      </div>
      {post && <CommentSheet postId={open ? post.id : null} open={open} onOpenChange={setOpen} />}
    </div>
  );
};

export default PostDetail;
