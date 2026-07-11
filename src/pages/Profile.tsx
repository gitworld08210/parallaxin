import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Check,
  Flag,
  Info,
  Link as LinkIcon,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Share2,
  UserPlus,
  VolumeX,
  Bookmark,
  Tag as TagIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { PostCard, type FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { ReportSheet } from "@/components/social/ReportSheet";
import { BecomeCreatorSheet } from "@/components/creator/BecomeCreatorSheet";
import { EmptyState } from "@/components/empty/EmptyState";

import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { OrgLogoCard } from "@/components/profile/OrgLogoCard";
import { StickyTabs } from "@/components/profile/StickyTabs";
import { VerificationSheet } from "@/components/profile/VerificationSheet";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { useUserOrganizations } from "@/hooks/organization/useUserOrganizations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmt, gradientFor, initialsOf } from "@/lib/format";

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
  created_at?: string | null;
};

type Tab = "posts" | "media" | "organizations" | "about";

const formatJoined = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : null;

const Profile = () => {
  const { username } = useParams();
  const { user, profile: me } = useAuth();
  const nav = useNavigate();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [reels, setReels] = useState<FeedPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
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
        return a.name.localeCompare(b.name);
      }),
    [rawMemberships],
  );

  const isMe = !username || (me && username === me.username);
  const anyProfile = profile as any;
  const websiteRaw: string | null = anyProfile?.website ?? null;
  const locationRaw: string | null = anyProfile?.location ?? null;
  const joined = formatJoined(profile?.created_at);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const target = username || me?.username;
      if (!target) {
        setLoading(false);
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
        const { data: pdata } = await supabase
          .from("posts")
          .select(sel)
          .eq("user_id", p.user_id)
          .eq("is_reel", false)
          .order("created_at", { ascending: false });
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
        setPosts(
          ((pdata ?? []) as any[])
            .sort((a, b) => {
              const ap = a.is_pinned ? 1 : 0;
              const bp = b.is_pinned ? 1 : 0;
              if (ap !== bp) return bp - ap;
              return +new Date(b.created_at) - +new Date(a.created_at);
            })
            .map((d: any) => ({ ...d, liked: liked.has(d.id) })),
        );
        setReels((rdata ?? []).map((d: any) => ({ ...d, liked: liked.has(d.id) })));

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

  // ============ Render ============
  if (loading) {
    return (
      <div className="pb-10">
        <div className="h-14 border-b border-border" />
        <div className="h-56 sm:h-72 w-full bg-secondary/40 animate-pulse" />
        <div className="px-4 -mt-14 space-y-3">
          <div className="h-28 w-28 rounded-full bg-secondary animate-pulse ring-4 ring-background" />
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "posts", label: "Posts" },
    { id: "media", label: "Media" },
    { id: "organizations", label: "Organizations" },
    { id: "about", label: "About" },
  ];

  const displayName = profile.display_name || profile.username;
  const websiteHref = websiteRaw
    ? websiteRaw.startsWith("http")
      ? websiteRaw
      : `https://${websiteRaw}`
    : null;
  const websiteLabel = websiteRaw ? websiteRaw.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;

  return (
    <div className="pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-30 h-14 px-3 flex items-center gap-3 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 border-b border-border">
        <button
          onClick={() => nav(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight truncate">{displayName}</p>
          <p className="text-[11px] text-muted-foreground truncate">{fmt(profile.posts_count ?? 0)} posts</p>
        </div>
      </header>

      {/* Cover */}
      <div className="relative w-full h-56 sm:h-72 bg-secondary overflow-hidden">
        {profile.cover_url ? (
          <img src={profile.cover_url} alt="" className="h-full w-full object-cover" loading="eager" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(135deg, ${gradientFor(profile.username)})` }}
          />
        )}
      </div>

      {/* Header block */}
      <div className="px-4 sm:px-6 max-w-3xl mx-auto">
        {/* Avatar + actions row */}
        <div className="flex items-end justify-between -mt-14 sm:-mt-16">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative rounded-full ring-4 ring-background bg-background"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover"
              />
            ) : (
              <div
                className="h-28 w-28 sm:h-32 sm:w-32 rounded-full grid place-items-center text-2xl font-display font-semibold text-foreground"
                style={{ backgroundImage: gradientFor(profile.username) }}
              >
                {initialsOf(displayName)}
              </div>
            )}
            {profile.is_founder && (
              <span aria-hidden className="absolute inset-0 rounded-full aura-ring pointer-events-none" />
            )}
          </motion.div>

          <div className="flex items-center gap-2 pt-14 sm:pt-16">
            {isMe ? (
              <>
                <IconBtn label="Share profile" onClick={shareProfile}>
                  <Share2 className="h-4 w-4" />
                </IconBtn>
                <Link
                  to="/profile/edit"
                  className="inline-flex items-center h-9 px-4 rounded-full border border-border bg-background text-sm font-semibold hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 duration-fast"
                >
                  Edit profile
                </Link>
              </>
            ) : (
              <>
                <IconBtn label="More actions" asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        aria-label="More actions"
                        className="grid place-items-center h-9 w-9 rounded-full border border-border bg-background hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-2xl">
                      <DropdownMenuItem onClick={toggleMute} className="gap-2">
                        <VolumeX className="h-4 w-4" /> {isMuted ? "Unmute" : "Mute"} @{profile.username}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setReportOpen(true)} className="gap-2 text-destructive focus:text-destructive">
                        <Flag className="h-4 w-4" /> Report @{profile.username}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={toggleBlock} className="gap-2 text-destructive focus:text-destructive">
                        <Ban className="h-4 w-4" /> {isBlocked ? "Unblock" : "Block"} @{profile.username}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </IconBtn>
                <IconBtn label="Share profile" onClick={shareProfile}>
                  <Share2 className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Message" onClick={openDM}>
                  <MessageCircle className="h-4 w-4" />
                </IconBtn>
                <button
                  type="button"
                  onClick={toggleFollow}
                  aria-pressed={isFollowing}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold transition-all duration-fast ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                    isFollowing
                      ? "bg-background text-foreground border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 group"
                      : "bg-foreground text-background hover:opacity-90",
                  )}
                >
                  {isFollowing ? (
                    <>
                      <Check className="h-4 w-4 group-hover:hidden" />
                      <span className="group-hover:hidden">Following</span>
                      <span className="hidden group-hover:inline">Unfollow</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Identity */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
              {displayName}
            </h1>
            {profile.verified && profile.verification_kind && (
              <button
                type="button"
                onClick={() => setVerifyOpen(true)}
                aria-label="View verification details"
                className="inline-flex items-center justify-center rounded-full p-0.5 -m-0.5 hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 duration-fast"
              >
                <VerificationBadge kind={profile.verification_kind} className="h-5 w-5" />
              </button>
            )}
            {/* Affiliation chip — X-style, opens verification sheet */}
            {memberships.filter((m) => m.verified).slice(0, 1).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setVerifyOpen(true)}
                aria-label={`Affiliated with ${m.name}`}
                title={`Affiliated with ${m.name}`}
                className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-border bg-secondary/60 hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 duration-fast overflow-hidden ml-0.5"
              >
                {m.logo_url ? (
                  <img src={m.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold">{m.name.slice(0, 1)}</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground -mt-1">@{profile.username}</p>

          {profile.bio && (
            <p className="text-[15px] leading-snug whitespace-pre-wrap pt-1">{profile.bio}</p>
          )}

          {(locationRaw || websiteHref || joined) && (
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground pt-1">
              {locationRaw && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {locationRaw}
                </span>
              )}
              {websiteHref && (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  {websiteLabel}
                </a>
              )}
              {joined && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Joined {joined}
                </span>
              )}
            </div>
          )}

          {/* Affiliated organizations */}
          {/* Affiliated organizations */}
          {memberships.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-1.5">
                Affiliated with ({memberships.length})
              </p>
              <div className="-mx-1 flex gap-2 overflow-x-auto no-scrollbar" aria-label="Affiliated organizations">
                {memberships.slice(0, 8).map((m) => (
                  <OrgLogoCard key={m.id} membership={m} className="first:ml-1 last:mr-1" />
                ))}
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-5 pt-2 text-[13px]">
            <Link to={`/u/${profile.username}/followers`} className="hover:underline">
              <span className="font-bold text-foreground">{fmt(profile.followers_count ?? 0)}</span>{" "}
              <span className="text-muted-foreground">Followers</span>
            </Link>
            <Link to={`/u/${profile.username}/following`} className="hover:underline">
              <span className="font-bold text-foreground">{fmt(profile.following_count ?? 0)}</span>{" "}
              <span className="text-muted-foreground">Following</span>
            </Link>
            <button onClick={() => setTab("posts")} className="hover:underline">
              <span className="font-bold text-foreground">{fmt(profile.posts_count ?? 0)}</span>{" "}
              <span className="text-muted-foreground">Posts</span>
            </button>
            <button onClick={() => setTab("organizations")} className="hover:underline">
              <span className="font-bold text-foreground">{fmt(memberships.length)}</span>{" "}
              <span className="text-muted-foreground">Orgs</span>
            </button>
          </div>

          {/* Primary CTA */}
          <div className="pt-3">
            {isMe && !(me as any)?.is_creator ? (
              <button
                type="button"
                onClick={() => setBecomeOpen(true)}
                className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:brightness-110 transition-all duration-fast ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
              >
                Become a creator
              </button>
            ) : isMe ? (
              <Link
                to="/profile/edit"
                className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:brightness-110 transition-all duration-fast ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] inline-flex items-center justify-center"
              >
                Edit profile
              </Link>
            ) : (
              <button
                type="button"
                onClick={isFollowing ? openDM : toggleFollow}
                className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:brightness-110 transition-all duration-fast ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
              >
                {isFollowing ? "Send a message" : `Follow @${profile.username}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky tabs */}
      <div className="max-w-3xl mx-auto mt-4">
        <StickyTabs<Tab> tabs={tabs} value={tab} onChange={setTab} stickyTop={56} />

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
              <div className="divide-y divide-border">
                {posts.length === 0 ? (
                  <EmptyState icon={Info} title="No posts yet" subtitle="When posts are published, they'll appear here." size="sm" />
                ) : (
                  posts.map((p) => <PostCard key={p.id} post={p} onOpenComments={setCommentPost} />)
                )}
              </div>
            )}

            {tab === "media" && (
              <div className="divide-y divide-border">
                {reels.length === 0 ? (
                  <EmptyState icon={TagIcon} title="No media yet" subtitle="Reels and media posts will appear here." size="sm" />
                ) : (
                  reels.map((p) => <PostCard key={p.id} post={p} onOpenComments={setCommentPost} />)
                )}
              </div>
            )}

            {tab === "organizations" && (
              <div className="px-4 py-4">
                {memberships.length === 0 ? (
                  <EmptyState icon={Bookmark} title="No organizations" subtitle="Organizations this person is part of will show here." size="sm" />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {memberships.map((m) => (
                      <OrgLogoCard key={m.id} membership={m} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "about" && (
              <div className="px-4 py-5 space-y-4 text-sm">
                {profile.bio ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
                ) : (
                  <p className="text-muted-foreground">No bio yet.</p>
                )}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {locationRaw && <AboutField label="Location" value={locationRaw} />}
                  {websiteHref && <AboutField label="Website" value={websiteLabel!} href={websiteHref} />}
                  {joined && <AboutField label="Joined" value={joined} />}
                </dl>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
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
        displayName={displayName}
        verificationKind={profile.verification_kind}
        memberships={memberships}
        joined={joined}
        verificationId={`AX-${profile.user_id.slice(0, 8).toUpperCase()}`}
      />
    </div>
  );
};

const IconBtn = ({
  label,
  onClick,
  children,
  asChild,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  asChild?: boolean;
}) => {
  if (asChild) return <>{children}</>;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid place-items-center h-9 w-9 rounded-full border border-border bg-background hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 duration-fast"
    >
      {children}
    </button>
  );
};

const AboutField = ({ label, value, href }: { label: string; value: string; href?: string }) => (
  <div className="rounded-xl border border-border bg-card/50 px-3 py-2">
    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="text-sm font-medium mt-0.5 truncate">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">
          {value}
        </a>
      ) : (
        value
      )}
    </dd>
  </div>
);

export default Profile;
