import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Star } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";

type Row = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

const CloseFriends = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [following, setFollowing] = useState<Row[]>([]);
  const [closeSet, setCloseSet] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: f } = await supabase.from("follows").select("following_id").eq("follower_id", user.uid);
      const ids = (f ?? []).map((x: any) => x.following_id);
      let rows: Row[] = [];
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", ids);
        rows = (ps ?? []) as Row[];
      }
      setFollowing(rows);
      const { data: cf } = await supabase.from("close_friends" as any).select("friend_id").eq("owner_id", user.uid);
      setCloseSet(new Set((cf ?? []).map((x: any) => x.friend_id)));
      setLoading(false);
    })();
  }, [user?.uid]);

  const toggle = async (uid: string) => {
    if (!user) return;
    const has = closeSet.has(uid);
    const next = new Set(closeSet);
    if (has) {
      next.delete(uid); setCloseSet(next);
      await supabase.from("close_friends" as any).delete().eq("owner_id", user.uid).eq("friend_id", uid);
    } else {
      next.add(uid); setCloseSet(next);
      const { error } = await supabase.from("close_friends" as any).insert({ owner_id: user.uid, friend_id: uid } as any);
      if (error) { const x = new Set(next); x.delete(uid); setCloseSet(x); toast.error(error.message); }
    }
  };


  const term = q.trim().toLowerCase();
  const visible = term
    ? following.filter((r) => r.username.toLowerCase().includes(term) || (r.display_name || "").toLowerCase().includes(term))
    : following;

  return (
    <div>
      <header className="h-14 px-2 flex items-center gap-2 border-b border-border">
        <button onClick={() => nav(-1)} className="p-1" aria-label="Back">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
        <h1 className="text-base font-semibold flex-1">Close friends</h1>
        <span className="text-xs text-muted-foreground pr-2">{closeSet.size} selected</span>
      </header>

      <div className="px-4 py-3 text-sm text-muted-foreground">
        People you add here can see stories you share with Close Friends. We won't notify them.
      </div>

      <div className="px-3 pb-3">
        <div className="bg-muted rounded-lg flex items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <ul>
        {loading && <p className="text-sm text-muted-foreground text-center py-10">Loading…</p>}
        {!loading && visible.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No matches.</p>}
        {visible.map((r) => {
          const has = closeSet.has(r.user_id);
          return (
            <li key={r.user_id}>
              <button onClick={() => toggle(r.user_id)} className="w-full flex items-center gap-3 px-3 py-2.5 active:bg-secondary">
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <AuraAvatar gradient={gradientFor(r.username)} size="md" initials={initialsOf(r.display_name || r.username)} />
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold truncate">{r.display_name || r.username}</p>
                  <p className="text-xs text-muted-foreground truncate">@{r.username}</p>
                </div>
                <span className={`h-6 w-6 rounded-full border-2 grid place-items-center ${has ? "bg-emerald-500 border-emerald-500" : "border-border"}`}>
                  {has && <Star className="h-3.5 w-3.5 text-white fill-white" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CloseFriends;
