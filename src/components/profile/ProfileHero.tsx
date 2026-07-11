import { motion } from "framer-motion";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProfileHeroProps {
  coverUrl: string | null;
  avatarUrl: string | null;
  displayName: string;
  username: string;
  hasFounderGlow?: boolean;
  className?: string;
}

/**
 * Immersive cover + floating avatar.
 * Fixed cover aspect prevents CLS. Avatar sits half-overlapping the cover
 * with a soft ring and elevated shadow.
 */
export const ProfileHero = ({
  coverUrl,
  avatarUrl,
  displayName,
  username,
  hasFounderGlow = false,
  className,
}: ProfileHeroProps) => {
  return (
    <div className={cn("relative", className)}>
      {/* Cover — locked aspect, no jump */}
      <div className="relative w-full aspect-[3/1] sm:aspect-[4/1] overflow-hidden bg-surface">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(60% 80% at 20% 20%, hsl(var(--primary) / 0.35), transparent 60%), radial-gradient(50% 70% at 80% 90%, hsl(var(--aura) / 0.28), transparent 60%), linear-gradient(180deg, hsl(var(--surface)), hsl(var(--background)))",
            }}
          />
        )}
        {/* Bottom fade for seamless meet with page */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"
        />
      </div>

      {/* Floating avatar — overlaps cover by ~50% */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-4 sm:left-8 -bottom-12 sm:-bottom-14"
      >
        <div
          className={cn(
            "relative rounded-full p-[3px] bg-surface-elevated shadow-xl",
            hasFounderGlow &&
              "bg-gradient-to-br from-primary via-aura to-primary shadow-glow",
          )}
        >
          <div className="rounded-full ring-4 ring-background overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${displayName} avatar`}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover"
              />
            ) : (
              <AuraAvatar
                gradient={gradientFor(username)}
                size="xl"
                initials={initialsOf(displayName || username)}
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileHero;
