import { TopBar } from "@/components/vibe/TopBar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { creators } from "@/lib/mock";
import { Sparkles, Video } from "lucide-react";
import { Link } from "react-router-dom";

const Messages = () => {
  return (
    <div>
      <TopBar
        subtitle="Realtime"
        title="Messages"
        right={
          <button className="glass h-11 w-11 rounded-full grid place-items-center" aria-label="New">
            <Video className="h-5 w-5 text-primary" />
          </button>
        }
      />

      <div className="px-5">
        <GlassCard className="mb-5 flex items-center gap-3 p-4">
          <span className="h-10 w-10 rounded-full bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-sm">Aura AI Assistant</p>
            <p className="text-xs text-muted-foreground">Ask anything — captions, ideas, replies</p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-aura">Beta</span>
        </GlassCard>

        <div className="space-y-2">
          {creators.map((c) => (
            <Link
              to="/profile"
              key={c.id}
              className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-muted/40 transition-colors"
            >
              <AuraAvatar gradient={c.avatar} size="md" initials={c.name[0]} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold truncate text-sm">{c.name}</p>
                  {c.badges.slice(0, 1).map((b) => <VerificationBadge key={b} kind={b} />)}
                </div>
                <p className="text-xs text-muted-foreground truncate">Sent a new vibe ✦</p>
              </div>
              <span className="text-[10px] text-muted-foreground">2m</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Messages;
