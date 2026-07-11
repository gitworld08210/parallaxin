import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Building2,
  Film,
  Grid3x3,
  Info,
  Menu,
  Mic,
  Tag as TagIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { PostCard, type FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { ReportSheet } from "@/components/social/ReportSheet";
import { HighlightsRail } from "@/components/social/HighlightsRail";
import { SideMenu } from "@/components/layout/SideMenu";
import { BecomeCreatorSheet } from "@/components/creator/BecomeCreatorSheet";
import { EmptyState } from "@/components/empty/EmptyState";

import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { ProfileStats, type ProfileStat } from "@/components/profile/ProfileStats";
import { ProfileTabs, type ProfileTabDef } from "@/components/profile/ProfileTabs";
import { OrganizationsSection } from "@/components/profile/OrganizationsSection";
import { VerificationSheet } from "@/components/profile/VerificationSheet";
import { PostGrid, PostGridSkeleton } from "@/components/profile/PostGrid";
import { ProfileAbout } from "@/components/profile/ProfileAbout";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { useUserOrganizations } from "@/hooks/organization/useUserOrganizations";
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
  is_founder?: boolean | null;
  join_era?: string | null;
  founder_title?: string | null;
  council_role?: string | null;
  created_at?: string | null;
  aura_rank?: string | null;
  contribution_score?: number | null;
  tier?: string | null;
  interests?: string[] | null;
  is_creator?: boolean | null;
};

