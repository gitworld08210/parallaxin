import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Camera,
  Check,
  Flag,
  Info,
  Link as LinkIcon,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Sparkles,
  User,
  UserPlus,
  VolumeX,
  Bookmark,
  Tag as TagIcon,
  X as XIcon,
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
      
      console.log("Resolving profile for:", target);
      
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

      // 2. Try resolving via "usernames" mapping collection (most efficient for handle lookup)
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
  if (!profile && !loading) {
    if (isMe) {
      return (
        <div className="pb-24 flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <User className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-black mb-2">Complete your profile</h2>
          <p className="text-zinc-500 text-sm mb-8 max-w-[280px]">
            You haven't finished setting up your profile yet. Let others know who you are!
          </p>
          <Link
            to="/profile-creation"
            className="h-12 px-8 rounded-full bg-primary text-white font-bold flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            Setup Profile
          </Link>
        </div>
      );
    }

    return (
      <div className="pb-24">
        <header className="sticky top-0 z-30 h-14 px-3 flex items-center gap-3 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 border-b border-border">
          <button
            onClick={() => nav(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight truncate">Profile</p>
          </div>
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
      <header className="sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-black/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => nav(-1)}
            className="p-1 rounded-full hover:bg-secondary/60 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight truncate">{displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SideMenu 
            trigger={
              <button className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-white/10">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <AuraAvatar gradient={gradientFor(profile.username)} initials={initialsOf(displayName)} />
                )}
              </button>
            }
          />
          <IconBtn label="Share" onClick={shareProfile}>
            <Share2 className="h-6 w-6" />
          </IconBtn>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1"><MoreHorizontal className="h-6 w-6" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[#111] border-white/10">
              <DropdownMenuItem onClick={shareProfile} className="gap-2">
                <Share2 className="h-4 w-4" /> Share profile
              </DropdownMenuItem>
              {!isMe && (
                <>
                  <DropdownMenuItem onClick={toggleMute} className="gap-2">
                    <VolumeX className="h-4 w-4" /> {isMuted ? "Unmute" : "Mute"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleBlock} className="gap-2 text-rose-500 focus:text-rose-500">
                    <Ban className="h-4 w-4" /> {isBlocked ? "Unblock" : "Block"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Cover */}
      <div className="relative w-full h-32 sm:h-44 bg-secondary overflow-hidden group">
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
        {isMe && (
          <Link
            to="/profile/edit"
            aria-label={profile.cover_url ? "Change banner" : "Add banner"}
            className="absolute bottom-2 right-2 h-9 px-3 rounded-full bg-black/55 text-white text-xs font-semibold backdrop-blur-md inline-flex items-center gap-1.5 hover:bg-black/70 transition-colors active:scale-95"
          >
            <Camera className="h-3.5 w-3.5" />
            {profile.cover_url ? "Edit banner" : "Add banner"}
          </Link>
        )}
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

      {/* Header block */}
      <div className="px-4 pt-4">
        {/* Avatar + actions row */}
        <div className="flex items-start justify-between">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative rounded-full ring-2 ring-background bg-background -mt-16 z-10"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div
                className="h-24 w-24 rounded-full grid place-items-center text-xl font-display font-semibold text-foreground"
                style={{ backgroundImage: gradientFor(profile.username) }}
              >
                {initialsOf(displayName)}
              </div>
            )}
            {profile.is_founder && (
              <span aria-hidden className="absolute inset-0 rounded-full aura-ring pointer-events-none" />
            )}
          </motion.div>

          <div className="flex items-center gap-2 mt-2">
            {isMe ? (
              <>
                <IconBtn label="Share profile" onClick={shareProfile}>
                  <Share2 className="h-4 w-4" />
                </IconBtn>
                {(profile as any)?.is_creator && (
                  <Link
                    to="/creator/studio"
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Sparkles className="h-4 w-4" /> Studio
                  </Link>
                )}
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
                <SubscribeButton creatorId={profile.user_id} creatorName={profile.username} />
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
