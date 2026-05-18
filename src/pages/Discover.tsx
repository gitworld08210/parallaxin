import { TopBar } from "@/components/vibe/TopBar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { creators, fmt } from "@/lib/mock";
import { Search, TrendingUp, Sparkles, Radio } from "lucide-react";

const categories = [
  { icon: TrendingUp, label: "Trending" },
  { icon: Sparkles, label: "AI Picks" },
  { icon: Radio, label: "Live now" },
];

const Discover = () => {
  return (
    <div>
      <TopBar subtitle="Explore" title="Discover" />

      <div className="px-5">
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 mb-5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search creators, sounds, vibes…"
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
          {categories.map(({ icon: Icon, label }) => (
            <button key={label} className="glass shrink-0 rounded-full px-4 py-2 flex items-center gap-2 text-xs font-medium">
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </button>
          ))}
        </div>

        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase mb-3">
          Trending creators
        </h2>

        <div className="space-y-3">
          {creators.map((c) => (
            <GlassCard key={c.id} className="flex items-center gap-4 p-4">
              <AuraAvatar gradient={c.avatar} size="md" glow={c.tier === "infinity"} initials={c.name[0]} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold truncate">{c.name}</p>
                  {c.badges.map((b) => <VerificationBadge key={b} kind={b} />)}
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.bio}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmt(c.followers)} followers</p>
              </div>
              <button className="text-xs font-semibold px-3 py-2 rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                Follow
              </button>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Discover;
