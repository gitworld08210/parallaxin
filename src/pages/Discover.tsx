import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, TrendingUp, Sparkles } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { fmt, gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";

type Profile = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  verified: boolean;
  followers_count: number;
};

const Discover = () => {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(async () => {
      let query = supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, bio, verified, followers_count")
        .order("followers_count", { ascending: false })
        .limit(30);
      if (q.trim()) {
        const term = `%${q.trim()}%`;
        query = query.or(`username.ilike.${term},display_name.ilike.${term}`);
      }
      const { data } = await query;
      setProfiles((data ?? []).filter((p) => p.user_id !== user?.id) as Profile[]);
    }, 200);
    return () => clearTimeout(t);
  }, [q, user?.id]);

  useEffect(() => {
    if (!user) return;
    supabase.from("follows").select("following_id").eq("follower_id", user.id).then(({ data }) => {
      setFollowing(new Set((data ?? []).map((f) => f.following_id)));
    });
  }, [user?.id]);

  const toggleFollow = async (target: string) => {
    if (!user) return toast.error("Sign in to follow");
    const isF = following.has(target);
    const next = new Set(following);
    if (isF) { next.delete(target); setFollowing(next);
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", target);
    } else { next.add(target); setFollowing(next);
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: target });
      if (error) { next.delete(target); setFollowing(new Set(next)); toast.error(error.message); }
    }
  };

  return (
    <div>
      <TopBar subtitle="Explore" title="Discover" />

      <div className="px-5">
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 mb-5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search creators…"
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
          {[{ icon: TrendingUp, label: "Trending" }, { icon: Sparkles, label: "AI Picks" }].map(({ icon: Icon, label }) => (
            <button key={label} className="glass shrink-0 rounded-full px-4 py-2 flex items-center gap-2 text-xs font-medium">
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </button>
          ))}
        </div>

        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase mb-3">
          {q ? "Results" : "Top creators"}
        </h2>

        <div className="space-y-3">
          {profiles.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No creators found.</p>}
          {profiles.map((c) => (
            <GlassCard key={c.user_id} className="flex items-center gap-4 p-4">
              <Link to={`/u/${c.username}`}>
                {c.avatar_url ? (
                  <img src={c.avatar_url} className="h-14 w-14 rounded-full object-cover" alt="" />
                ) : (
                  <AuraAvatar gradient={gradientFor(c.username)} size="md" initials={initialsOf(c.display_name || c.username)} />
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/u/${c.username}`} className="flex items-center gap-1.5">
                  <p className="font-semibold truncate">{c.display_name || c.username}</p>
                  {c.verified && <VerificationBadge kind="verified" />}
                </Link>
                <p className="text-xs text-muted-foreground truncate">@{c.username}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmt(c.followers_count)} followers</p>
              </div>
              <button
                onClick={() => toggleFollow(c.user_id)}
                className={`text-xs font-semibold px-3 py-2 rounded-full ${
                  following.has(c.user_id) ? "glass-strong" : "bg-gradient-primary text-primary-foreground shadow-glow"
                }`}
              >
                {following.has(c.user_id) ? "Following" : "Follow"}
              </button>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Discover;
