import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";

import { gradientFor, initialsOf, fmt } from "@/lib/format";

type P = { user_id: string; username: string; display_name: string; avatar_url: string | null; verified: boolean; verification_kind?: string | null; followers_count: number };

const FollowList = () => {
  const { username, kind = "followers" } = useParams();
  const nav = useNavigate();
  const [items, setItems] = useState<P[]>([]);

  useEffect(() => {
    (async () => {
      if (!username) return;
      const { data: prof } = await supabase.from("profiles").select("user_id").eq("username", username).maybeSingle();
      if (!prof) return;
      const col = kind === "following" ? "follower_id" : "following_id";
      const sel = kind === "following" ? "following_id" : "follower_id";
      const { data } = await supabase.from("follows").select(sel).eq(col, prof.user_id);
      const ids = (data ?? []).map((r: any) => r[sel]);
      if (ids.length === 0) { setItems([]); return; }
      const { data: profs } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url, verified, verification_kind, followers_count").in("user_id", ids);
      setItems((profs ?? []) as P[]);
    })();
  }, [username, kind]);

  return (
    <div>
      <TopBar
        subtitle={`@${username}`}
        title={kind === "following" ? "Following" : "Followers"}
        right={
          <button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center">
            <ChevronLeft className="h-5 w-5" />
          </button>
        }
      />
      <div className="px-5 space-y-2 pb-6">
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No one yet.</p>}
        {items.map((c) => (
          <Link to={`/u/${c.username}`} key={c.user_id} className="flex items-center gap-3 py-2">
            {c.avatar_url ? (
              <img src={c.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <AuraAvatar gradient={gradientFor(c.username)} size="md" initials={initialsOf(c.display_name || c.username)} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold truncate text-sm">{c.display_name || c.username}</p>
                {c.verification_kind ? <VerificationBadge kind={c.verification_kind as any} /> : c.verified && <VerificationBadge kind="verified" />}
              </div>
              <p className="text-xs text-muted-foreground">@{c.username} · {fmt(c.followers_count)} followers</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default FollowList;
