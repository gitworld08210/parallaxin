import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Heart, MessageCircle, UserPlus, Mail, Bell, BadgeCheck, Crown } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { EmptyState } from "@/components/empty/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf, timeAgo } from "@/lib/format";

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
  t === "verification_approved" || t === "verification_revoked" ? BadgeCheck :
  t === "founder_inducted" || t === "founder_revoked" ? Crown :
  Mail;

const textFor = (t: string) =>
  t === "like" ? "liked your post" :
  t === "comment" ? "commented on your post" :
  t === "follow" ? "started following you" :
  t === "mention" ? "mentioned you" :
  t === "verification_approved" ? "Your account has been verified" :
  t === "verification_revoked" ? "Your verification has been removed" :
  t === "founder_inducted" ? "Welcome to the Hall of Founders" :
  t === "founder_revoked" ? "Your founder status has been updated" :
  "sent you a message";

const isSystem = (t: string) => t.startsWith("verification_") || t.startsWith("founder_");

const Notifications = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<N[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, read, created_at, actor_id, post_id, actor:profiles!notifications_actor_profile_fkey(username, display_name, avatar_url)")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(80);
      setItems((data ?? []) as any);
      // mark all read
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
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

  return (
    <div>
      <TopBar
        subtitle="Activity"
        title="Notifications"
        right={
          <button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center">
            <ChevronLeft className="h-5 w-5" />
          </button>
        }
      />
      <div className="px-5 space-y-1 pb-6">
        {items.length === 0 && (
          <EmptyState
            icon={Bell}
            title="Nothing new yet"
            subtitle="Likes, comments, follows, and mentions will show up here."
          />
        )}
        {items.map((n) => {
          const Icon = iconFor(n.type);
          const system = isSystem(n.type);
          const inner = (
            <>
              <div className="relative">
                {system ? (
                  <div className="h-12 w-12 rounded-full bg-gradient-primary grid place-items-center">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                ) : n.actor?.avatar_url ? (
                  <img src={n.actor.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <AuraAvatar gradient={gradientFor(n.actor?.username)} size="md" initials={initialsOf(n.actor?.display_name || n.actor?.username)} />
                )}
                {!system && (
                  <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-primary grid place-items-center shadow-glow">
                    <Icon className="h-3 w-3 text-primary-foreground" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  {system ? (
                    <span className="font-semibold">{textFor(n.type)}</span>
                  ) : (
                    <>
                      <span className="font-semibold">{n.actor?.display_name || n.actor?.username || "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{textFor(n.type)}</span>
                    </>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
              </div>
            </>
          );
          const cls = "flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-muted/40 transition-colors";
          const to = system
            ? (n.type.startsWith("founder_") ? "/hall-of-founders" : "/profile")
            : n.post_id ? `/p/${n.post_id}` : n.actor ? `/u/${n.actor.username}` : null;
          return to ? (
            <Link to={to} key={n.id} className={cls}>{inner}</Link>
          ) : (
            <div key={n.id} className={cls}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
