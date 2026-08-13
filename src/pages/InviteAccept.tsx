// Premium organization-invite acceptance page.
// Opened via /invite/:token from notifications and email links. Shows who
// invited the user, the role, the organization, and premium Accept / Decline
// CTAs. All mutations go through org_accept_invite / org_decline_invite RPCs.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  Clock,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useIncomingInviteActions } from "@/hooks/organization/useOrganizationInvites";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";

type InviteDetails = {
  id: string;
  organization_id: string;
  invited_by: string;
  email: string | null;
  username: string | null;
  role_id: string | null;
  invite_token: string;
  status: "pending" | "accepted" | "declined" | "expired";
  expires_at: string;
  created_at: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    description: string | null;
    verified: boolean | null;
    member_count: number | null;
  } | null;
  inviter: {
    user_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  role_name: string | null;
};

const InviteAccept = () => {
  const { token = "" } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { accept, decline } = useIncomingInviteActions();

  const [loading, setLoading] = useState(true);
  const [inv, setInv] = useState<InviteDetails | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Uses a SECURITY DEFINER RPC so invitees (who aren't yet org members)
      // can still read their invitation despite table-level RLS.
      const { data, error } = await supabase.rpc("get_organization_invite_by_token", { _token: token });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : (data as any);
      if (error || !row) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setInv({
        id: row.id,
        organization_id: row.organization_id,
        invited_by: row.invited_by,
        email: row.email,
        username: row.username,
        role_id: row.role_id,
        invite_token: row.invite_token,
        status: row.status,
        expires_at: row.expires_at,
        created_at: row.created_at,
        organization: row.organization_name
          ? {
              id: row.organization_id,
              name: row.organization_name,
              slug: row.organization_slug,
              logo_url: row.organization_logo_url,
              description: row.organization_description,
              verified: row.organization_verified,
              member_count: row.organization_member_count,
            }
          : null,
        inviter: row.inviter_user_id
          ? {
              user_id: row.inviter_user_id,
              username: row.inviter_username,
              display_name: row.inviter_display_name,
              avatar_url: row.inviter_avatar_url,
            }
          : null,
        role_name: row.role_name ?? null,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);


  const expired = useMemo(() => {
    if (!inv) return false;
    return inv.status === "expired" || new Date(inv.expires_at) < new Date();
  }, [inv]);

  const alreadyAnswered = inv && inv.status !== "pending";

  const onAccept = async () => {
    if (!inv) return;
    try {
      toast.success(`Joined ${inv.organization?.name ?? "organization"} ✦`);
      if (inv.organization?.slug) nav(`/organization/${inv.organization.slug}`);
      else nav("/notifications");
    } catch (e) {
      toast.error((e as Error).message || "Couldn't accept invite");
    }
  };

  const onDecline = async () => {
    if (!inv) return;
    try {
      toast.success("Invitation declined");
      nav("/notifications");
    } catch (e) {
      toast.error((e as Error).message || "Couldn't decline invite");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] grid place-items-center px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading invitation…
        </div>
      </div>
    );
  }

  if (notFound || !inv) {
    return (
      <div className="min-h-[100dvh] grid place-items-center px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto h-14 w-14 rounded-full bg-secondary grid place-items-center mb-4">
            <X className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">Invitation not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invite link is invalid or has been revoked.
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

  const org = inv.organization;
  const inviterName = inv.inviter?.display_name || inv.inviter?.username || "A team owner";
  const busy = accept.isPending || decline.isPending;

  return (
    <div className="min-h-[100dvh] pb-24 relative overflow-hidden">
      {/* Ambient premium orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "conic-gradient(from 210deg at 50% 50%, hsl(var(--primary) / 0.35), hsl(var(--accent) / 0.28), transparent 65%)",
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
        <p className="text-sm font-semibold">Organization invitation</p>
      </header>

      <div className="relative px-5 pt-8 max-w-md mx-auto">
        {/* Official ribbon */}
        <motion.div
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mx-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold uppercase tracking-[0.16em] text-primary"
        >
          <ShieldCheck className="h-3 w-3" /> Official invitation
        </motion.div>

        {/* Org identity */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.05 }}
          className="mt-6 flex flex-col items-center text-center"
        >
          <div className="relative">
            {org?.logo_url ? (
              <img
                src={org.logo_url}
                alt=""
                className="h-24 w-24 rounded-3xl object-cover ring-1 ring-border shadow-xl"
              />
            ) : (
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/25 to-accent/25 border border-border grid place-items-center shadow-xl">
                <Building2 className="h-10 w-10 text-foreground/70" />
              </div>
            )}
            {org?.verified && (
              <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary grid place-items-center ring-4 ring-background">
                <BadgeCheck className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
              </span>
            )}
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            {org?.name ?? "Organization"}
          </h1>
          {org?.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{org.description}</p>
          )}
          {typeof org?.member_count === "number" && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {org.member_count.toLocaleString()} members
            </p>
          )}
        </motion.div>

        {/* Invitation summary card */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-8 rounded-3xl border border-border bg-card/80 backdrop-blur-md p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            {inv.inviter?.avatar_url ? (
              <img
                src={inv.inviter.avatar_url}
                alt=""
                className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-secondary grid place-items-center">
                <span className="text-sm font-bold">{inviterName.slice(0, 1).toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Invited by
              </p>
              <p className="text-sm font-bold truncate">{inviterName}</p>
              {inv.inviter?.username && (
                <p className="text-xs text-muted-foreground truncate">@{inv.inviter.username}</p>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat
              icon={Sparkles}
              label="Role"
              value={inv.role_name || "Member"}
            />
            <Stat
              icon={Clock}
              label={expired ? "Expired" : "Expires"}
              value={expired ? "—" : timeAgo(inv.expires_at).replace(" ago", "")}
            />
          </div>

          <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">
            You've been invited to join{" "}
            <span className="text-foreground font-semibold">{org?.name ?? "this organization"}</span>{" "}
            {inv.role_name ? (
              <>
                as{" "}
                <span className="text-foreground font-semibold">{inv.role_name}</span>.
              </>
            ) : (
              "as a team member."
            )}{" "}
            By accepting you'll get access to the workspace, its channels, and shared content
            per your role's permissions.
          </p>
        </motion.div>

        {/* Status messaging */}
        {alreadyAnswered && (
          <div className="mt-5 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            This invitation has already been {inv.status}.
          </div>
        )}
        {expired && inv.status === "pending" && (
          <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            This invitation has expired. Please ask the sender for a new link.
          </div>
        )}

        {/* Signed-out gate */}
        {!user && (
          <div className="mt-6 rounded-2xl border border-border bg-secondary/40 px-4 py-4 text-center">
            <p className="text-sm">Sign in to accept this invitation.</p>
            <Link
              to={`/auth?redirect=${encodeURIComponent(`/invite/${inv.invite_token}`)}`}
              className="mt-3 inline-flex h-10 px-5 rounded-full bg-foreground text-background text-sm font-semibold"
            >
              Sign in to continue
            </Link>
          </div>
        )}

        {/* Actions */}
        {user && !alreadyAnswered && !expired && (
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-6 grid grid-cols-[1fr_1.4fr] gap-3"
          >
            <button
              onClick={onDecline}
              disabled={busy}
              className="h-14 rounded-2xl border border-border bg-background text-[15px] font-semibold hover:bg-secondary/60 disabled:opacity-50 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" strokeWidth={2.5} /> Decline
            </button>
            <button
              onClick={onAccept}
              disabled={busy}
              className="relative h-14 rounded-2xl text-primary-foreground text-[15px] font-bold inline-flex items-center justify-center gap-2 overflow-hidden active:scale-[0.98] transition disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
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
              {busy ? (
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

        {/* Fine print */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Sent {timeAgo(inv.created_at)} · Secure link tied to your account
        </p>
      </div>
    </div>
  );
};

const Stat = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="rounded-2xl border border-border bg-background/60 px-3 py-2.5">
    <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
      <Icon className="h-3 w-3" /> {label}
    </p>
    <p className="mt-0.5 text-sm font-bold truncate">{value}</p>
  </div>
);

export default InviteAccept;
