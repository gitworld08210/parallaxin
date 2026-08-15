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
  User,
  UserPlus,
  VolumeX,
  Bookmark,
  Tag as TagIcon,
  X as XIcon,
  Heart,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { PostCard, type FeedPost } from "@/components/social/PostCard";
import { CommentSheet } from "@/components/social/CommentSheet";
import { ReportSheet } from "@/components/social/ReportSheet";
import { BecomeCreatorSheet } from "@/components/creator/BecomeCreatorSheet";
import { SubscribeButton } from "@/components/creator/SubscribeButton";
import { EmptyState } from "@/components/empty/EmptyState";
import { SideMenu } from "@/components/layout/SideMenu";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
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

import { collection, query, where, orderBy, getDocs, limit, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useAuth } from "@/contexts/AuthProvider";
import { useUserOrganizations } from "@/hooks/organization/useUserOrganizations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmt, gradientFor, initialsOf } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

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

type Tab = "posts" | "replies" | "media" | "likes";

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
  const [coverPreviewOpen, setCoverPreviewOpen] = useState(false);

  const { memberships: rawMemberships } = useUserOrganizations(profile?.user_id ?? null);
  const memberships = useMemo(
    () =>
      [...rawMemberships].sort((a, b) => {
        if (a.is_owner !== b.is_owner) return a.is_owner ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [rawMemberships]);

  const isMe = !username || (me && username === me.username);
  const anyProfile = profile as any;
  const websiteRaw: string | null = anyProfile?.website ?? null;
  const locationRaw: string | null = anyProfile?.location ?? null;
  const joined = formatJoined(profile?.created_at);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const target = username || me?.username || user?.uid;
      if (!target) {
        setLoading(false);
        return;
      }
      
      let p: any = null;

      // 1. Try resolving as UID directly
      try {
        const profDoc = await getDoc(doc(db, "profiles", target));
        if (profDoc.exists()) {
          p = { id: profDoc.id, ...profDoc.data() };
        }
      } catch (err) {
        console.warn("UID resolution failed:", err);
      }

      // 1b. If UID resolution fails but it looks like a UID, don't stop yet
      if (!p && target.length > 20) {
         try {
           const qId = query(collection(db, "profiles"), where("user_id", "==", target), limit(1));
           const snapId = await getDocs(qId);
           if (!snapId.empty) {
             p = { id: snapId.docs[0].id, ...snapId.docs[0].data() };
           }
         } catch (e) {}
      }

      // 2. Try resolving via "usernames" mapping collection
      if (!p) {
        try {
          const nameDoc = await getDoc(doc(db, "usernames", target.toLowerCase()));
          if (nameDoc.exists()) {
            const resolvedUid = nameDoc.data().user_id || nameDoc.data().uid;
            const profDoc = await getDoc(doc(db, "profiles", resolvedUid));
            if (profDoc.exists()) {
              p = { id: profDoc.id, ...profDoc.data() };
            }
          }
        } catch (err) {
          console.warn("Username mapping resolution failed:", err);
        }
      }

      // 3. Fallback: query profiles collection by username field
      if (!p) {
        try {
          const qProf = query(
            collection(db, "profiles"),
            where("username", "==", target),
            limit(1)
          );
          const snapProf = await getDocs(qProf);
          if (!snapProf.empty) {
            p = { id: snapProf.docs[0].id, ...snapProf.docs[0].data() };
          }
        } catch (err) {
          console.warn("Username query resolution failed:", err);
        }
      }
      
      // 4. Final Fallback: query by user_id field
      if (!p) {
        try {
          const qId = query(
            collection(db, "profiles"),
            where("user_id", "==", target),
            limit(1)
          );
          const snapId = await getDocs(qId);
          if (!snapId.empty) {
            p = { id: snapId.docs[0].id, ...snapId.docs[0].data() };
          }
        } catch (err) {
          console.warn("ID field query resolution failed:", err);
        }
      }
      
      if (p) {
        setProfile({
          ...p,
          user_id: p.user_id || p.id
        } as ProfileRow);
      } else {
        setProfile(null);
      }
      setLoading(false);

      if (p) {
        const userId = p.user_id || p.id;
        const qPosts = query(
          collection(db, "posts"),
          where("user_id", "==", userId),
          where("is_reel", "==", false),
          orderBy("created_at", "desc"),
          limit(10)
        );
        const qReels = query(
          collection(db, "posts"),
          where("user_id", "==", userId),
          where("is_reel", "==", true),
          orderBy("created_at", "desc"),
          limit(8)
        );

        const [snapPosts, snapReels] = await Promise.all([
          getDocs(qPosts),
          getDocs(qReels)
        ]);

        const pdata = snapPosts.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const rdata = snapReels.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let liked = new Set<string>();
        const allIds = [...(pdata ?? []), ...(rdata ?? [])].map((d: any) => d.id);
        if (user && allIds.length) {
          const lSnap = await getDocs(query(collection(db, "likes"), where("user_id", "==", user.uid), where("post_id", "in", allIds)));
          liked = new Set(lSnap.docs.map(doc => doc.data().post_id));
        }
        setPosts(
          ((pdata ?? []) as any[])
            .sort((a, b) => {
              const ap = a.is_pinned ? 1 : 0;
              const bp = b.is_pinned ? 1 : 0;
              if (ap !== bp) return bp - ap;
              return +new Date(b.created_at) - +new Date(a.created_at);
            })
            .map((d: any) => ({ ...d, liked: liked.has(d.id) })));
        setReels((rdata ?? []).map((d: any) => ({ ...d, liked: liked.has(d.id) })));

        if (user && userId !== user.uid) {
          const followSnap = await getDocs(query(collection(db, "follows"), where("follower_id", "==", user.uid), where("following_id", "==", userId), limit(1)));
          setIsFollowing(!followSnap.empty);
          
          const blockSnap = await getDocs(query(collection(db, "blocks"), where("blocker_id", "==", user.uid), where("blocked_id", "==", userId), limit(1)));
          setIsBlocked(!blockSnap.empty);

          const muteSnap = await getDocs(query(collection(db, "mutes"), where("muter_id", "==", user.uid), where("muted_id", "==", userId), limit(1)));
          setIsMuted(!muteSnap.empty);
        }
      }
    })();
  }, [username, me?.username, user?.uid]);

  // ============ Mutations ============
  const toggleBlock = async () => {
    if (!user || !profile) return;
    const { doc, setDoc, deleteDoc } = await import("firebase/firestore");
    const blockId = `${user.uid}_${profile.user_id}`;
    if (isBlocked) {
      await deleteDoc(doc(db, "blocks", blockId));
      setIsBlocked(false);
      toast.success("Unblocked");
    } else {
      setIsBlocked(true);
      try {
        await setDoc(doc(db, "blocks", blockId), {
          blocker_id: user.uid,
          blocked_id: profile.user_id,
          created_at: new Date().toISOString()
        });
        toast.success("Blocked");
      } catch (e: any) {
        setIsBlocked(false);
        toast.error(e.message);
      }
    }
  };
  const toggleMute = async () => {
    if (!user || !profile) return;
    const { doc, setDoc, deleteDoc } = await import("firebase/firestore");
    const muteId = `${user.uid}_${profile.user_id}`;
    if (isMuted) {
      await deleteDoc(doc(db, "mutes", muteId));
      setIsMuted(false);
      toast.success("Unmuted");
    } else {
      setIsMuted(true);
      try {
        await setDoc(doc(db, "mutes", muteId), {
          muter_id: user.uid,
          muted_id: profile.user_id,
          created_at: new Date().toISOString()
        });
        toast.success("Muted");
      } catch (e: any) {
        setIsMuted(false);
        toast.error(e.message);
      }
    }
  };
  const toggleFollow = async () => {
    if (!user || !profile) return;
    const { doc, setDoc, deleteDoc, serverTimestamp } = await import("firebase/firestore");
    const followId = `${user.uid}_${profile.user_id}`;
    if (isFollowing) {
      setIsFollowing(false);
      await deleteDoc(doc(db, "follows", followId));
    } else {
      setIsFollowing(true);
      try {
        await setDoc(doc(db, "follows", followId), {
          follower_id: user.uid,
          following_id: profile.user_id,
          created_at: serverTimestamp()
        });
      } catch (e: any) {
        setIsFollowing(false);
        toast.error(e.message);
      }
    }
  };
  const openDM = async () => {
    if (!user || !profile) return;
    const { data, error } = await supabase.rpc("get_or_create_dm" as any, { _user1: user.uid, _user2: profile.user_id } as any);
    if (error) {
      toast.error(error.message || "Could not start chat");
      return;
    }
    if (data) nav(`/messages/${data}`);
  };
  const shareProfile = async () => {
    const url = `${window.location.origin}/u/${profile?.username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: profile?.username, url });
      } else {
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
      <div className="min-h-screen bg-black">
        <div className="h-14 border-b border-white/5" />
        <div className="h-[180px] w-full bg-zinc-900 animate-pulse" />
        <div className="px-4 -mt-10 space-y-3">
          <div className="h-20 w-20 rounded-full bg-zinc-800 animate-pulse ring-4 ring-black" />
          <div className="h-5 w-32 rounded bg-zinc-800 animate-pulse mt-3" />
          <div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!profile && !loading) {
    if (isMe) {
      return (
        <div className="pb-24 flex flex-col items-center justify-center min-h-[60vh] px-6 text-center bg-black">
          <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <User className="h-10 w-10 text-white/60" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Complete your profile</h2>
          <p className="text-zinc-500 text-sm mb-8 max-w-[280px]">
            You haven't finished setting up your profile yet. Let others know who you are!
          </p>
          <Link
            to="/profile-creation"
            className="h-12 px-8 rounded-full bg-white text-black font-bold flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all"
          >
            Setup Profile
          </Link>
        </div>
      );
    }

    return (
      <div className="pb-24 bg-black min-h-screen">
        <header className="sticky top-0 z-30 h-14 px-3 flex items-center gap-3 bg-black/85 backdrop-blur-xl border-b border-white/5">
          <button
            onClick={() => nav(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <p className="text-base font-bold text-white leading-tight truncate">Profile</p>
        </header>
        <EmptyState
          icon={Info}
          title="Profile not found"
          subtitle={`The user "@${username || 'user'}" could not be found. They may have changed their username or deleted their account.`}
          size="lg"
        />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "posts", label: "Posts" },
    { id: "replies", label: "Replies" },
    { id: "media", label: "Media" },
    { id: "likes", label: "Likes" },
  ];

  const displayName = profile.display_name || profile.username;
  const websiteHref = websiteRaw
    ? websiteRaw.startsWith("http")
      ? websiteRaw
      : `https://${websiteRaw}`
    : null;
  const websiteLabel = websiteRaw ? websiteRaw.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Top nav bar - X style */}
      <header className="sticky top-0 z-30 h-14 px-4 flex items-center gap-4 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <button
          onClick={() => nav(-1)}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-white truncate">{displayName}</p>
          <p className="text-xs text-zinc-500">{fmt(profile.posts_count ?? 0)} posts</p>
        </div>
      </header>

      {/* Cover banner - full width, ~180px */}
      <div className="relative w-full h-[180px] bg-zinc-900 overflow-hidden">
        <button
          type="button"
          onClick={() => profile.cover_url && setCoverPreviewOpen(true)}
          aria-label={profile.cover_url ? "View banner" : "Banner"}
          className="absolute inset-0 w-full h-full block focus:outline-none"
          disabled={!profile.cover_url}
        >
          {profile.cover_url ? (
            <img src={profile.cover_url} alt="" className="h-full w-full object-cover" loading="eager" />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: `linear-gradient(135deg, ${gradientFor(profile.username)})` }}
            />
          )}
        </button>
      </div>

      {/* Full-screen banner preview */}
      <AnimatePresence>
        {coverPreviewOpen && profile.cover_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCoverPreviewOpen(false)}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm grid place-items-center p-4"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setCoverPreviewOpen(false)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white grid place-items-center hover:bg-white/20"
            >
              <XIcon className="h-5 w-5" />
            </button>
            <motion.img
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              src={profile.cover_url}
              alt="Banner"
              className="max-w-full max-h-full rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile header section */}
      <div className="px-4">
        {/* Avatar + Action buttons row */}
        <div className="flex items-end justify-between -mt-10 relative z-10">
          {/* Large circular avatar overlapping banner */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-20 w-20 rounded-full object-cover ring-4 ring-black"
              />
            ) : (
              <div
                className="h-20 w-20 rounded-full grid place-items-center text-lg font-bold text-white ring-4 ring-black"
                style={{ backgroundImage: gradientFor(profile.username) }}
              >
                {initialsOf(displayName)}
              </div>
            )}
          </motion.div>

          {/* Action buttons - right side */}
          <div className="flex items-center gap-2 pb-1">
            {isMe ? (
              <Link
                to="/profile/edit"
                className="inline-flex items-center h-9 px-4 rounded-full border border-white/20 text-white text-sm font-bold hover:bg-white/10 transition-colors active:scale-95"
              >
                Edit profile
              </Link>
            ) : (
              <>
                {/* More options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-9 w-9 rounded-full border border-white/20 grid place-items-center hover:bg-white/10 transition-colors"
                      aria-label="More options"
                    >
                      <MoreHorizontal className="h-4 w-4 text-white" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-black border-white/10 rounded-xl">
                    <DropdownMenuItem onClick={shareProfile} className="gap-2 text-white">
                      <Share2 className="h-4 w-4" /> Share profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleMute} className="gap-2 text-white">
                      <VolumeX className="h-4 w-4" /> {isMuted ? "Unmute" : "Mute"} @{profile.username}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setReportOpen(true)} className="gap-2 text-rose-500 focus:text-rose-500">
                      <Flag className="h-4 w-4" /> Report @{profile.username}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleBlock} className="gap-2 text-rose-500 focus:text-rose-500">
                      <Ban className="h-4 w-4" /> {isBlocked ? "Unblock" : "Block"} @{profile.username}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Message button */}
                <button
                  onClick={openDM}
                  className="h-9 w-9 rounded-full border border-white/20 grid place-items-center hover:bg-white/10 transition-colors"
                  aria-label="Message"
                >
                  <MessageCircle className="h-4 w-4 text-white" />
                </button>

                {/* Follow button */}
                <button
                  type="button"
                  onClick={toggleFollow}
                  aria-pressed={isFollowing}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-9 px-5 rounded-full text-sm font-bold transition-all active:scale-95",
                    isFollowing
                      ? "bg-transparent border border-white/20 text-white hover:border-rose-500/50 hover:text-rose-500 group"
                      : "bg-white text-black hover:bg-white/90",
                  )}
                >
                  {isFollowing ? (
                    <>
                      <span className="group-hover:hidden">Following</span>
                      <span className="hidden group-hover:inline">Unfollow</span>
                    </>
                  ) : (
                    <span>Follow</span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Display name + verification + username */}
        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-white leading-tight">
              {displayName}
            </h1>
            {profile.verified && profile.verification_kind && (
              <button
                type="button"
                onClick={() => setVerifyOpen(true)}
                aria-label="View verification details"
                className="inline-flex items-center justify-center hover:opacity-80 transition-opacity active:scale-90"
              >
                <VerificationBadge kind={profile.verification_kind} className="h-5 w-5" />
              </button>
            )}
          </div>
          <p className="text-[15px] text-zinc-500 mt-0.5">@{profile.username}</p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-[15px] text-white leading-relaxed mt-3 whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}

        {/* Location, link, joined row */}
        {(locationRaw || websiteHref || joined) && (
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[14px] text-zinc-500">
            {locationRaw && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {locationRaw}
              </span>
            )}
            {websiteHref && (
              <a
                href={websiteHref}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-blue-400 hover:underline"
              >
                <LinkIcon className="h-4 w-4" />
                {websiteLabel}
              </a>
            )}
            {joined && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                Joined {joined}
              </span>
            )}
          </div>
        )}

        {/* Following / Followers counts */}
        <div className="flex items-center gap-5 mt-3 text-[14px]">
          <Link to={`/u/${profile.username}/following`} className="hover:underline">
            <span className="font-bold text-white">{fmt(profile.following_count ?? 0)}</span>{" "}
            <span className="text-zinc-500">Following</span>
          </Link>
          <Link to={`/u/${profile.username}/followers`} className="hover:underline">
            <span className="font-bold text-white">{fmt(profile.followers_count ?? 0)}</span>{" "}
            <span className="text-zinc-500">Followers</span>
          </Link>
        </div>
      </div>

      {/* Tabs: Posts / Replies / Media / Likes */}
      <div className="mt-4">
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
              <div className="divide-y divide-white/5">
                {posts.length === 0 ? (
                  <EmptyState icon={Info} title="No posts yet" subtitle="When posts are published, they'll appear here." size="sm" />
                ) : (
                  posts.map((p) => <PostCard key={p.id} post={p} onOpenComments={setCommentPost} />)
                )}
              </div>
            )}

            {tab === "replies" && (
              <div className="divide-y divide-white/5">
                <EmptyState icon={MessageCircle} title="No replies yet" subtitle="Replies to other posts will appear here." size="sm" />
              </div>
            )}

            {tab === "media" && (
              <div className="divide-y divide-white/5">
                {reels.length === 0 ? (
                  <EmptyState icon={TagIcon} title="No media yet" subtitle="Photos and videos will appear here." size="sm" />
                ) : (
                  reels.map((p) => <PostCard key={p.id} post={p} onOpenComments={setCommentPost} />)
                )}
              </div>
            )}

            {tab === "likes" && (
              <div className="divide-y divide-white/5">
                <EmptyState icon={Heart} title="No likes yet" subtitle="Posts this user liked will appear here." size="sm" />
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
        verificationId={`PX-${profile.user_id.slice(0, 8).toUpperCase()}`}
      />
    </div>
  );
};

export default Profile;
