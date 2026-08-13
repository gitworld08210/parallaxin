import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, UserPlus, Mail, Bell, BadgeCheck, Crown, SlidersHorizontal, Users, Building2, Check, X } from "lucide-react";
import { CollabInviteSheet } from "@/components/social/CollabInviteSheet";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { EmptyState } from "@/components/empty/EmptyState";

import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import {
  useIncomingInvites,
  useIncomingInviteActions,
} from "@/hooks/organization/useOrganizationInvites";

type N = {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  actor_id: string | null;
  post_id: string | null;
  organization_id: string | null;
  actor: { username: string; display_name: string; avatar_url: string | null } | null;
};

const iconFor = (t: string) =>
  t === "like" ? Heart :
  t === "comment" ? MessageCircle :
  t === "follow" ? UserPlus :
  t === "collab_invite" || t === "collab_accepted" ? Users :
  t === "verification_approved" || t === "verification_revoked" ? BadgeCheck :
  t === "founder_inducted" || t === "founder_revoked" ? Crown :
  t.startsWith("org_") || t === "organization_invite" || t.startsWith("affiliation_") ? Building2 :
  Mail;

const textFor = (t: string) =>
  t === "like" ? "liked your post." :
  t === "comment" ? "commented on your post." :
  t === "follow" ? "started following you." :
  t === "mention" ? "mentioned you in a post." :
  t === "collab_invite" ? "invited you to collaborate on a post." :
  t === "collab_accepted" ? "accepted your collab invite." :
  t === "organization_invite" ? "invited you to join their organization." :
  t === "affiliation_invite" ? "invited you to affiliate with their organization." :
  t === "affiliation_accepted" ? "accepted your affiliation." :
  t === "affiliation_revoked" ? "revoked your affiliation." :
  t === "verification_approved" ? "Your account has been verified." :
  t === "verification_revoked" ? "Your verification has been removed." :
  t === "founder_inducted" ? "Welcome to the Hall of Founders." :
  t === "founder_revoked" ? "Your founder status has been updated." :
  "sent you a message.";


const isSystem = (t: string) => t.startsWith("verification_") || t.startsWith("founder_");

const bucketOf = (iso: string): "today" | "yesterday" | "earlier" => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "today";
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "yesterday";
  return "earlier";
};

const Notifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [collabOpen, setCollabOpen] = useState(false);

  const nav = useNavigate();

  // Organization invites (join-workspace flow).
  const { invites: pendingInvites } = useIncomingInvites();
  const { accept: acceptInvite, decline: declineInvite } = useIncomingInviteActions();

  const openInvite = async (organizationId: string | null) => {
    if (!organizationId) {
      toast.error("Invitation not found");
      return;
    }
    // Prefer the cached pending list; fall back to a direct lookup so this
    // works even when the useIncomingInvites hook missed the row.
    const cached = pendingInvites.find(
      (i: any) => (i.organization_id || i.organization?.id) === organizationId,
    );
    let token = (cached as any)?.invite_token as string | undefined;
    if (!token) {
      // Fall back to the SECURITY DEFINER RPC — works for invitees who aren't
      // yet org members (base-table SELECT is scoped to members).
        "list_incoming_organization_invites" as any,
      );
      const rows = (data ?? []) as any[];
      const match = rows.find((r) => r.organization_id === organizationId);
      token = match?.invite_token;
    }

    if (!token) {
      toast.info("This invitation is no longer available.");
      return;
    }
    nav(`/invite/${token}`);
  };


  const respondInvite = async (token: string, accept: boolean) => {
    try {
      if (accept) {
        await acceptInvite.mutateAsync({ token });
        toast.success("Joined organization ✦");
      } else {
        await declineInvite.mutateAsync({ token });
        toast.success("Declined");
      }
    } catch (e) {
      toast.error((e as Error).message || "Something went wrong");
    }
  };


  useEffect(() => {
    if (!user) return;
    (async () => {
        .from("notifications")
        .select("id, type, read, created_at, actor_id, post_id, organization_id, actor:profiles!notifications_actor_profile_fkey(username, display_name, avatar_url)")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(80);
      setItems((data ?? []) as any);
      // Incoming organization invites are loaded via useIncomingInvites().
    })();

      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const n = payload.new as any;
          let actor = null;
          if (n.actor_id) {
            actor = data;
          }
          setItems((prev) => [{ ...n, actor }, ...prev]);
        })
      .subscribe();
  }, [user?.id]);

  const visibleItems = useMemo(
    // Org invite rows are surfaced via the dedicated pending-invite banner
    // (with accept/decline). Hide the duplicate generic notification row so
    // the official banner is the single CTA.
    () => items.filter((n) => !n.type.startsWith("org_invite") && n.type !== "org_invited"),
    [items],
  );

  // Map organization_id -> pending invite_token for quick row->accept-page routing.
  const inviteTokenByOrg = useMemo(() => {
    const m: Record<string, string> = {};
    pendingInvites.forEach((inv: any) => {
      const oid = inv.organization_id || inv.organization?.id;
      if (oid && inv.invite_token) m[oid] = inv.invite_token;
    });
    return m;
  }, [pendingInvites]);


  const groups = useMemo(() => {
    const g: Record<"today" | "yesterday" | "earlier", N[]> = { today: [], yesterday: [], earlier: [] };
    visibleItems.forEach((n) => g[bucketOf(n.created_at)].push(n));
    return g;
  }, [visibleItems]);

  const renderRow = (n: N) => {
    const Icon = iconFor(n.type);
    const system = isSystem(n.type);
    const inner = (
      <>
        <div className="relative shrink-0">
          {system ? (
            <div className="h-11 w-11 rounded-full bg-gradient-primary grid place-items-center shadow-glow">
              <Icon className="h-5 w-5 text-primary-foreground" />
            </div>
          ) : n.actor?.avatar_url ? (
            <img src={n.actor.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <AuraAvatar gradient={gradientFor(n.actor?.username)} size="md" initials={initialsOf(n.actor?.display_name || n.actor?.username)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">
            {system ? (
              <span className="font-semibold">{textFor(n.type)}</span>
            ) : (
              <>
                <span className="font-semibold">{n.actor?.display_name || n.actor?.username || "Someone"}</span>{" "}
                <span className="text-muted-foreground">{textFor(n.type)}</span>
              </>
            )}{" "}
            <span className="text-muted-foreground text-xs">· {timeAgo(n.created_at)}</span>
          </p>
        </div>
        {!n.read && <span className="h-2 w-2 rounded-full bg-primary shadow-glow shrink-0" />}
      </>
    );
    const cls = "flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-muted/40 transition-colors w-full text-left";
    if (n.type === "collab_invite") {
      // Open the dedicated celebration/accept page when we have the post id;
      // fall back to the legacy sheet only if the notification is missing it.
      if (n.post_id) {
        return (
          <Link to={`/collab/${n.post_id}`} key={n.id} className={cls}>{inner}</Link>
        );
      }
      return (
        <button key={n.id} onClick={() => setCollabOpen(true)} className={cls}>{inner}</button>
      );
    }
    if (n.type === "organization_invite" || n.type === "affiliation_invite") {
      return (
        <button
          key={n.id}
          onClick={() => openInvite(n.organization_id)}
          className={cls}
        >
          {inner}
        </button>
      );
    }

    const to = system
      ? (n.type.startsWith("founder_") ? "/hall-of-founders" : "/profile")
      : n.post_id ? `/p/${n.post_id}` : n.actor ? `/u/${n.actor.username}` : null;
    return to ? (
      <Link to={to} key={n.id} className={cls}>{inner}</Link>
    ) : (
      <div key={n.id} className={cls}>{inner}</div>
    );
  };

  const Section = ({ label, list }: { label: string; list: N[] }) =>
    list.length === 0 ? null : (
      <div className="mt-2">
        <p className="px-3 pt-3 pb-1 text-sm font-semibold text-foreground/90">{label}</p>
        <div className="space-y-0.5">{list.map(renderRow)}</div>
      </div>
    );

  return (
    <div>
      <header className="h-14 px-5 flex items-center justify-between border-b border-border">
        <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
        <button className="h-10 w-10 rounded-full grid place-items-center hover:bg-muted/40 transition-colors" aria-label="Filter">
          <SlidersHorizontal className="h-5 w-5 text-foreground" />
        </button>
      </header>

      <div className="px-2 pb-8">
        {pendingInvites.length > 0 && (
          <div className="mt-3 mx-1 space-y-3">
            <p className="px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Pending invitations
            </p>
            {pendingInvites.map((inv) => {
              const orgName = (inv as any).organization?.name || (inv as any).org_name || "an organization";
              const orgLogo = (inv as any).organization?.logo_url || (inv as any).org_logo_url || null;
              const inviterName = inv.inviter?.display_name || inv.inviter?.username || "Someone";
              return (
                <Link
                  to={`/invite/${inv.invite_token}`}
                  key={inv.id}
                  className="group relative block rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-background to-background overflow-hidden shadow-sm hover:shadow-md hover:border-primary/50 transition"
                >
                  {/* Official ribbon */}
                  <div className="flex items-center justify-between gap-1.5 px-4 py-1.5 bg-primary/10 border-b border-primary/20">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                        Organization invitation
                      </span>
                    </span>
                    <span className="text-[10px] font-semibold text-primary/80 group-hover:translate-x-0.5 transition-transform">
                      Review →
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        {orgLogo ? (
                          <img src={orgLogo} alt="" className="h-12 w-12 rounded-xl object-cover ring-1 ring-border" />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-secondary grid place-items-center ring-1 ring-border">
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary grid place-items-center ring-2 ring-background">
                          <BadgeCheck className="h-3 w-3 text-primary-foreground" strokeWidth={2.5} />
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold leading-tight truncate">{orgName}</p>
                        <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                          <span className="text-foreground font-medium">{inviterName}</span> invited you to join
                          {inv.role_name ? (
                            <> as <span className="text-foreground font-semibold">{inv.role_name}</span></>
                          ) : null}.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); respondInvite(inv.invite_token, false); }}
                        disabled={acceptInvite.isPending || declineInvite.isPending}
                        className="flex-1 h-10 rounded-full border border-border bg-background text-sm font-semibold hover:bg-secondary/60 disabled:opacity-50 active:scale-[0.98] transition"
                      >
                        Decline
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); respondInvite(inv.invite_token, true); }}
                        disabled={acceptInvite.isPending || declineInvite.isPending}
                        className="flex-1 h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98] transition shadow-sm"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                        Accept
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {visibleItems.length === 0 && pendingInvites.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nothing new yet"
            subtitle="Likes, comments, follows, and mentions will show up here."
          />
        ) : (
          <>
            <Section label="Today" list={groups.today} />
            <Section label="Yesterday" list={groups.yesterday} />
            <Section label="Earlier" list={groups.earlier} />
          </>
        )}
      </div>
      <CollabInviteSheet open={collabOpen} onOpenChange={setCollabOpen} />
    </div>
  );
};

export default Notifications;
