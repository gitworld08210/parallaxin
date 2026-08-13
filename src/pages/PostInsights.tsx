import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Eye, Heart, MessageCircle, Bookmark, Users, Sparkles } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { fmt, timeAgo } from "@/lib/format";
import { AuthenticityMeter } from "@/components/social/AuthenticityMeter";
import { toast } from "sonner";

const PostInsights = () => {
  const { postId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    impressions: 0, reach: 0, likes: 0, comments: 0, saves: 0,
  });
  const [post, setPost] = useState<{ content: string; media_url: string | null; media_type: string | null; created_at: string; user_id: string; authenticity_score: number | null; authenticity_breakdown: any } | null>(null);
  const [scoring, setScoring] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!postId || !user) return;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from("posts").select("content, media_url, media_type, like_count, comment_count, created_at, user_id, authenticity_score, authenticity_breakdown").eq("id", postId).maybeSingle();
      if (!p || p.user_id !== user.id) { setDenied(true); setLoading(false); return; }
      setPost(p as any);
      const [{ data: views }, { count: saves }] = await Promise.all([
        supabase.from("post_views").select("viewer_id").eq("post_id", postId),
        supabase.from("collection_items").select("*", { count: "exact", head: true }).eq("post_id", postId),
      ]);
      const viewers = views ?? [];
      const reach = new Set(viewers.map((v: any) => v.viewer_id || "anon")).size;
      setStats({
        impressions: viewers.length,
        reach,
        likes: (p as any).like_count ?? 0,
        comments: (p as any).comment_count ?? 0,
        saves: saves ?? 0,
      });
      setLoading(false);
    })();
  }, [postId, user?.id]);

  if (denied) return <div className="p-10 text-center text-sm text-muted-foreground">You can only view insights for your own posts.</div>;
  if (loading || !post) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;

  const engagementRate = stats.reach > 0 ? ((stats.likes + stats.comments + stats.saves) / stats.reach) * 100 : 0;

  return (
    <div>
      <header className="h-14 px-2 flex items-center gap-2 border-b border-border">
        <button onClick={() => nav(-1)} className="p-1" aria-label="Back">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
        <h1 className="text-base font-semibold">Insights</h1>
      </header>

      <div className="p-4 flex gap-3 items-start border-b border-border">
        <div className="h-20 w-20 rounded-md bg-muted overflow-hidden shrink-0">
          {post.media_url ? (
            post.media_type === "video"
              ? <video src={post.media_url} muted className="h-full w-full object-cover" />
              : <img src={post.media_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-[10px] text-muted-foreground">Text</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm line-clamp-3">{post.content || <span className="text-muted-foreground italic">No caption</span>}</p>
          <p className="text-xs text-muted-foreground mt-1">Posted {timeAgo(post.created_at)} ago</p>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        <Stat icon={Users} label="Reach" value={stats.reach} sub="Unique viewers" />
        <Stat icon={Eye} label="Impressions" value={stats.impressions} sub="Total views" />
        <Stat icon={Heart} label="Likes" value={stats.likes} />
        <Stat icon={MessageCircle} label="Comments" value={stats.comments} />
        <Stat icon={Bookmark} label="Saves" value={stats.saves} />
        <Stat icon={Heart} label="Engagement" value={`${engagementRate.toFixed(1)}%`} sub="of reach" />
      </div>

      <div className="px-4 pb-8">
        <AuthenticityMeter score={post.authenticity_score} breakdown={post.authenticity_breakdown} />
        {post.authenticity_score == null && (
          <button
            disabled={scoring}
            onClick={async () => {
              setScoring(true);
              const { data, error } = await supabase.functions.invoke("score-authenticity", { body: { postId } });
              setScoring(false);
              if (error) { toast.error("Couldn't score: " + error.message); return; }
              setPost((prev) => prev ? { ...prev, authenticity_score: data?.score ?? null, authenticity_breakdown: data?.breakdown ?? null } : prev);
              toast.success("Authenticity scored");
            }}
            className="mt-3 w-full rounded-xl border border-border bg-card py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted/40 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" /> {scoring ? "Scoring…" : "Generate authenticity score"}
          </button>
        )}
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number | string; sub?: string }) => (
  <div className="bg-card border border-border rounded-xl p-3">
    <div className="flex items-center gap-2 mb-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
    </div>
    <p className="text-2xl font-bold leading-none">{typeof value === "number" ? fmt(value) : value}</p>
    {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
  </div>
);

export default PostInsights;
