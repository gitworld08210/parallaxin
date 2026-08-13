import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Bell, Heart, MessageCircle, UserPlus, Info, CheckCircle2, ChevronRight, X, UserCheck, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { IncomingInvitesList } from "@/components/organization/members/IncomingInvitesList";
import { cn } from "@/lib/utils";

const Notifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", user.id),
      orderBy("created_at", "desc"),
      limit(80)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user?.id]);

  const visibleItems = useMemo(
    () => items.filter((n) => !n.type.startsWith("org_invite") && n.type !== "org_invited"),
    [items]
  );

  const markAllRead = async () => {
    if (!user || !items.length) return;
    const unread = items.filter(i => !i.read);
    if (!unread.length) return;
    
    const batch = writeBatch(db);
    unread.forEach(item => {
      batch.update(doc(db, "notifications", item.id), { read: true });
    });
    await batch.commit();
  };

  const markRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
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
    <div className="pb-24 pt-0 min-h-screen">
      <header className="h-14 px-5 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-20">
        <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
        {visibleItems.some(i => !i.read) && (
          <button onClick={markAllRead} className="text-xs font-semibold text-primary hover:underline">
            Mark all read
          </button>
        )}
      </header>

      <div className="px-4 space-y-4 my-6">
        <IncomingInvitesList />
      </div>

      <div className="divide-y divide-white/5">
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
                className={cn(
                  "flex items-start gap-3 p-4 transition-colors",
                  !n.read ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"
                )}
              >
                <div className="relative shrink-0">
                  <img src={n.actor?.avatar_url || "/placeholder.svg"} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10" />
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