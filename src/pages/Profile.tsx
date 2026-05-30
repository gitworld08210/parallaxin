import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings, Sparkles, BadgeCheck, LogOut, Pencil } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { fmt, gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  verified: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
};

const Profile = () => {
  const { username } = useParams();
  const { user, profile: me, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentPost, setCommentPost] = useState<string | null>(null);

  const isMe = !username || (me && username === me.username);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const target = username || me?.username;
      if (!target) { setLoading(false); return; }
      const { data: p } = await supabase.from("profiles").select("*").eq("username", target).maybeSingle();
      setProfile(p as ProfileRow | null);
      if (p) {
        const { data: pdata } = await supabase
          .from("posts")
          .select("id, user_id, content, media_url, media_type, like_count, comment_count, created_at, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url, verified)")
          .eq("user_id", p.user_id)
          .order("created_at", { ascending: false });
        let liked = new Set<string>();
        if (user && pdata?.length) {
          const { data: l } = await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", pdata.map((d: any) => d.id));
          liked = new Set((l ?? []).map((x) => x.post_id));
        }
        setPosts((pdata ?? []).map((d: any) => ({ ...d, liked: liked.has(d.id) })));
        if (user && p.user_id !== user.id) {
          const { data: f } = await supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", p.user_id).maybeSingle();
          setIsFollowing(!!f);
        }
      }
      setLoading(false);
    })();
  }, [username, me?.username, user?.id]);

  const toggleFollow = async () => {
    if (!user || !profile) return;
    if (isFollowing) {
      setIsFollowing(false);
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.user_id);
    } else {
      setIsFollowing(true);
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.user_id });
      if (error) { setIsFollowing(false); toast.error(error.message); }
    }
  };

  if (loading) return <div className="p-10 text-center text-sm text-muted-foreground">Loading profile…</div>;
  if (!profile) return <div className="p-10 text-center text-sm text-muted-foreground">Profile not found.</div>;

  return (
    <div>
      <TopBar
        subtitle={isMe ? "You" : "Creator"}
        title={profile.display_name || profile.username}
        right={
          isMe ? (
            <button onClick={() => signOut()} className="glass h-11 w-11 rounded-full grid place-items-center" aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          ) : (
            <Link to="/verification" className="glass h-11 w-11 rounded-full grid place-items-center">
              <Settings className="h-5 w-5" />
            </Link>
          )
        }
      />

      <div className="px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl overflow-hidden p-6 shadow-elevated"
          style={{ backgroundImage: "var(--gradient-infinity)" }}
        >
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-primary opacity-30 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-gradient-gold opacity-20 blur-3xl" />

          <div className="relative flex flex-col items-center text-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-28 w-28 rounded-full object-cover ring-2 ring-background shadow-glow" />
            ) : (
              <AuraAvatar gradient={gradientFor(profile.username)} size="xl" glow initials={initialsOf(profile.display_name || profile.username)} />
            )}
            <div className="mt-4 flex items-center gap-2">
              <h2 className="font-display text-2xl font-semibold">{profile.display_name || profile.username}</h2>
              {profile.verified && <VerificationBadge kind="verified" />}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="mt-3 text-sm max-w-xs">{profile.bio}</p>}
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-2">
            <StatCard label="Posts" value={fmt(profile.posts_count)} />
            <StatCard label="Followers" value={fmt(profile.followers_count)} to={`/u/${profile.username}/followers`} />
            <StatCard label="Following" value={fmt(profile.following_count)} to={`/u/${profile.username}/following`} />
          </div>

          <div className="relative mt-5 grid grid-cols-2 gap-3">
            {isMe ? (
              <>
                <Link to="/profile/edit" className="rounded-xl py-2.5 text-sm font-semibold bg-gradient-primary text-primary-foreground shadow-glow text-center flex items-center justify-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit profile
                </Link>
                <Link to="/premium" className="glass-strong rounded-xl py-2.5 text-sm font-semibold text-center">
                  Upgrade
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={toggleFollow}
                  className={`rounded-xl py-2.5 text-sm font-semibold ${
                    isFollowing ? "glass-strong" : "bg-gradient-primary text-primary-foreground shadow-glow"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
                <button
                  onClick={async () => {
                    if (!user) return;
                    // open or create 1:1 conversation
                    const { data: convs } = await supabase
                      .from("conversation_participants")
                      .select("conversation_id")
                      .eq("user_id", user.id);
                    const myConvIds = (convs ?? []).map((c) => c.conversation_id);
                    let convId: string | null = null;
                    if (myConvIds.length) {
                      const { data: shared } = await supabase
                        .from("conversation_participants")
                        .select("conversation_id")
                        .eq("user_id", profile.user_id)
                        .in("conversation_id", myConvIds);
                      convId = shared?.[0]?.conversation_id ?? null;
                    }
                    if (!convId) {
                      const { data: conv } = await supabase.from("conversations").insert({ is_group: false }).select("id").single();
                      if (conv) {
                        await supabase.from("conversation_participants").insert([
                          { conversation_id: conv.id, user_id: user.id },
                          { conversation_id: conv.id, user_id: profile.user_id },
                        ]);
                        convId = conv.id;
                      }
                    }
                    if (convId) nav(`/messages/${convId}`);
                  }}
                  className="glass-strong rounded-xl py-2.5 text-sm font-semibold"
                >
                  Message
                </button>
              </>
            )}
          </div>
        </motion.div>

        {isMe && !profile.verified && (
          <Link to="/verification" className="block mt-6">
            <GlassCard className="flex items-center gap-3">
              <BadgeCheck className="h-6 w-6 text-verified" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Request verification</p>
                <p className="text-xs text-muted-foreground">Creator · Brand · Government · Standard</p>
              </div>
              <span className="text-xs text-muted-foreground">›</span>
            </GlassCard>
          </Link>
        )}

        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase mt-8 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Posts
        </h3>
        <div className="space-y-4 pb-6">
          {posts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No posts yet.</p>}
          {posts.map((p) => <PostCard key={p.id} post={p} onOpenComments={setCommentPost} />)}
        </div>
      </div>

      <CommentSheet postId={commentPost} open={!!commentPost} onOpenChange={(b) => !b && setCommentPost(null)} />
    </div>
  );
};

const StatCard = ({ label, value, to }: { label: string; value: string; to?: string }) => {
  const inner = (
    <div className="glass-strong rounded-2xl px-3 py-4 text-center">
      <p className="font-display text-xl font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

export default Profile;