type Tab = "posts" | "media" | "organizations" | "about" | "saved" | "tagged";

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
  const [contentLoading, setContentLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("posts");
  const [commentPost, setCommentPost] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [becomeOpen, setBecomeOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const { memberships: rawMemberships } = useUserOrganizations(profile?.user_id ?? null);
  const memberships = useMemo(
    () =>
      [...rawMemberships].sort((a, b) => {
        if (a.is_owner !== b.is_owner) return a.is_owner ? -1 : 1;
        const aj = a.joined_at ? Date.parse(a.joined_at) : 0;
        const bj = b.joined_at ? Date.parse(b.joined_at) : 0;
        if (aj !== bj) return bj - aj;
        return a.name.localeCompare(b.name);
      }),
    [rawMemberships],
  );

  const isMe = !username || (me && username === me.username);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setContentLoading(true);
      const target = username || me?.username;
      if (!target) {
        setLoading(false);
        setContentLoading(false);
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", target)
        .maybeSingle();
      setProfile(p as ProfileRow | null);
      setLoading(false);

      if (p) {
        const sel =
          "id, user_id, content, media_url, media_type, like_count, comment_count, created_at, has_certificate, is_pinned, pinned_at, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url, verified, verification_kind)";
        const { data: ownPosts } = await supabase
          .from("posts")
          .select(sel)
          .eq("user_id", p.user_id)
          .eq("is_reel", false)
          .order("created_at", { ascending: false });
        const { data: collabRows } = await supabase
          .from("post_collaborators" as any)
          .select("post_id")
          .eq("user_id", p.user_id)
          .eq("status", "accepted");
        const collabIds = (collabRows ?? []).map((r: any) => r.post_id);
        let collabPosts: any[] = [];
        if (collabIds.length) {
          const { data } = await supabase
            .from("posts")
            .select(sel)
            .in("id", collabIds)
            .eq("is_reel", false)
            .order("created_at", { ascending: false });
          collabPosts = data ?? [];
        }
        const seen = new Set<string>();
        const pdata = [...(ownPosts ?? []), ...collabPosts]
          .filter((d: any) => {
            if (seen.has(d.id)) return false;
            seen.add(d.id);
            return true;
          })
          .sort((a: any, b: any) => {
            const ap = (a as any).is_pinned ? 1 : 0;
            const bp = (b as any).is_pinned ? 1 : 0;
            if (ap !== bp) return bp - ap;
            return +new Date(b.created_at) - +new Date(a.created_at);
          });
        const { data: rdata } = await supabase
          .from("posts")
          .select(sel)
          .eq("user_id", p.user_id)
          .eq("is_reel", true)
          .order("created_at", { ascending: false });

        let liked = new Set<string>();
        const allIds = [...(pdata ?? []), ...(rdata ?? [])].map((d: any) => d.id);
        if (user && allIds.length) {
          const { data: l } = await supabase
            .from("likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", allIds);
          liked = new Set((l ?? []).map((x) => x.post_id));
        }
        setPosts((pdata ?? []).map((d: any) => ({ ...d, liked: liked.has(d.id) })));
        setReels((rdata ?? []).map((d: any) => ({ ...d, liked: liked.has(d.id) })));

        if (user && p.user_id === user.id) {
          const { data: sv } = await supabase
            .from("saves")
            .select(`post_id, post:posts(${sel})`)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          setSaved(
            ((sv ?? []).map((s: any) => s.post).filter(Boolean)).map((d: any) => ({
              ...d,
              liked: liked.has(d.id),
            })),
          );
        }

        if (user && p.user_id !== user.id) {
          const { data: f } = await supabase
            .from("follows")
            .select("follower_id")
            .eq("follower_id", user.id)
            .eq("following_id", p.user_id)
            .maybeSingle();
          setIsFollowing(!!f);
          const { data: b } = await (supabase
            .from("blocks" as any)
            .select("blocker_id")
            .eq("blocker_id", user.id)
            .eq("blocked_id", p.user_id)
            .maybeSingle() as any);
          setIsBlocked(!!b);
          const { data: mu } = await (supabase
            .from("mutes" as any)
            .select("muter_id")
            .eq("muter_id", user.id)
            .eq("muted_id", p.user_id)
            .maybeSingle() as any);
          setIsMuted(!!mu);
        }
      }
      setContentLoading(false);
    })();
  }, [username, me?.username, user?.id]);

  // ============ Mutations ============
  const toggleBlock = async () => {
    if (!user || !profile) return;
    if (isBlocked) {
      setIsBlocked(false);
      await (supabase.from("blocks" as any).delete().eq("blocker_id", user.id).eq("blocked_id", profile.user_id) as any);
      toast.success("Unblocked");
    } else {
      setIsBlocked(true);
      const { error } = await (supabase.from("blocks" as any).insert({ blocker_id: user.id, blocked_id: profile.user_id } as any) as any);
      if (error) {
        setIsBlocked(false);
        toast.error(error.message);
      } else {
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
      if (error) {
        setIsMuted(false);
        toast.error(error.message);
      } else toast.success("Muted");
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
      if (error) {
        setIsFollowing(false);
        toast.error(error.message);
      }
    }
  };
  const openDM = async () => {
    if (!user || !profile) return;
    const { data, error } = await supabase.rpc("start_dm", { other_user_id: profile.user_id });
    if (error) {
      toast.error(error.message || "Could not start chat");
      return;
    }
    if (data) nav(`/messages/${data}`);
  };
  const shareProfile = async () => {
    const url = `${window.location.origin}/u/${profile?.username}`;
    try {
      if (navigator.share) await navigator.share({ title: profile?.display_name || profile?.username, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied");
      }
    } catch {
      /* ignore */
    }
  };
  const togglePin = async (p: FeedPost) => {
    const next = !(p as any).is_pinned;
    const { error } = await supabase.rpc("toggle_post_pin" as any, { _post_id: p.id, _pin: next });
    if (error) {
      toast.error(error.message || "Failed");
      return;
    }
    toast.success(next ? "Pinned" : "Unpinned");
    setPosts((prev) => {
      const updated = prev.map((x) =>
        x.id === p.id ? ({ ...x, is_pinned: next, pinned_at: next ? new Date().toISOString() : null } as any) : x,
      );
      return updated.sort((a: any, b: any) => {
        const ap = a.is_pinned ? 1 : 0;
        const bp = b.is_pinned ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return +new Date(b.created_at) - +new Date(a.created_at);
      });
    });
  };

  // ============ Render ============
  if (loading) {
    return (
      <div className="pb-10">
        <div className="h-14 border-b border-border" />
        <div className="aspect-[3/1] sm:aspect-[4/1] w-full bg-secondary/40 animate-pulse" />
        <div className="px-4 pt-16 space-y-3">
          <div className="h-6 w-40 rounded bg-secondary animate-pulse" />
          <div className="h-4 w-24 rounded bg-secondary animate-pulse" />
        </div>
      </div>
    );
  }
  if (!profile) {
    return (
      <EmptyState
        icon={Info}
        title="Profile not found"
        subtitle="This account may have been removed or the username is incorrect."
        size="lg"
      />
    );
  }

  const tabs: ProfileTabDef<Tab>[] = [
    { id: "posts", label: "Posts", icon: Grid3x3 },
    { id: "media", label: "Media", icon: Film },
    { id: "organizations", label: "Organizations", icon: Building2 },
    ...(isMe ? [{ id: "saved" as Tab, label: "Saved", icon: Bookmark }] : []),
    { id: "tagged" as Tab, label: "Tagged", icon: TagIcon },
    { id: "about" as Tab, label: "About", icon: Info },
  ];

  const stats: ProfileStat[] = [
    { key: "posts", label: "Posts", value: profile.posts_count ?? 0 },
    { key: "followers", label: "Followers", value: profile.followers_count ?? 0, to: `/u/${profile.username}/followers` },
    { key: "following", label: "Following", value: profile.following_count ?? 0, to: `/u/${profile.username}/following` },
    { key: "orgs", label: "Orgs", value: memberships.length },
    { key: "projects", label: "Projects", value: 0 },
  ];

  const anyProfile = profile as any;

  return (
    <div className="pb-16">
      {/* Top bar */}
      <header className="sticky top-0 z-30 h-14 px-3 flex items-center justify-between gap-3 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => nav(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">
              {profile.display_name || profile.username}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {profile.posts_count ?? 0} posts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/notifications"
            className="relative p-2 rounded-full hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span aria-hidden className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
          </Link>
          {isMe && (
            <SideMenu
              trigger={
                <button
                  className="p-2 rounded-full hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              }
            />
          )}
        </div>
      </header>

      {/* Hero */}
      <ProfileHero
        coverUrl={profile.cover_url}
        avatarUrl={profile.avatar_url}
        displayName={profile.display_name || profile.username}
        username={profile.username}
        hasFounderGlow={!!profile.is_founder}
      />

      {/* Body */}
      <div className="px-4 sm:px-6 pt-16 sm:pt-20 max-w-3xl mx-auto space-y-5">
        <ProfileIdentity
          displayName={profile.display_name || profile.username}
          username={profile.username}
          verificationKind={profile.verification_kind}
          onVerificationClick={() => setVerifyOpen(true)}
          isFounder={!!profile.is_founder}
          bio={profile.bio}
          profession={anyProfile.profession ?? null}
          location={anyProfile.location ?? null}
          website={anyProfile.website ?? null}
          joinedAt={profile.created_at ?? null}
        />

        <ProfileStats stats={stats} />

        {isMe ? (
          <ProfileActions
            mode="self"
            editHref="/profile/edit"
            onShare={shareProfile}
            onInvite={shareProfile}
            isCreator={!!(me as any)?.is_creator}
            onBecomeCreator={() => setBecomeOpen(true)}
          />
        ) : (
          <ProfileActions
            mode="visitor"
            isFollowing={isFollowing}
            isMuted={isMuted}
            isBlocked={isBlocked}
            onFollowToggle={toggleFollow}
            onMessage={openDM}
            onShare={shareProfile}
            onMute={toggleMute}
            onBlock={toggleBlock}
            onReport={() => setReportOpen(true)}
            username={profile.username}
          />
        )}

        {/* Highlights */}
        <HighlightsRail userId={profile.user_id} isMe={!!isMe} />
      </div>

      {/* Tabs (sticky under top bar) */}
      <div className="max-w-3xl mx-auto mt-4">
        <ProfileTabs tabs={tabs} value={tab} onChange={setTab} stickyTop={56} />

        {/* Panels */}
        <div className="px-4 sm:px-6 pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
            >
              {tab === "posts" && (
                contentLoading ? (
                  <PostGridSkeleton count={9} />
                ) : (
                  <PostGrid
                    posts={posts}
                    isMe={!!isMe}
                    onTogglePin={togglePin}
                    emptyLabel="No posts yet."
                  />
                )
              )}
              {tab === "media" && (
                contentLoading ? (
                  <PostGridSkeleton count={9} aspect="portrait" />
                ) : (
                  <PostGrid
                    posts={reels}
                    aspect="portrait"
                    emptyLabel="No media yet."
                  />
                )
              )}
              {tab === "organizations" && (
                <OrganizationsSection memberships={memberships} variant="full" className="py-2" />
              )}
              {tab === "saved" && (
                <div className={cn("divide-y divide-border pb-6", !saved.length && "divide-y-0")}>
                  {saved.length === 0 ? (
                    <EmptyState icon={Bookmark} title="Nothing saved yet" subtitle="Posts you save will appear here." size="sm" />
                  ) : (
                    saved.map((p) => <PostCard key={p.id} post={p} onOpenComments={setCommentPost} />)
                  )}
                </div>
              )}
              {tab === "tagged" && (
                <EmptyState icon={TagIcon} title="No tagged posts" subtitle="Posts you're tagged in will show up here." />
              )}
              {tab === "about" && (
                <ProfileAbout
                  bio={profile.bio}
                  profession={anyProfile.profession ?? null}
                  location={anyProfile.location ?? null}
                  website={anyProfile.website ?? null}
                  joinedAt={profile.created_at ?? null}
                  auraRank={profile.aura_rank ?? null}
                  contributionScore={profile.contribution_score ?? null}
                  tier={profile.tier ?? null}
                  interests={profile.interests ?? null}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Sheets */}
      <CommentSheet
        postId={commentPost}
        open={!!commentPost}
        onOpenChange={(b) => !b && setCommentPost(null)}
      />
      <ReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetKind="profile"
        targetId={profile?.user_id ?? null}
      />
      <BecomeCreatorSheet open={becomeOpen} onOpenChange={setBecomeOpen} />
      <VerificationSheet
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        kind={profile.verification_kind}
        verified={!!profile.verified}
        verifiedSince={profile.created_at ?? null}
        verifiedBy="Aurelix Trust & Safety"
        verificationId={profile.user_id.slice(0, 8).toUpperCase()}
        reason={profile.founder_title ?? null}
        displayName={profile.display_name || profile.username}
        username={profile.username}
        organizations={memberships}
      />
    </div>
  );
};

export default Profile;
