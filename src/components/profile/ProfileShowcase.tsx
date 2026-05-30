import { Crown, Flame, Zap, Sparkles, TrendingUp, ChevronRight, Gem } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const soon = (label: string) => () =>
  toast(`${label} — coming soon`, { description: "This feature is launching shortly." });

const INTERESTS = [
  { icon: Sparkles, label: "AI Enthusiast" },
  { icon: Flame, label: "Cyberpunk Lover" },
  { icon: Gem, label: "Web3 Believer" },
  { icon: TrendingUp, label: "Content Creator" },
];

const ACHIEVEMENTS = [
  { icon: Crown, title: "Top Creator", subtitle: "Reached 50K followers", color: "text-primary" },
  { icon: Flame, title: "Viral Creator", subtitle: "10M+ views on reels", color: "text-orange-400" },
  { icon: Zap, title: "Trendsetter", subtitle: "Started 5 viral trends", color: "text-yellow-400" },
  { icon: Crown, title: "Hall of Founders", subtitle: "Elite creator member", color: "text-aura" },
];

const STATS = [
  { label: "Views", value: "3.2M", delta: "+23.6%", stroke: "hsl(0 84% 60%)" },
  { label: "Engagement", value: "289K", delta: "+18.7%", stroke: "hsl(265 80% 65%)" },
  { label: "Profile Visits", value: "126K", delta: "+21.3%", stroke: "hsl(35 95% 60%)" },
  { label: "New Followers", value: "12.6K", delta: "+19.8%", stroke: "hsl(200 90% 60%)" },
];

const SUPPORTERS = [
  { name: "NovaX", handle: "@novax", aura: "12,450", grad: "from-rose-500 to-fuchsia-600" },
  { name: "CyberZ", handle: "@cyberz", aura: "8,230", grad: "from-indigo-500 to-cyan-500" },
  { name: "Dreamy", handle: "@dreamy.visuals", aura: "6,780", grad: "from-pink-500 to-purple-600" },
  { name: "Stellar", handle: "@stellar", aura: "5,430", grad: "from-amber-500 to-rose-500" },
];

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-2xl border border-border bg-card/60 backdrop-blur p-4", className)}>{children}</div>
);

const SectionHead = ({ title, action }: { title: string; action?: string }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-semibold">{title}</h3>
    {action && (
      <button onClick={soon(title)} className="text-xs text-muted-foreground inline-flex items-center gap-0.5 hover:text-foreground">
        {action} <ChevronRight className="h-3 w-3" />
      </button>
    )}
  </div>
);

const Sparkline = ({ stroke }: { stroke: string }) => {
  // deterministic squiggle
  const pts = [4, 12, 7, 16, 10, 20, 14, 24, 18, 17, 22, 26, 26, 20, 30, 14].map((y, i) => `${i * 4},${30 - y}`).join(" ");
  return (
    <svg viewBox="0 0 64 30" className="w-full h-8 mt-1">
      <polyline fill="none" stroke={stroke} strokeWidth="1.6" points={pts} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const AuraRing = () => {
  const pct = 12450 / 15000;
  const r = 54, c = 2 * Math.PI * r;
  return (
    <div className="relative w-[150px] h-[150px] mx-auto">
      <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
        <circle cx="65" cy="65" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle
          cx="65" cy="65" r={r} fill="none"
          stroke="url(#auraGrad)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
        <defs>
          <linearGradient id="auraGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(0 84% 60%)" />
            <stop offset="100%" stopColor="hsl(280 80% 65%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Gem className="h-7 w-7 text-primary mb-1" />
        <p className="text-2xl font-bold leading-none">12</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Legendary</p>
      </div>
    </div>
  );
};

export const ProfileShowcase = ({ bio }: { bio?: string | null }) => {
  return (
    <div className="px-4 mt-5 space-y-4">
      {/* About */}
      <Card>
        <h3 className="text-sm font-semibold mb-2">About</h3>
        {bio && <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{bio}</p>}
        <ul className="space-y-2">
          {INTERESTS.map((i) => (
            <li key={i.label} className="flex items-center gap-2 text-sm">
              <i.icon className="h-4 w-4 text-primary" strokeWidth={2} />
              <span>{i.label}</span>
            </li>
          ))}
        </ul>
        <button onClick={soon("Full Bio")} className="mt-4 w-full py-2 rounded-xl bg-muted text-sm font-medium">
          View Full Bio
        </button>
      </Card>

      {/* Achievements */}
      <Card>
        <SectionHead title="Achievements" action="See All" />
        <div className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => (
            <button
              key={a.title}
              onClick={soon(a.title)}
              className="text-left p-3 rounded-xl bg-muted/40 border border-border hover:bg-muted/60 transition-colors"
            >
              <a.icon className={cn("h-5 w-5 mb-2", a.color)} strokeWidth={2} />
              <p className="text-xs font-semibold leading-tight">{a.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{a.subtitle}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Performance Overview */}
      <Card>
        <SectionHead title="Performance Overview" />
        <div className="grid grid-cols-2 gap-2">
          {STATS.map((s) => (
            <div key={s.label} className="p-3 rounded-xl bg-muted/40 border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className="text-lg font-bold mt-0.5">{s.value}</p>
              <p className="text-[10px] font-semibold" style={{ color: s.stroke }}>{s.delta}</p>
              <Sparkline stroke={s.stroke} />
            </div>
          ))}
        </div>
        <button onClick={soon("Analytics")} className="mt-3 w-full py-2 rounded-xl bg-muted text-sm font-medium inline-flex items-center justify-center gap-1">
          View Analytics <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </Card>

      {/* Top Supporters */}
      <Card>
        <SectionHead title="Top Supporters" action="See All" />
        <ul className="space-y-3">
          {SUPPORTERS.map((s) => (
            <li key={s.handle} className="flex items-center gap-3">
              <div className={cn("h-9 w-9 rounded-full bg-gradient-to-br", s.grad)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate">{s.handle}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                <Gem className="h-3 w-3" /> {s.aura}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Aura Level */}
      <Card>
        <h3 className="text-sm font-semibold mb-3">Aura Level</h3>
        <AuraRing />
        <p className="text-center text-xs text-muted-foreground mt-3">12,450 / 15,000 XP</p>
        <button onClick={soon("Aura Benefits")} className="mt-3 w-full py-2 rounded-xl bg-muted text-sm font-medium">
          View Aura Benefits
        </button>
      </Card>
    </div>
  );
};
