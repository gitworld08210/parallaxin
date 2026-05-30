import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/vibe/GlassCard";
import { Crown, Flame, Zap, Sparkles, Star, Users, Lock } from "lucide-react";

const items = [
  { icon: Crown, name: "Top Creator", desc: "Reach 50K followers" },
  { icon: Flame, name: "Viral Creator", desc: "10M+ views on reels" },
  { icon: Zap, name: "Trendsetter", desc: "Start 5 viral trends" },
  { icon: Sparkles, name: "Hall of Founders", desc: "Elite creator member" },
  { icon: Star, name: "Early Adopter", desc: "Joined Aurelix early" },
  { icon: Users, name: "Community Builder", desc: "Build an active community" },
];

export default function Achievements() {
  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Achievements" right={<span className="text-xs text-primary font-semibold">See All</span>} />
      <div className="p-4 space-y-3">
        {items.map((it) => (
          <GlassCard key={it.name} className="p-4 flex items-center gap-3 opacity-70">
            <div className="h-10 w-10 rounded-xl bg-muted/30 grid place-items-center">
              <it.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{it.name}</p>
              <p className="text-xs text-muted-foreground">{it.desc}</p>
            </div>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </GlassCard>
        ))}
        <GlassCard className="p-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Achievement Progress</p>
            <p className="text-xs text-muted-foreground">0 / 24</p>
          </div>
          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div className="h-full bg-primary" style={{ width: "0%" }} />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
