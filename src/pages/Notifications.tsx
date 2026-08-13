import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Heart, MessageCircle, UserPlus, Info, CheckCircle2, ChevronRight, X, UserCheck, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { IncomingInvitesList } from "@/components/organization/members/IncomingInvitesList";

const Notifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("notifications")
        .select("id, type, read, created_at, actor_id, post_id, organization_id, actor:profiles!notifications_actor_profile_fkey(username, display_name, avatar_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(80);
      setItems(data ?? []);
    };
    load();

    const channel = supabase.channel("public:notifications").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setItems(prev => [payload.new, ...prev]);
      }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const visibleItems = useMemo(
    () => items.filter((n) => !n.type.startsWith("org_invite") && n.type !== "org_invited"),
    [items]
  );

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
    setItems(items.map(i => ({ ...i, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setItems(items.map(i => i.id === id ? { ...i, read: true } : i));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <Heart className="h-4 w-4 text-red-500 fill-red-500" />;
      case "comment": return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "follow": return <UserPlus className="h-4 w-4 text-purple-500" />;
      case "post_mention": return <MessageCircle className="h-4 w-4 text-green-500" />;
      case "payout": return <CheckCircle2 className="h-4 w-4 text-amber-500" />;
      default: return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const getUrl = (n: any) => {
    if (n.post_id) return `/reels?id=${n.post_id}`;
    if (n.actor?.username) return `/profile/${n.actor.username}`;
    return "#";
  };

  if (!user) return null;

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Notifications</h1>
        {visibleItems.some(i => !i.read) && (
          <button onClick={markAllRead} className="text-xs font-semibold text-primary hover:underline">
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-4 mb-8">
        <IncomingInvitesList />
      </div>

      <div className="space-y-1">
        {visibleItems.length === 0 ? (
          <div className="py-20 text-center">
            <div className="h-16 w-16 bg-secondary/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          visibleItems.map((n) => (
            <Link
              key={n.id}
              to={getUrl(n)}
              onClick={() => markRead(n.id)}
              className={`flex items-start gap-4 p-4 rounded-2xl transition-colors ${n.read ? 'opacity-70 grayscale-[0.3]' : 'bg-secondary/20 shadow-sm border border-border/50'}`}
            >
              <div className="relative flex-shrink-0">
                <img src={n.actor?.avatar_url || "/placeholder.svg"} alt="" className="h-12 w-12 rounded-xl object-cover border border-border/50" />
                <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-background rounded-full border-2 border-background flex items-center justify-center shadow-sm">
                  {getIcon(n.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <p className="text-sm leading-snug">
                  <span className="font-bold">{n.actor?.display_name || n.actor?.username || "Someone"}</span>
                  {" "}
                  {n.type === "like" && "liked your post"}
                  {n.type === "comment" && "commented on your post"}
                  {n.type === "follow" && "started following you"}
                  {n.type === "post_mention" && "mentioned you in a post"}
                  {n.type === "payout" && "your payout was processed"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {!n.read && <div className="h-2 w-2 bg-primary rounded-full mt-2" />}
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;