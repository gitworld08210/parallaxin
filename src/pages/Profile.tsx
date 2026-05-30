import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, LogOut, Grid3x3, Film, Bookmark, MoreHorizontal, Ban, VolumeX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { fmt, gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  verified: boolean;
  verification_kind: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
};

type Tab = "posts" | "reels" | "saved";

const Profile = () => {
  const { username } = useParams();
  const { user, profile: me, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [reels, setReels] = useState<FeedPost[]>([]);
  const [saved, setSaved] = useState<FeedPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("posts");
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
        const sel = "id, user_id, content, media_url, media_type, like_count, comment_count, created_at, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url, verified, verification_kind)";
        const { data: pdata } = await supabase.from("posts").select(sel)
          .eq("user_id", p.user_id).eq("is_reel", false).order("created_at", { ascending: false });
        const { data: rdata } = await supabase.from("posts").select(sel)
          .eq("user_id", p.user_id).eq("is_reel", true).order("created_at", { ascending: false });

        let liked = new Set<string>();
        const allIds = [...(pdata ?? []), ...(rdata ?? [])].map((d: any) => d.id);
        if (user && allIds.length) {
          const { data: l } = await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", allIds);
          liked = new Set((l ?? []).map((x) => x.post_id));
        }
        setPosts((pdata ?? []).map((d: any) => ({ ...d, liked: liked.has(d.id) })));
        setReels((rdata ?? []).map((d: any) => ({ ...d, liked: liked.has(d.id) })));

        if (user && p.user_id === user.id) {
          const { data: sv } = await supabase.from("saves").select(`post_id, post:posts(${sel})`).eq("user_id", user.id).order("created_at", { ascending: false });
          setSaved(((sv ?? []).map((s: any) => s.post).filter(Boolean)).map((d: any) => ({ ...d, liked: liked.has(d.id) })));
        }

        if (user && p.user_id !== user.id) {
          const { data: f } = await supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", p.user_id).maybeSingle();
          setIsFollowing(!!f);
          const { data: b } = await (supabase.from("blocks" as any).select("blocker_id").eq("blocker_id", user.id).eq("blocked_id", p.user_id).maybeSingle() as any);
          setIsBlocked(!!b);
          const { data: mu } = await (supabase.from("mutes" as any).select("muter_id").eq("muter_id", user.id).eq("muted_id", p.user_id).maybeSingle() as any);
          setIsMuted(!!mu);
        }
      }
      setLoading(false);
    })();
  }, [username, me?.username, user?.id]);

  const toggleBlock = async () => {
    if (!user || !profile) return;
    if (isBlocked) {
      setIsBlocked(false);
      await (supabase.from("blocks" as any).delete().eq("blocker_id", user.id).eq("blocked_id", profile.user_id) as any);
      toast.success("Unblocked");
    } else {
      setIsBlocked(true);
      const { error } = await (supabase.from("blocks" as any).insert({ blocker_id: user.id, blocked_id: profile.user_id } as any) as any);
      if (error) { setIsBlocked(false); toast.error(error.message); }
      else {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.user_id);
        await supabase.from("follows").delete().eq("follower_id", profile.user_id).eq("following_id", user.id);
        toast.success("Blocked");
      }
    }
  };
  const toggleMute = async () => {
    if (!user || !profile) return;
    if (isMuted) {
      setIsMuted(false);
      await (supabase.from("mutes" as any).delete().eq("muter_id", user.id).eq("muted_id", profile.user_id) as any);
      toast.success("Unmuted");
    } else {
      setIsMuted(true);
      const { error } = await (supabase.from("mutes" as any).insert({ muter_id: user.id, muted_id: profile.user_id } as any) as any);
      if (error) { setIsMuted(false); toast.error(error.message); } else toast.success("Muted");
    }
  };
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

  if (loading) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!profile) return <div className="p-10 text-center text-sm text-muted-foreground">Profile not found.</div>;

  const current = tab === "posts" ? posts : tab === "reels" ? reels : saved;

  return (
    <div>
      {/* IG-style profile header */}
      <header className="h-14 px-3 flex items-center justify-between gap-3 border-b border-border">
        <h1 className="text-base font-semibold truncate flex items-center gap-1">
          {profile.username}
          {profile.verification_kind && <VerificationBadge kind={profile.verification_kind as any} />}
        </h1>
        <div className="flex items-center gap-1">
          {isMe ? (
            <button onClick={() => signOut()} className="p-2" aria-label="Sign out">
              <LogOut className="h-6 w-6 text-foreground" strokeWidth={1.75} />
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2" aria-label="More">
                  <MoreHorizontal className="h-6 w-6 text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={toggleMute}>
                  <VolumeX className="h-4 w-4 mr-2" />
                  {isMuted ? "Unmute" : "Mute"} @{profile.username}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleBlock} className="text-destructive focus:text-destructive">
                  <Ban className="h-4 w-4 mr-2" />
                  {isBlocked ? "Unblock" : "Block"} @{profile.username}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Identity row: avatar left, stats right */}
      <div className="px-4 pt-5 flex items-center gap-6">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover shrink-0" />
        ) : (
          <AuraAvatar gradient={gradientFor(profile.username)} size="xl" initials={initialsOf(profile.display_name || profile.username)} />
        )}
        <div className="flex-1 grid grid-cols-3 gap-2 text-center">
          <Stat value={profile.posts_count} label="posts" />
          <Stat value={profile.followers_count} label="followers" to={`/u/${profile.username}/followers`} />
          <Stat value={profile.following_count} label="following" to={`/u/${profile.username}/following`} />
        </div>
      </div>

      {/* Display name + bio */}
      <div className="px-4 mt-3">
        <p className="text-sm font-semibold">{profile.display_name || profile.username}</p>
        {profile.bio && <p className="text-sm mt-0.5 whitespace-pre-wrap">{profile.bio}</p>}
      </div>

      {/* Actions */}
      <div className="px-4 mt-4 flex gap-2">
        {isMe ? (
          <>
            <Link to="/profile/edit" className="flex-1 text-center py-1.5 rounded-md bg-muted text-foreground font-semibold text-sm">
              Edit profile
            </Link>
            <Link to="/premium" className="flex-1 text-center py-1.5 rounded-md bg-muted text-foreground font-semibold text-sm">
              Upgrade
            </Link>
          </>
        ) : (
          <>
            <button
              onClick={toggleFollow}
              className={cn(
                "flex-1 py-1.5 rounded-md font-semibold text-sm",
                isFollowing ? "bg-muted text-foreground" : "bg-primary text-primary-foreground",
              )}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
            <button
              onClick={async () => {
                if (!user || !profile) return;
                const { data, error } = await supabase.rpc("start_dm", { other_user_id: profile.user_id });
                if (error) { toast.error(error.message || "Could not start chat"); return; }
                if (data) nav(`/messages/${data}`);
              }}
              className="flex-1 py-1.5 rounded-md bg-muted text-foreground font-semibold text-sm"
            >
              Message
            </button>
          </>
        )}
      </div>

      {/* Verification CTA — slim */}
      {isMe && !profile.verified && (
        <Link to="/verification" className="block mx-4 mt-4 px-3 py-2.5 rounded-md bg-muted flex items-center gap-2 text-sm">
          <BadgeCheck className="h-4 w-4 text-primary" />
          <span className="flex-1 text-foreground">Request verification</span>
          <span className="text-muted-foreground">›</span>
        </Link>
      )}

      {/* Tabs */}
      <div className="mt-5 flex border-t border-border">
        {([
          { id: "posts", icon: Grid3x3, label: "Posts" },
          { id: "reels", icon: Film, label: "Reels" },
          ...(isMe ? [{ id: "saved" as Tab, icon: Bookmark, label: "Saved" }] : []),
        ] as { id: Tab; icon: any; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-2.5 flex items-center justify-center relative",
              tab === t.id ? "text-foreground" : "text-muted-foreground",
            )}
            aria-label={t.label}
          >
            <t.icon className="h-5 w-5" strokeWidth={1.75} />
            {tab === t.id && <span className="absolute left-0 right-0 -top-px h-[1.5px] bg-foreground" />}
          </button>
        ))}
      </div>

      {/* Grid / list */}
      {tab === "posts" ? (
        <div className="grid grid-cols-3 gap-[2px]">
          {current.length === 0 && <p className="col-span-3 text-sm text-muted-foreground text-center py-12">No posts yet.</p>}
          {current.map((p) => (
            <Link key={p.id} to={`/p/${p.id}`} className="aspect-square bg-muted overflow-hidden">
              {p.media_url ? (
                p.media_type === "video"
                  ? <video src={p.media_url} muted className="w-full h-full object-cover" />
                  : <img src={p.media_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2 text-[11px] text-muted-foreground line-clamp-4 text-center">{p.content}</div>
              )}
            </Link>
          ))}
        </div>
      ) : tab === "reels" ? (
        <div className="grid grid-cols-3 gap-[2px]">
          {current.length === 0 && <p className="col-span-3 text-sm text-muted-foreground text-center py-12">No reels yet.</p>}
          {current.map((r) => (
            <Link key={r.id} to={`/p/${r.id}`} className="aspect-[9/16] bg-muted overflow-hidden">
              {r.media_url && <video src={r.media_url} muted className="w-full h-full object-cover" />}
            </Link>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border pb-6">
          {current.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">Nothing saved yet.</p>}
          {current.map((p) => <PostCard key={p.id} post={p} onOpenComments={setCommentPost} />)}
        </div>
      )}

      <CommentSheet postId={commentPost} open={!!commentPost} onOpenChange={(b) => !b && setCommentPost(null)} />
    </div>
  );
};

const Stat = ({ value, label, to }: { value: number; label: string; to?: string }) => {
  const inner = (
    <div>
      <p className="text-base font-semibold leading-tight">{fmt(value)}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

export default Profile;
