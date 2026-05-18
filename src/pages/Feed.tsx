import { TopBar } from "@/components/vibe/TopBar";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { fmt, reels } from "@/lib/mock";
import { motion } from "framer-motion";
import { Bell, Heart, MessageCircle, Send, Sparkles } from "lucide-react";

const Feed = () => {
  return (
    <div>
      <TopBar
        subtitle="VibeNexus"
        title="For You"
        right={
          <button className="glass h-11 w-11 rounded-full grid place-items-center" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </button>
        }
      />

      {/* Trending creators rail */}
      <section className="px-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Trending creators</h2>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5">
          {reels.map((r) => (
            <div key={r.id} className="flex flex-col items-center gap-1 shrink-0">
              <AuraAvatar gradient={r.creator.avatar} size="md" glow initials={r.creator.name[0]} />
              <span className="text-[11px] text-muted-foreground max-w-[64px] truncate">{r.creator.handle}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Reels stack */}
      <section className="px-5 space-y-5">
        {reels.map((r, i) => (
          <motion.article
            key={r.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <GlassCard className="overflow-hidden p-0">
              <div
                className="relative aspect-[9/14] w-full"
                style={{ backgroundImage: r.cover }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

                <div className="absolute top-4 left-4 right-4 flex items-center gap-3">
                  <AuraAvatar gradient={r.creator.avatar} size="sm" initials={r.creator.name[0]} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold truncate">{r.creator.name}</p>
                      {r.creator.badges.map((b) => (
                        <VerificationBadge key={b} kind={b} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.creator.handle}</p>
                  </div>
                  <button className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                    Follow
                  </button>
                </div>

                <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
                  <ActionIcon icon={Heart} value={fmt(r.likes)} />
                  <ActionIcon icon={MessageCircle} value={fmt(r.comments)} />
                  <ActionIcon icon={Send} value={fmt(r.shares)} />
                </div>

                <div className="absolute left-4 right-20 bottom-5">
                  <p className="text-sm leading-snug">{r.caption}</p>
                </div>
              </div>
            </GlassCard>
          </motion.article>
        ))}
      </section>
    </div>
  );
};

const ActionIcon = ({ icon: Icon, value }: { icon: any; value: string }) => (
  <button className="flex flex-col items-center gap-1 group">
    <span className="h-10 w-10 grid place-items-center rounded-full glass group-active:scale-95 transition-transform">
      <Icon className="h-5 w-5" />
    </span>
    <span className="text-[10px] font-semibold">{value}</span>
  </button>
);

export default Feed;
