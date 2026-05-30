import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/vibe/GlassCard";
import { Gem, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  "Higher content reach",
  "Exclusive creator events",
  "Premium features access",
  "Priority support",
];

export default function AuraLevel() {
  const pct = 0;
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Aura Level" />
      <div className="p-4 space-y-5">
        <GlassCard className="flex flex-col items-center py-8">
          <div className="relative h-44 w-44">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" opacity="0.3" />
              <circle cx="80" cy="80" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <Gem className="h-12 w-12 text-primary" />
            </div>
          </div>
          <p className="text-4xl font-bold mt-4">0</p>
          <p className="text-sm text-muted-foreground">Beginner</p>
          <p className="text-xs text-muted-foreground mt-2">0 / 1,000 XP</p>
        </GlassCard>

        <div>
          <p className="text-sm font-semibold mb-3">Aura Benefits</p>
          <div className="space-y-2">
            {benefits.map((b) => (
              <GlassCard key={b} className="p-3 flex items-center gap-3 opacity-70">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{b}</span>
              </GlassCard>
            ))}
          </div>
        </div>

        <Button variant="secondary" className="w-full">View All Benefits</Button>
      </div>
    </div>
  );
}
