import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, Users, Eye, DollarSign, Sparkles, Play, Heart, MessageCircle, Wallet, Crown, Video, Loader2, Lightbulb } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { useIsCreator } from "@/hooks/useIsCreator";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { motion } from "framer-motion";

type Tab = "overview" | "content" | "audience" | "earnings" | "coach";

type PostRow = {
  id: string; content: string; is_reel: boolean; media_url: string | null;
  like_count: number; comment_count: number; created_at: string;
};

type Coach = {
  headline: string;
  tips: Array<{ title: string; detail: string }>;
  best_time: string;
  content_focus: string;
};

const CreatorStudio = () => {
  const { user, profile } = useAuth();
  const { isCreator } = useIsCreator();
  const { balance } = useCoinBalance();
  const [tab, setTab] = useState<Tab>("overview");
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { count: subs }] = await Promise.all([
          supabase.from("posts").select("id, content, is_reel, media_url, like_count, comment_count, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60),
          supabase.from("creator_subscriptions").select("*", { count: "exact", head: true }).eq("creator_id", user.id).eq("status", "active"),
      ]);

      setPosts((p ?? []) as PostRow[]);
      setSubscriberCount(subs ?? 0);
      setLoading(false);
    })();
  }, [user?.id]);

  const stats = useMemo(() => {
    const now = Date.now();
    const wk = 7 * 24 * 60 * 60 * 1000;
    const week = posts.filter((p) => now - +new Date(p.created_at) < wk);
    const likes = posts.reduce((s, p) => s + (p.like_count ?? 0), 0);
    const comments = posts.reduce((s, p) => s + (p.comment_count ?? 0), 0);
    const eng = posts.length ? Math.round((likes + comments) / posts.length) : 0;

    // 7-day sparkline
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    posts.forEach((p) => {
      const k = new Date(p.created_at).toISOString().slice(0, 10);
      if (k in days) days[k] += (p.like_count ?? 0) + (p.comment_count ?? 0);
    });
    const spark = Object.entries(days).map(([d, v]) => ({ d: d.slice(5), v }));

    return {
      followers: (profile as any)?.followers_count ?? 0,
      weekPosts: week.length,
      totalEng: likes + comments,
      engPerPost: eng,
      spark,
      topPost: [...posts].sort((a, b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count))[0],
    };
  }, [posts, profile]);

  if (!user) return <p className="p-8 text-sm text-muted-foreground">Sign in first.</p>;
  if (!isCreator) return (
    <div className="p-8 text-center space-y-3">
      <Crown className="h-10 w-10 text-primary mx-auto" />
      <p className="font-semibold">Creator Studio is for creators.</p>
      <Link to="/monetization" className="inline-block px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold">Become a creator</Link>
    </div>
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "content", label: "Content" },
    { id: "audience", label: "Audience" },
    { id: "earnings", label: "Earnings" },
    { id: "coach", label: "AI Coach" },
  ];

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border">
        <div className="h-14 px-3 flex items-center gap-3">
          <Link to="/profile" aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-secondary/60">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold leading-tight">Creator Studio</p>
            <p className="text-[11px] text-muted-foreground truncate">@{profile?.username}</p>
          </div>
        </div>
        {/* Tab strip */}
        <div className="flex overflow-x-auto no-scrollbar px-2 gap-1">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative py-3 px-3 text-[13.5px] font-semibold whitespace-nowrap transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {active && (
                  <motion.span
                    layoutId="studio-underline"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {loading && (
        <div className="p-10 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && tab === "overview" && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="Followers" value={fmt(stats.followers)} accent />
            <StatCard icon={Video} label="Posts (7d)" value={String(stats.weekPosts)} />
            <StatCard icon={Heart} label="Total engagement" value={fmt(stats.totalEng)} />
            <StatCard icon={TrendingUp} label="Avg / post" value={fmt(stats.engPerPost)} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Engagement · last 7 days</p>
              <span className="text-[11px] text-muted-foreground">likes + comments</span>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.spark}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Line type="monotone" dataKey="v" stroke="url(#lineGrad)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {stats.topPost && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Top post this week</p>
              <div className="flex gap-3">
                {stats.topPost.media_url ? (
                  stats.topPost.is_reel ? (
                    <div className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-black">
                      <video src={stats.topPost.media_url} className="h-full w-full object-cover" muted />
                      <Play className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow" fill="white" />
                    </div>
                  ) : (
                    <img src={stats.topPost.media_url} className="h-20 w-20 rounded-xl object-cover shrink-0" />
                  )
                ) : (
                  <div className="h-20 w-20 rounded-xl bg-secondary shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm line-clamp-2">{stats.topPost.content || "(No caption)"}</p>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {fmt(stats.topPost.like_count)}</span>
                    <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {fmt(stats.topPost.comment_count)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <Link to={`/post/${stats.topPost.id}/insights`} className="text-[12px] text-primary font-semibold">Insights →</Link>
                    <button 
                      onClick={() => toast.info("Promote flow coming soon")}
                      className="text-[12px] text-emerald-500 font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" /> Promote
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && tab === "content" && (
        <div className="p-4">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No posts yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((p) => (
                <Link key={p.id} to={`/post/${p.id}/insights`} className="relative aspect-square bg-secondary overflow-hidden group">
                  {p.media_url ? (
                    p.is_reel ? (
                      <video src={p.media_url} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={p.media_url} className="h-full w-full object-cover" />
                    )
                  ) : (
                    <div className="h-full w-full grid place-items-center p-2 text-[10px] text-muted-foreground text-center">
                      {p.content.slice(0, 40)}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent text-white text-[10px] font-semibold flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" /> {fmt(p.like_count)}</span>
                    <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {fmt(p.comment_count)}</span>
                  </div>
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info("Promote flow coming soon");
                      }}
                      className="p-1 rounded-full bg-emerald-500 text-white shadow-lg"
                    >
                      <Sparkles className="h-3 w-3" />
                    </button>
                  </div>
                  {p.is_reel && <span className="absolute top-1 right-1"><Play className="h-3.5 w-3.5 text-white drop-shadow" fill="white" /></span>}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && tab === "audience" && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="Followers" value={fmt(stats.followers)} accent />
            <StatCard icon={Crown} label="Subscribers" value={fmt(subscriberCount)} />
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Deeper insights</p>
            <p className="text-sm text-muted-foreground">Location & active-hour heatmap coming soon — data currently limited to public engagement events.</p>
            <Link to="/analytics" className="text-sm text-primary font-semibold mt-3 inline-block">Open full analytics →</Link>
          </div>
        </div>
      )}

      {!loading && tab === "earnings" && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Wallet} label="Coin balance" value={fmt(balance ?? 0)} accent />
            <StatCard icon={Crown} label="Active subscribers" value={fmt(subscriberCount)} />
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <p className="text-sm font-semibold">Payout & monetization</p>
            <p className="text-xs text-muted-foreground">Manage subscription tiers, request payouts, review coin ledger.</p>
            <div className="flex gap-2 pt-2">
              <Link to="/wallet" className="flex-1 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold text-center">Open wallet</Link>
              <Link to="/monetization" className="flex-1 py-2.5 rounded-full border border-border text-sm font-semibold text-center">Monetization</Link>
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "coach" && <CoachTab />}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) => (
  <div className={cn(
    "rounded-2xl border p-4",
    accent ? "border-primary/40 bg-gradient-to-br from-primary/10 to-transparent" : "border-border bg-card",
  )}>
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span className="text-[11px] uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-2xl font-bold mt-1.5">{value}</p>
  </div>
);

const CoachTab = () => {
  const [busy, setBusy] = useState(false);
  const [coach, setCoach] = useState<Coach | null>(null);

  const run = async () => {
    setBusy(true);
    setCoach(null);
    try {
      const { data, error } = await supabase.functions.invoke("creator-coach");
      if (error) throw error;
      setCoach(data as Coach);
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="text-sm font-bold">Aurelix Creator Coach</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          AI analyzes your last 10 posts and returns 3 personalized growth tips + best posting time.
        </p>
        <button
          onClick={run}
          disabled={busy}
          className="mt-4 w-full py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Sparkles className="h-4 w-4" /> Analyze my content</>}
        </button>
      </div>

      {coach && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">{coach.headline}</p>
            {coach.best_time && (
              <p className="text-[11px] text-muted-foreground mt-2">
                <span className="uppercase tracking-widest">Best time to post</span> · <span className="text-foreground font-semibold">{coach.best_time}</span>
              </p>
            )}
            {coach.content_focus && (
              <p className="text-[11px] text-muted-foreground mt-1">
                <span className="uppercase tracking-widest">Try next</span> · <span className="text-foreground">{coach.content_focus}</span>
              </p>
            )}
          </div>
          <div className="space-y-2">
            {coach.tips.map((t, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 flex gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Powered by Gemini via Lovable AI</p>
        </>
      )}
    </div>
  );
};

export default CreatorStudio;
