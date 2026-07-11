import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, UserPlus, Mail, Bell, BadgeCheck, Crown, SlidersHorizontal, Users, Building2, Check, X } from "lucide-react";
import { CollabInviteSheet } from "@/components/social/CollabInviteSheet";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { EmptyState } from "@/components/empty/EmptyState";
import { supabase } from "@/integrations/supabase/client";
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
  actor: { username: string; display_name: string; avatar_url: string | null } | null;
};

const iconFor = (t: string) =>
  t === "like" ? Heart :
  t === "comment" ? MessageCircle :
  t === "follow" ? UserPlus :
  t === "collab_invite" || t === "collab_accepted" ? Users :
  t === "verification_approved" || t === "verification_revoked" ? BadgeCheck :
  t === "founder_inducted" || t === "founder_revoked" ? Crown :
  t.startsWith("affiliation_") ? Building2 :
  Mail;

const textFor = (t: string) =>
  t === "like" ? "liked your post." :
  t === "comment" ? "commented on your post." :
  t === "follow" ? "started following you." :
  t === "mention" ? "mentioned you in a post." :
  t === "collab_invite" ? "invited you to collaborate on a post." :
  t === "collab_accepted" ? "accepted your collab invite." :
  t === "verification_approved" ? "Your account has been verified." :
  t === "verification_revoked" ? "Your verification has been removed." :
  t === "founder_inducted" ? "Welcome to the Hall of Founders." :
  t === "founder_revoked" ? "Your founder status has been updated." :
  t === "affiliation_invite" ? "invited you to an official role." :
  t === "affiliation_accepted" ? "accepted your affiliation invite." :
  t === "affiliation_declined" ? "declined your affiliation invite." :
  t === "affiliation_revoked" ? "Your affiliation has been revoked." :
  "sent you a message.";

const isSystem = (t: string) => t.startsWith("verification_") || t.startsWith("founder_") || t === "affiliation_revoked";

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

  // Organization invites (org invitation flow — replaces legacy affiliations).
  const { invites: pendingInvites } = useIncomingInvites();
  const { accept: acceptInvite, decline: declineInvite } = useIncomingInviteActions();

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
      const { data } = await supabase
        .from("notifications")
        .select("id, type, read, created_at, actor_id, post_id, actor:profiles!notifications_actor_profile_fkey(username, display_name, avatar_url)")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(80);
      setItems((data ?? []) as any);
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
      // Incoming organization invites are loaded via useIncomingInvites().
    })();

    const ch = supabase.channel(`notif:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const n = payload.new as any;
          let actor = null;
          if (n.actor_id) {
            const { data } = await supabase.from("profiles").select("username, display_name, avatar_url").eq("user_id", n.actor_id).maybeSingle();
            actor = data;
          }
          setItems((prev) => [{ ...n, actor }, ...prev]);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const groups = useMemo(() => {
    const g: Record<"today" | "yesterday" | "earlier", N[]> = { today: [], yesterday: [], earlier: [] };
    items.forEach((n) => g[bucketOf(n.created_at)].push(n));
    return g;
  }, [items]);

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
      return (
        <button key={n.id} onClick={() => setCollabOpen(true)} className={cls}>{inner}</button>
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
          <div className="mt-3 mx-1 space-y-2">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="rounded-2xl border border-primary/40 bg-primary/5 p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary grid place-items-center">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">
                      {inv.inviter?.display_name || inv.inviter?.username || "Someone"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      invited you to join an organization
                      {inv.role_name ? ` as ${inv.role_name}` : ""}.
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => respondInvite(inv.invite_token, true)}
                    disabled={acceptInvite.isPending || declineInvite.isPending}
                    className="h-8 w-8 grid place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                    aria-label="Accept"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => respondInvite(inv.invite_token, false)}
                    disabled={acceptInvite.isPending || declineInvite.isPending}
                    className="h-8 w-8 grid place-items-center rounded-full bg-secondary border border-border disabled:opacity-50"
                    aria-label="Decline"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {items.length === 0 && pendingInvites.length === 0 ? (
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
