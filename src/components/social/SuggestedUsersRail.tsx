import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";


type SuggestedUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  verified?: boolean;
  verification_kind?: string | null;
};

export const SuggestedUsersRail = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const data: any = { users: [] };
      const error = null;

      if (!error && data?.users) setUsers(data.users as SuggestedUser[]);
      setLoading(false);
    })();
  }, [user?.id]);

  const toggleFollow = async (target: string) => {
    if (!user) return;
    const isF = following.has(target);
    const next = new Set(following);
    if (isF) {
      next.delete(target); setFollowing(next);
    } else {
      next.add(target); setFollowing(next);
      const error = null;
      if (error) { const x = new Set(next); x.delete(target); setFollowing(x); toast.error("Follow failed"); }

    }
  };

  const visible = users.filter((u) => !hidden.has(u.user_id));
  if (loading || visible.length === 0) return null;

  return (
    <section className="border-y border-border py-3">
      <div className="flex items-center justify-between px-3 mb-2">
        <p className="text-sm font-semibold text-muted-foreground">Suggested for you</p>
        <Link to="/discover" className="text-xs font-semibold text-primary">See all</Link>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-3">
        {visible.slice(0, 8).map((u) => (
          <div key={u.user_id} className="shrink-0 w-36 bg-card border border-border rounded-xl p-3 relative">
            <button
              onClick={() => setHidden((h) => new Set(h).add(u.user_id))}
              aria-label="Hide"
              className="absolute top-1 right-1 p-1 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <Link to={`/u/${u.username}`} className="flex flex-col items-center">
              {u.avatar_url ? (
                <img src={u.avatar_url} className="h-14 w-14 rounded-full object-cover mb-2" alt="" />
              ) : (
                <AuraAvatar gradient={gradientFor(u.username)} size="md" initials={initialsOf(u.display_name || u.username)} />
              )}
              <p className="text-xs font-semibold truncate w-full text-center mt-1 flex items-center justify-center gap-1">
                <span className="truncate">{u.username}</span>
                {u.verification_kind && <VerificationBadge kind={u.verification_kind as any} />}
              </p>
              <p className="text-[10px] text-muted-foreground truncate w-full text-center">Suggested</p>
            </Link>
            <button
              onClick={() => toggleFollow(u.user_id)}
              className={`mt-2 w-full py-1.5 rounded-md text-xs font-semibold ${
                following.has(u.user_id) ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
              }`}
            >
              {following.has(u.user_id) ? "Following" : "Follow"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
