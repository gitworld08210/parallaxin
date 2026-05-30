import { Crown, Flame, Zap, ChevronRight, Gem, Lock, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const ACHIEVEMENTS = [
  { icon: Crown, title: "Top Creator", subtitle: "Reach 50K followers" },
  { icon: Flame, title: "Viral Creator", subtitle: "10M+ views on reels" },
  { icon: Zap, title: "Trendsetter", subtitle: "Start 5 viral trends" },
  { icon: Crown, title: "Hall of Founders", subtitle: "Elite creator member" },
];

const STATS = [
  { label: "Views", value: "0" },
  { label: "Engagement", value: "0" },
  { label: "Profile Visits", value: "0" },
  { label: "New Followers", value: "0" },
];

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-2xl border border-border bg-card/60 backdrop-blur p-4", className)}>{children}</div>
);

const SectionHead = ({ title, to }: { title: string; to?: string }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-semibold">{title}</h3>
    {to && (
      <Link to={to} className="text-xs text-muted-foreground inline-flex items-center gap-0.5 hover:text-foreground">
        See All <ChevronRight className="h-3 w-3" />
      </Link>
    )}
  </div>
);

const FlatLine = () => (
  <svg viewBox="0 0 64 30" className="w-full h-8 mt-1">
    <line x1="0" y1="20" x2="64" y2="20" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
  </svg>
);

const AuraRing = () => {
  const r = 54, c = 2 * Math.PI * r;
  return (
    <div className="relative w-[150px] h-[150px] mx-auto">
      <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
        <circle cx="65" cy="65" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" opacity="0.4" />
        <circle cx="65" cy="65" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`0 ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Gem className="h-7 w-7 text-muted-foreground mb-1" />
        <p className="text-2xl font-bold leading-none">0</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Beginner</p>
      </div>
    </div>
  );
};

export const ProfileShowcase = ({ bio }: { bio?: string | null }) => {
  return (
    <div className="px-4 mt-5 space-y-4">
      {/* About */}
      {bio && (
        <Card>
          <h3 className="text-sm font-semibold mb-2">About</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{bio}</p>
        </Card>
      )}

      {/* Achievements */}
      <Card>
        <SectionHead title="Achievements" to="/achievements" />
        <div className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => (
            <Link
              key={a.title}
              to="/achievements"
              className="text-left p-3 rounded-xl bg-muted/30 border border-border opacity-75 relative"
            >
              <a.icon className="h-5 w-5 mb-2 text-muted-foreground" strokeWidth={2} />
              <p className="text-xs font-semibold leading-tight">{a.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{a.subtitle}</p>
              <Lock className="absolute top-2 right-2 h-3 w-3 text-muted-foreground" />
            </Link>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-3">0 / 24 unlocked</p>
      </Card>

      {/* Performance Overview */}
      <Card>
        <SectionHead title="Performance Overview" />
        <div className="grid grid-cols-2 gap-2">
          {STATS.map((s) => (
            <div key={s.label} className="p-3 rounded-xl bg-muted/30 border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className="text-lg font-bold mt-0.5">{s.value}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">+0%</p>
              <FlatLine />
            </div>
          ))}
        </div>
        <Link to="/analytics" className="mt-3 w-full py-2 rounded-xl bg-muted/40 border border-border text-sm font-medium inline-flex items-center justify-center gap-1">
          View Analytics <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </Card>

      {/* Top Supporters — empty state */}
      <Card>
        <SectionHead title="Top Supporters" />
        <div className="py-6 text-center">
          <Heart className="h-7 w-7 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm font-medium">No supporters yet</p>
          <p className="text-xs text-muted-foreground mt-1">Top fans will appear here.</p>
        </div>
      </Card>

      {/* Aura Level */}
      <Card>
        <h3 className="text-sm font-semibold mb-3">Aura Level</h3>
        <AuraRing />
        <p className="text-center text-xs text-muted-foreground mt-3">0 / 1,000 XP</p>
        <Link to="/aura-level" className="mt-3 w-full py-2 rounded-xl bg-muted/40 border border-border text-sm font-medium inline-flex items-center justify-center gap-1">
          View Aura Benefits <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </Card>
    </div>
  );
};
