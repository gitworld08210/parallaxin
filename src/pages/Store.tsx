import { TopBar } from "@/components/vibe/TopBar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { QrCode, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Store = () => {
  return (
    <div>
      <TopBar subtitle="Support creators directly" title="Store" />

      <div className="px-5 space-y-5 pb-8">
        <GlassCard className="p-6 text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
            <QrCode className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="font-display text-2xl font-semibold">Tip creators via UPI</h2>
          <p className="text-sm text-muted-foreground">
            Send Aura directly to any creator by scanning their Paytm / UPI QR. Money moves creator-to-creator — Aurelix takes nothing.
          </p>
          <Link
            to="/discover"
            className="inline-block text-sm font-semibold px-5 py-3 rounded-full bg-primary text-primary-foreground shadow-glow"
          >
            Find creators
          </Link>
        </GlassCard>

        <GlassCard className="p-5 space-y-2">
          <p className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Subscriptions coming soon
          </p>
          <p className="text-xs text-muted-foreground">
            Recurring Premium and Pro plans return once automated billing is enabled. Until then, all support runs through UPI tips.
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

export default Store;
