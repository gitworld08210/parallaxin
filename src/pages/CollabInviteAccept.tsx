import { supabase } from "@/integrations/supabase/client";
// CollabInviteAccept — celebratory page shown when a user taps a collab invite
// notification. Displays a 🎉 congratulations header, the inviter's identity
// and description, a preview of the post, and premium Accept / Decline CTAs.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Loader2,
  PartyPopper,
  Sparkles,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";

type Post = {
  id: string;
  content: string | null;
  media_url: string | null;
  user_id: string;
  created_at: string;
};
type Author = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  verified: boolean | null;
  verification_kind: string | null;
};
type CollabRow = {
  status: "pending" | "accepted" | "declined";
  invited_at: string;
  responded_at: string | null;
};

const CollabInviteAccept = () => {
  const { postId = "" } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [row, setRow] = useState<CollabRow | null>(null);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      setLoading(true);
      const [{ data: postData }, { data: rowData }] = await Promise.all([
          supabase.from("posts").select("id, content, media_url, user_id, created_at").eq("id", postId).maybeSingle(),
          supabase.from("post_collaborators" as any).select("status, invited_at, responded_at").eq("post_id", postId).eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (!postData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPost(postData as any);
      setRow((rowData as any) ?? null);
      const { data: authorData } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url, bio, verified, verification_kind").eq("user_id", (postData as any).user_id).maybeSingle();
      if (!cancelled) setAuthor((authorData as any) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, user?.id]);

  const respond = async (status: "accepted" | "declined") => {
    if (!user) return;
    setBusy(status === "accepted" ? "accept" : "decline");
    const { error } = await supabase.from("post_collaborators" as any).update({ status, responded_at: new Date().toISOString() } as any).eq("post_id", postId).eq("user_id", user.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    if (status === "accepted") {
      toast.success("You're now a collaborator ✦");
      nav(`/p/${postId}`);
    } else {
      toast.success("Invitation declined");
      nav("/notifications");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] grid place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-[100dvh] grid place-items-center px-6 text-center">
        <div>
          <div className="mx-auto h-14 w-14 rounded-full bg-secondary grid place-items-center mb-3">
            <X className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">Invitation not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This collab invite is no longer available.
          </p>
          <Link
            to="/notifications"
            className="mt-6 inline-flex h-10 px-5 rounded-full bg-foreground text-background text-sm font-semibold"
          >
            Back to notifications
          </Link>
        </div>
      </div>
    );
  }

  const name = author?.display_name || author?.username || "A creator";
  const alreadyAnswered = row && row.status !== "pending";

  return (
    <div className="min-h-[100dvh] pb-24 relative overflow-hidden">
      {/* Ambient celebratory orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[560px] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "conic-gradient(from 200deg at 50% 50%, hsl(var(--primary) / 0.35), hsl(45 100% 60% / 0.28), hsl(var(--accent) / 0.28), transparent 65%)",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-20 h-14 px-3 flex items-center gap-2 bg-background/70 backdrop-blur-xl border-b border-border/60">
        <button
          onClick={() => nav(-1)}
          aria-label="Back"
          className="h-10 w-10 grid place-items-center rounded-full hover:bg-secondary/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold">Collab invitation</p>
      </header>

      <div className="relative px-5 pt-8 max-w-md mx-auto">
        {/* 🎉 Celebration */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: -8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, -6, 6, 0] }}
            transition={{ duration: 1.2, delay: 0.3, repeat: Infinity, repeatDelay: 3 }}
            className="text-6xl leading-none"
          >
            🎉
          </motion.div>
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            <PartyPopper className="h-3 w-3" /> Congratulations
          </div>
          <h1 className="mt-4 text-[26px] font-extrabold tracking-tight leading-tight">
            You've been invited to
            <br />
            collaborate!
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            <span className="text-foreground font-semibold">{name}</span> wants you as a co-creator
            on their post. Accept to appear as a collaborator and share the reach.
          </p>
        </motion.div>

        {/* Inviter card */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-8 rounded-3xl border border-border bg-card/80 backdrop-blur-md p-5 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <Link to={author ? `/u/${author.username}` : "#"} className="shrink-0">
              {author?.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/25 to-accent/25 grid place-items-center">
                  <span className="text-lg font-bold">{name.slice(0, 1).toUpperCase()}</span>
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Invited by
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[15px] font-bold truncate">
                {name}
                {author?.verified && (
                  <BadgeCheck className="h-4 w-4 text-primary" strokeWidth={2.5} />
                )}
              </p>
              {author?.username && (
                <p className="text-xs text-muted-foreground truncate">@{author.username}</p>
              )}
            </div>
          </div>

          {author?.bio && (
            <div className="mt-4 rounded-2xl bg-secondary/40 border border-border px-3.5 py-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                What they do
              </p>
              <p className="text-[13px] leading-relaxed">{author.bio}</p>
            </div>
          )}

          {/* Post preview */}
          <div className="mt-4 rounded-2xl border border-border overflow-hidden bg-background/60">
            {post.media_url ? (
              <img src={post.media_url} alt="" className="w-full aspect-video object-cover" />
            ) : (
              <div className="w-full aspect-video bg-gradient-to-br from-primary/15 to-accent/15 grid place-items-center">
                <Sparkles className="h-8 w-8 text-primary/60" />
              </div>
            )}
            {post.content && (
              <p className="px-4 py-3 text-[13px] leading-snug line-clamp-3">{post.content}</p>
            )}
          </div>
        </motion.div>

        {alreadyAnswered && (
          <div className="mt-5 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground text-center">
            You've already {row!.status} this invitation.
          </div>
        )}

        {/* Actions */}
        {!alreadyAnswered && (
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-6 grid grid-cols-[1fr_1.4fr] gap-3"
          >
            <button
              onClick={() => respond("declined")}
              disabled={busy !== null}
              className="h-14 rounded-2xl border border-border bg-background text-[15px] font-semibold hover:bg-secondary/60 disabled:opacity-50 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
            >
              {busy === "decline" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="h-4 w-4" strokeWidth={2.5} /> Decline
                </>
              )}
            </button>
            <button
              onClick={() => respond("accepted")}
              disabled={busy !== null}
              className="relative h-14 rounded-2xl text-primary-foreground text-[15px] font-bold inline-flex items-center justify-center gap-2 overflow-hidden active:scale-[0.98] transition disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                boxShadow: "0 10px 30px -10px hsl(var(--primary) / 0.55)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 opacity-40"
                style={{
                  background:
                    "radial-gradient(120% 60% at 50% 0%, hsl(0 0% 100% / 0.35), transparent 60%)",
                }}
              />
              {busy === "accept" ? (
                <Loader2 className="h-5 w-5 animate-spin relative" />
              ) : (
                <>
                  <Check className="h-5 w-5 relative" strokeWidth={2.75} />
                  <span className="relative">Accept invitation</span>
                </>
              )}
            </button>
          </motion.div>
        )}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Accepting adds you as an official collaborator on this post.
        </p>
      </div>
    </div>
  );
};

export default CollabInviteAccept;
