
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, TrendingUp, Sparkles, Crown, BadgeCheck, Flame, PenSquare } from "lucide-react";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useAuth } from "@/contexts/AuthProvider";
import { fmt, gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { setDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";

type Profile = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  verified: boolean;
  verification_kind?: string | null;
  followers_count: number;
  is_founder?: boolean | null;
};

type TrendingPost = {
  id: string;
  media_url: string | null;
  media_type: string | null;
  like_count: number;
  content: string;
};

const Discover = () => {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [trending, setTrending] = useState<TrendingPost[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getDocs(query(
        collection(db, "profiles"),
        orderBy("followers_count", "desc"),
        limit(20)
      )),
      getDocs(query(
        collection(db, "posts"),
        where("is_reel", "==", false),
        orderBy("like_count", "desc"),
        limit(6)
      )),
      Promise.resolve({ data: [] }),
    ]).then(([pSnap, tRes, fRes]) => {
      if (cancelled) return;
      const profs = pSnap.docs.map(doc => ({ user_id: doc.id, ...doc.data() })) as Profile[];
      setAllProfiles(profs.filter((p) => p.user_id !== user?.id));
      setTrending((tRes.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TrendingPost[]));
      setFollowing(new Set(((fRes.data ?? []) as any[]).map((f) => f.following_id)));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const toggleFollow = async (target: string) => {
    if (!user) return toast.error("Sign in to follow");
    const isF = following.has(target);
    const next = new Set(following);
    if (isF) {
      next.delete(target); setFollowing(next);
      await deleteDoc(doc(db, "follows", `${user.id}_${target}`));
    } else {
      next.add(target); setFollowing(next);
      try {
        await setDoc(doc(db, "follows", `${user.id}_${target}`), {
          follower_id: user.id,
          following_id: target,
          created_at: serverTimestamp()
        });
      } catch (e) {
        next.delete(target); setFollowing(new Set(next)); toast.error("Follow failed");
      }
    }
  };

  const term = q.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!term) return [];
    return allProfiles.filter(
      (p) =>
        p.username.toLowerCase().includes(term) ||
        (p.display_name || "").toLowerCase().includes(term)
    );
  }, [allProfiles, term]);

  const founders = useMemo(() => allProfiles.filter((p) => p.is_founder).slice(0, 12), [allProfiles]);
  const verified = useMemo(
    () => allProfiles.filter((p) => p.verified || p.verification_kind).slice(0, 12),
    [allProfiles]
  );
  const rising = useMemo(() => allProfiles.slice(0, 12), [allProfiles]);

  const FILTERS = ["For you", "Trending", "Creators", "Reels", "AI"] as const;
  const [filter, setFilter] = useState<typeof FILTERS[number]>("For you");
  const trendingTags = [
    { tag: "cyberpunk", count: "12.4K" },
    { tag: "future", count: "8.7K" },
    { tag: "aiart", count: "6.2K" },
    { tag: "aurelix", count: "15.1K" },
  ];

  return (
    <div className="pb-8">
      <header className="h-14 px-5 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-20">
        <h1 className="text-xl font-bold tracking-tight">Explore</h1>
        <div className="flex items-center gap-4">
          <Link to="/compose"><PenSquare className="h-6 w-6" /></Link>
        </div>
      </header>

      <div className="px-4 pt-3">
        <div className="bg-[#111] border border-white/5 rounded-lg flex items-center gap-2 px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search creators, posts, topics…"
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Filter chips */}
      {!term && (
        <div className="flex gap-2 px-4 pt-4 overflow-x-auto hide-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-[#111] text-foreground border-white/5 hover:border-primary/40"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Trending Now hashtags */}
      {!term && (
        <section className="px-4 mt-6">
          <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
            Trending Now <Flame className="h-4 w-4 text-primary" />
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {trendingTags.map((t) => (
              <div key={t.tag} className="rounded-2xl border border-border bg-card p-3">
                <p className="text-sm font-bold text-primary">#{t.tag}</p>
                <p className="text-[11px] text-muted-foreground">{t.count} posts</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search results take over when typing */}
      {term ? (
        <div className="px-4 mt-5">
          <SectionHeader icon={Search} label={`Results · ${searchResults.length}`} />
          <div className="mt-3 divide-y divide-border">
            {searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">No creators found.</p>
            )}
            {searchResults.map((p) => (
              <CreatorRow key={p.user_id} p={p} following={following.has(p.user_id)} onToggle={() => toggleFollow(p.user_id)} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Trending media tiles (Netflix-grade hero rail) */}
          <Rail icon={Flame} label="Trending now" className="mt-5">
            <div className="flex gap-2 px-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory">
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 w-32 rounded-xl bg-muted animate-pulse shrink-0 snap-start" />
              ))}
              {trending.map((t) => (
                <Link
                  key={t.id}
                  to={`/p/${t.id}`}
                  className="relative h-48 w-32 rounded-xl overflow-hidden shrink-0 snap-start bg-muted group"
                >
                  {t.media_type === "video" ? (
                    <video src={t.media_url ?? ""} muted className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <img src={t.media_url ?? ""} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <p className="text-[10px] uppercase tracking-wider opacity-80 flex items-center gap-1">
                      <Flame className="h-3 w-3" /> {fmt(t.like_count)}
                    </p>
                    <p className="text-xs font-medium line-clamp-2 leading-snug mt-0.5">{t.content || "Untitled"}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Rail>

          {/* Founders rail */}
          {founders.length > 0 && (
            <Rail icon={Crown} label="Hall of Founders" accent>
              <CreatorChipRail
                profiles={founders}
                following={following}
                onToggle={toggleFollow}
              />
            </Rail>
          )}

          {/* Verified rail */}
          {verified.length > 0 && (
            <Rail icon={BadgeCheck} label="Verified creators">
              <CreatorChipRail
                profiles={verified}
                following={following}
                onToggle={toggleFollow}
              />
            </Rail>
          )}

          {/* Rising creators */}
          <Rail icon={Sparkles} label="Rising on Aurelix">
            <CreatorChipRail
              profiles={rising}
              following={following}
              onToggle={toggleFollow}
            />
          </Rail>

          {/* Full list */}
          <div className="px-4 mt-7">
            <SectionHeader icon={TrendingUp} label="All creators" />
            <div className="mt-3 divide-y divide-border">
              {allProfiles.slice(0, 30).map((p) => (
                <CreatorRow key={p.user_id} p={p} following={following.has(p.user_id)} onToggle={() => toggleFollow(p.user_id)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, label, accent }: { icon: any; label: string; accent?: boolean }) => (
  <div className="flex items-center gap-2 px-4">
    <Icon className={cn("h-4 w-4", accent ? "text-aura" : "text-primary")} />
    <h2 className="text-sm font-semibold tracking-wide">{label}</h2>
  </div>
);

const Rail = ({
  icon, label, accent, className, children,
}: { icon: any; label: string; accent?: boolean; className?: string; children: React.ReactNode }) => (
  <section className={cn("mt-6", className)}>
    <div className="px-4 mb-2.5 flex items-center gap-2">
      {(() => {
        const I = icon;
        return <I className={cn("h-4 w-4", accent ? "text-aura" : "text-primary")} />;
      })()}
      <h2 className="text-sm font-semibold tracking-wide">{label}</h2>
    </div>
    {children}
  </section>
);

const CreatorChipRail = ({
  profiles, following, onToggle,
}: {
  profiles: Profile[];
  following: Set<string>;
  onToggle: (id: string) => void;
}) => (
  <div className="flex gap-3 px-4 overflow-x-auto hide-scrollbar snap-x">
    {profiles.map((p) => (
      <div
        key={p.user_id}
        className="snap-start shrink-0 w-36 bg-card border border-border rounded-xl p-3 flex flex-col items-center text-center"
      >
        <Link to={`/u/${p.username}`} className="mb-2">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <AuraAvatar gradient={gradientFor(p.username)} size="md" initials={initialsOf(p.display_name || p.username)} />
          )}
        </Link>
        <Link to={`/u/${p.username}`} className="flex items-center gap-1 text-sm font-semibold truncate max-w-full">
          <span className="truncate">{p.display_name || p.username}</span>
          {p.verification_kind ? <VerificationBadge kind={p.verification_kind as any} /> : p.verified && <VerificationBadge kind="verified" />}
        </Link>
        <p className="text-[11px] text-muted-foreground truncate max-w-full">{fmt(p.followers_count)} followers</p>
        <button
          onClick={() => onToggle(p.user_id)}
          className={cn(
            "mt-2 w-full py-1.5 rounded-md text-[12px] font-semibold transition-colors",
            following.has(p.user_id) ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
          )}
        >
          {following.has(p.user_id) ? "Following" : "Follow"}
        </button>
      </div>
    ))}
  </div>
);

const CreatorRow = ({
  p, following, onToggle,
}: { p: Profile; following: boolean; onToggle: () => void }) => (
  <div className="flex items-center gap-3 py-3">
    <Link to={`/u/${p.username}`} className="shrink-0">
      {p.avatar_url ? (
        <img src={p.avatar_url} className="h-12 w-12 rounded-full object-cover" alt="" />
      ) : (
        <AuraAvatar gradient={gradientFor(p.username)} size="md" initials={initialsOf(p.display_name || p.username)} />
      )}
    </Link>
    <div className="flex-1 min-w-0">
      <Link to={`/u/${p.username}`} className="flex items-center gap-1.5">
        <p className="text-sm font-semibold truncate">{p.display_name || p.username}</p>
        {p.verification_kind ? <VerificationBadge kind={p.verification_kind as any} /> : p.verified && <VerificationBadge kind="verified" />}
      </Link>
      <p className="text-xs text-muted-foreground truncate">@{p.username} · {fmt(p.followers_count)} followers</p>
    </div>
    <button
      onClick={onToggle}
      className={cn(
        "text-xs font-semibold px-3.5 py-1.5 rounded-md shrink-0",
        following ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
      )}
    >
      {following ? "Following" : "Follow"}
    </button>
  </div>
);

export default Discover;
