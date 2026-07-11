import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Grid3x3, Film, Bookmark, MoreHorizontal, Ban, VolumeX, Flag, Crown, Menu, Bell, UserPlus, Share2, Tag as TagIcon, Mic, Image as ImageIcon, Pin, PinOff } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { ReportSheet } from "@/components/social/ReportSheet";
import { HighlightsRail } from "@/components/social/HighlightsRail";
import { FounderBadge } from "@/components/founders/FounderBadge";
import { SideMenu } from "@/components/layout/SideMenu";
import { ProfileShowcase } from "@/components/profile/ProfileShowcase";
import { EmptyState } from "@/components/empty/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { fmt, gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BecomeCreatorSheet } from "@/components/creator/BecomeCreatorSheet";
import { OrganizationMemberChip } from "@/components/organization/OrganizationMemberChip";
import { useUserOrganizations } from "@/hooks/organization/useUserOrganizations";

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
  is_founder?: boolean | null;
  join_era?: string | null;
  founder_title?: string | null;
  council_role?: string | null;
};

type Tab = "posts" | "reels" | "spaces" | "saved" | "tagged";

const Profile = () => {
  const { username } = useParams();
  const { user, profile: me } = useAuth();
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
  const [reportOpen, setReportOpen] = useState(false);
  const [becomeOpen, setBecomeOpen] = useState(false);
  const { memberships } = useUserOrganizations(profile?.user_id ?? null);
  const primaryMembership = memberships[0] ?? null;
  const ownerMembership = memberships.find((m) => m.is_owner) ?? null;

  const isMe = !username || (me && username === me.username);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const target = username || me?.username;
      if (!target) { setLoading(false); return; }
      const { data: p } = await supabase.from("profiles").select("*").eq("username", target).maybeSingle();
      setProfile(p as ProfileRow | null);
      if (p) {
        const sel = "id, user_id, content, media_url, media_type, like_count, comment_count, created_at, has_certificate, is_pinned, pinned_at, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url, verified, verification_kind)";
        const { data: ownPosts } = await supabase.from("posts").select(sel)
          .eq("user_id", p.user_id).eq("is_reel", false).order("created_at", { ascending: false });
        const { data: collabRows } = await supabase.from("post_collaborators" as any)
          .select("post_id").eq("user_id", p.user_id).eq("status", "accepted");
        const collabIds = (collabRows ?? []).map((r: any) => r.post_id);
        let collabPosts: any[] = [];
        if (collabIds.length) {
          const { data } = await supabase.from("posts").select(sel)
            .in("id", collabIds).eq("is_reel", false).order("created_at", { ascending: false });
          collabPosts = data ?? [];
        }
        const seen = new Set<string>();
        const pdata = [...(ownPosts ?? []), ...collabPosts]
          .filter((d: any) => { if (seen.has(d.id)) return false; seen.add(d.id); return true; })
          .sort((a: any, b: any) => {
            const ap = (a as any).is_pinned ? 1 : 0;
            const bp = (b as any).is_pinned ? 1 : 0;
            if (ap !== bp) return bp - ap;
            return +new Date(b.created_at) - +new Date(a.created_at);
          });
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

        // Active affiliations to display next to the verification badge
        const { data: affRows } = await supabase.from("affiliations" as any)
          .select("id, role, started_on, created_at, org_id")
          .eq("user_id", p.user_id).eq("status", "active");
        const orgIds = Array.from(new Set(((affRows ?? []) as any[]).map((r) => r.org_id)));
        const { data: orgRows } = orgIds.length
          ? await supabase.from("organizations" as any).select("id, name, username, logo_url, verified, org_type").in("id", orgIds)
          : { data: [] as any[] };
        const orgMap = new Map(((orgRows ?? []) as any[]).map((o) => [o.id, o]));
        setAffiliations(((affRows ?? []) as any[]).map((r) => ({
          id: r.id, role: r.role, started_on: r.started_on, issued_at: r.created_at,
          org: orgMap.get(r.org_id) ?? null,
        })));

        // If viewing my own profile and I'm an org admin, surface admin link
        if (user && p.user_id === user.id) {
          const { data: mem } = await supabase.from("organization_members" as any)
            .select("org_id, member_role, organization:organizations(username)")
            .eq("user_id", user.id).in("member_role", ["owner","admin"]).limit(1).maybeSingle();
          const orgUsername = (mem as any)?.organization?.username;
          if (orgUsername) setOrgAdminUsername(orgUsername);
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

  const shareProfile = async () => {
    const url = `${window.location.origin}/u/${profile?.username}`;
    try {
      if (navigator.share) await navigator.share({ title: profile?.display_name || profile?.username, url });
      else { await navigator.clipboard.writeText(url); toast.success("Profile link copied"); }
    } catch {/* ignore */}
  };

  if (loading) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!profile) return <div className="p-10 text-center text-sm text-muted-foreground">Profile not found.</div>;

  const current = tab === "posts" ? posts : tab === "reels" ? reels : tab === "saved" ? saved : [];

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "posts", label: "Posts", icon: Grid3x3 },
    { id: "reels", label: "Reels", icon: Film },
    { id: "spaces", label: "Spaces", icon: Mic },
    ...(isMe ? [{ id: "saved" as Tab, label: "Saved", icon: Bookmark }] : []),
    { id: "tagged", label: "Tagged", icon: TagIcon },
  ];

  return (
    <div className="pb-10">
      {/* Top bar */}
      <header className="sticky top-0 z-30 h-14 px-3 flex items-center justify-between gap-3 bg-background/80 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-1)} className="p-2 -ml-2" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-extrabold tracking-tight text-primary">AURELIX</span>
        </div>
        <div className="flex items-center gap-1">
          <Link to="/notifications" className="p-2 relative" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
          </Link>
          {isMe ? (
            <SideMenu
              trigger={
                <button className="p-2" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </button>
              }
            />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2" aria-label="More">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={toggleMute}>
                  <VolumeX className="h-4 w-4 mr-2" />
                  {isMuted ? "Unmute" : "Mute"} @{profile.username}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setReportOpen(true)} className="text-destructive focus:text-destructive">
                  <Flag className="h-4 w-4 mr-2" />
                  Report @{profile.username}
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

      {/* Cover banner */}
      <div className="relative h-36 w-full overflow-hidden">
        {profile.cover_url ? (
          <img src={profile.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.6),transparent_60%),radial-gradient(circle_at_80%_80%,hsl(var(--aura)/0.5),transparent_55%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--background)))]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      </div>

      {/* Avatar + identity row */}
      <div className="px-4 -mt-10 relative z-10 flex gap-4">
        <div className="shrink-0 rounded-full p-[3px] bg-gradient-to-br from-primary via-aura to-primary shadow-[0_0_30px_hsl(var(--primary)/0.5)]">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-background" />
          ) : (
            <div className="ring-2 ring-background rounded-full">
              <AuraAvatar gradient={gradientFor(profile.username)} size="lg" initials={initialsOf(profile.display_name || profile.username)} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 pt-10 space-y-1">
          <p className="text-lg font-bold inline-flex items-center gap-1.5 leading-tight flex-wrap">
            <span className="truncate">{profile.display_name || profile.username}</span>
            {profile.verification_kind && <VerificationBadge kind={profile.verification_kind as any} />}
            {profile.is_founder && (
              <Link to="/hall-of-founders" aria-label="Hall of Founders" className="inline-flex items-center justify-center h-5 w-5 rounded-full text-aura">
                <Crown className="h-4 w-4" />
              </Link>
            )}
            {affiliations.map((a) => <AffiliationChip key={a.id} data={a} />)}
          </p>
          <p className="text-xs text-muted-foreground">@{profile.username}</p>
          {affiliations[0]?.org && (
            <p className="text-xs text-muted-foreground">
              {labelForRoleSafe(affiliations[0].role)} at {affiliations[0].org.name}
              {affiliations[0].started_on && ` · Affiliated since ${new Date(affiliations[0].started_on).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`}
            </p>
          )}
          {isMe && orgAdminUsername && (
            <Link to={`/org/${orgAdminUsername}/admin`} className="inline-block text-xs text-primary font-semibold mt-1">
              Open organization dashboard →
            </Link>
          )}
        </div>
      </div>

      {/* About strip — bio + website link, full width */}
      <div className="px-4 mt-3 space-y-1">
        {profile.bio && <p className="text-sm whitespace-pre-wrap leading-relaxed">{profile.bio}</p>}
        <a href={`https://aurelix.app/${profile.username}`} target="_blank" rel="noreferrer" className="text-sm text-primary inline-block">
          aurelix.app/{profile.username}
        </a>
      </div>

      {/* Stats */}
      <div className="px-4 mt-5 grid grid-cols-3 gap-2 text-left">
        <Stat value={profile.posts_count} label="Posts" />
        <Stat value={profile.followers_count} label="Followers" to={`/u/${profile.username}/followers`} />
        <Stat value={profile.following_count} label="Following" to={`/u/${profile.username}/following`} />
      </div>

      {/* Actions */}
      <div className="px-4 mt-5 flex gap-2">
        {isMe ? (
          <>
            <Link to="/profile/edit" className="flex-1 text-center py-2.5 rounded-xl bg-gradient-to-r from-primary to-aura text-primary-foreground font-semibold text-sm shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
              Edit Profile
            </Link>
            {!(me as any)?.is_creator && (
              <button onClick={() => setBecomeOpen(true)} className="flex-1 text-center py-2.5 rounded-xl border border-primary/40 bg-primary/10 text-primary font-semibold text-sm">
                Become Creator
              </button>
            )}
            <button onClick={shareProfile} className="flex-1 text-center py-2.5 rounded-xl border border-border bg-muted/30 text-foreground font-semibold text-sm">
              Share Profile
            </button>
            <button onClick={shareProfile} aria-label="Invite" className="h-10 w-10 grid place-items-center rounded-xl border border-border bg-muted/30">
              <UserPlus className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={toggleFollow}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-semibold text-sm",
                isFollowing ? "bg-muted text-foreground" : "bg-gradient-to-r from-primary to-aura text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)]",
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
              className="flex-1 py-2.5 rounded-xl border border-border bg-muted/30 text-foreground font-semibold text-sm"
            >
              Message
            </button>
            <button onClick={shareProfile} aria-label="Share" className="h-10 w-10 grid place-items-center rounded-xl border border-border bg-muted/30">
              <Share2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Highlights */}
      {profile && <HighlightsRail userId={profile.user_id} isMe={!!isMe} />}


      {/* Tabs */}
      <div className="mt-5 border-t border-border">
        <div className="flex overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 min-w-[72px] py-3 flex items-center justify-center gap-1.5 relative text-sm font-medium",
                tab === t.id ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <t.icon className="h-4 w-4" strokeWidth={1.75} />
              <span>{t.label}</span>
              {tab === t.id && <span className="absolute left-3 right-3 -bottom-px h-[2px] rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "posts" ? (
        <div className="grid grid-cols-3 gap-0.5 mt-0.5">
          {current.length === 0 && <p className="col-span-3 text-sm text-muted-foreground text-center py-12">No posts yet.</p>}
          {current.map((p) => (
            <div key={p.id} className="relative aspect-square bg-muted overflow-hidden rounded-sm group">
              <Link to={`/p/${p.id}`} className="block w-full h-full">
                {p.media_url ? (
                  p.media_type === "video"
                    ? <video src={p.media_url} muted className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    : <img src={p.media_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 text-[11px] text-muted-foreground line-clamp-4 text-center">{p.content}</div>
                )}
              </Link>
              {(p as any).is_pinned && (
                <div className="absolute top-1 left-1 rounded-full bg-background/80 backdrop-blur p-1 shadow-sm">
                  <Pin className="h-3 w-3 text-primary" strokeWidth={2.5} />
                </div>
              )}
              {isMe && (
                <button
                  type="button"
                  aria-label={(p as any).is_pinned ? "Unpin post" : "Pin post"}
                  onClick={async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const next = !(p as any).is_pinned;
                    const { error } = await supabase.rpc("toggle_post_pin" as any, { _post_id: p.id, _pin: next });
                    if (error) { toast.error(error.message || "Failed"); return; }
                    toast.success(next ? "Pinned" : "Unpinned");
                    setPosts((prev) => {
                      const updated = prev.map((x) => x.id === p.id ? ({ ...x, is_pinned: next, pinned_at: next ? new Date().toISOString() : null } as any) : x);
                      return updated.sort((a: any, b: any) => {
                        const ap = a.is_pinned ? 1 : 0; const bp = b.is_pinned ? 1 : 0;
                        if (ap !== bp) return bp - ap;
                        return +new Date(b.created_at) - +new Date(a.created_at);
                      });
                    });
                  }}
                  className="absolute top-1 right-1 rounded-full bg-background/80 backdrop-blur p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  {(p as any).is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : tab === "reels" ? (
        <div className="grid grid-cols-3 gap-0.5 mt-0.5">
          {current.length === 0 && <p className="col-span-3 text-sm text-muted-foreground text-center py-12">No reels yet.</p>}
          {current.map((r) => (
            <Link key={r.id} to={`/p/${r.id}`} className="aspect-[9/16] bg-muted overflow-hidden rounded-sm">
              {r.media_url && <video src={r.media_url} muted className="w-full h-full object-cover" />}
            </Link>
          ))}
        </div>
      ) : tab === "saved" ? (
        <div className="divide-y divide-border pb-6">
          {current.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">Nothing saved yet.</p>}
          {current.map((p) => <PostCard key={p.id} post={p} onOpenComments={setCommentPost} />)}
        </div>
      ) : tab === "spaces" ? (
        <EmptyState icon={Mic} title="No Spaces yet" subtitle="Live audio rooms will appear here." />
      ) : (
        <EmptyState icon={TagIcon} title="No tagged posts" subtitle="Posts you're tagged in will show up here." />
      )}

      <CommentSheet postId={commentPost} open={!!commentPost} onOpenChange={(b) => !b && setCommentPost(null)} />
      <ReportSheet open={reportOpen} onOpenChange={setReportOpen} targetKind="profile" targetId={profile?.user_id ?? null} />
      <BecomeCreatorSheet open={becomeOpen} onOpenChange={setBecomeOpen} />
    </div>
  );
};

const Stat = ({ value, label, to }: { value: number; label: string; to?: string }) => {
  const inner = (
    <div className="px-1">
      <p className="text-2xl font-bold leading-tight tracking-tight">{fmt(value)}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

export default Profile;
