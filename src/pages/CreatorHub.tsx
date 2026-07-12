import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/vibe/GlassCard";
import { useAuth } from "@/contexts/AuthProvider";
import { BarChart3, DollarSign, Trophy, BadgeCheck, Gem, Wrench, Newspaper } from "lucide-react";
import { Link } from "react-router-dom";

const KPI = ({ label, value }: { label: string; value: string }) => (
  <GlassCard className="p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold mt-1">{value}</p>
    <p className="text-[11px] text-muted-foreground mt-1">+0% this month</p>
  </GlassCard>
);

const Quick = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
  <Link to={to} className="glass rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-muted/30 transition">
    <Icon className="h-6 w-6 text-primary" />
    <span className="text-xs font-medium">{label}</span>
  </Link>
);

export default function CreatorHub() {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Creator Hub" />
      <div className="p-4 space-y-5">
        <GlassCard>
          <p className="text-lg font-semibold">Welcome back, {profile?.display_name || profile?.username || "Creator"} 👋</p>
          <p className="text-sm text-muted-foreground mt-1">Here's your creator overview.</p>
        </GlassCard>

        <GlassCard>
          <p className="text-xs text-muted-foreground">Total Earnings</p>
          <p className="text-3xl font-bold mt-1">$0.00</p>
          <p className="text-[11px] text-muted-foreground mt-1">+0% this month</p>
          <div className="mt-4 h-16 rounded-lg bg-muted/20 grid place-items-center text-xs text-muted-foreground">
            No earnings yet
          </div>
        </GlassCard>

        <div className="grid grid-cols-3 gap-3">
          <KPI label="Profile Views" value="0" />
          <KPI label="Content Reach" value="0" />
          <KPI label="Engagement" value="0" />
        </div>

        <div>
          <p className="text-sm font-semibold mb-3">Quick Access</p>
          <div className="grid grid-cols-3 gap-3">
            <Quick to="/analytics" icon={BarChart3} label="Analytics" />
            <Quick to="/monetization" icon={DollarSign} label="Monetization" />
            <Quick to="/achievements" icon={Trophy} label="Achievements" />
            <Quick to="/verification-center" icon={BadgeCheck} label="Verification" />
            <Quick to="/aura-level" icon={Gem} label="Aura Level" />
            <Quick to="/creator-hub" icon={Wrench} label="Creator Tools" />
            <Quick to="/news" icon={Newspaper} label="News" />
          </div>
        </div>
      </div>
    </div>
  );
}
