import { cn } from "@/lib/utils";

/**
 * Premium founder identity frame — a slow rotating dual-arc sigil
 * around the avatar with soft ambient bloom. Mythic, not gamer.
 */
type Tier = "founder" | "council" | "genesis";

export const AuraFrame = ({
  src,
  size = 72,
  tier = "founder",
  initials,
  className,
}: {
  src?: string | null;
  size?: number;
  tier?: Tier;
  initials?: string;
  className?: string;
}) => {
  const ringColors: Record<Tier, string> = {
    founder:
      "conic-gradient(from 0deg, hsl(48 100% 62%), hsl(28 100% 60%), hsl(320 80% 60%), hsl(204 100% 60%), hsl(48 100% 62%))",
    council:
      "conic-gradient(from 0deg, hsl(204 100% 60%), hsl(180 70% 55%), hsl(265 80% 65%), hsl(204 100% 60%))",
    genesis:
      "conic-gradient(from 0deg, hsl(0 0% 95%), hsl(48 100% 70%), hsl(0 0% 95%))",
  };

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {/* outer ambient bloom */}
      <div
        aria-hidden
        className="absolute -inset-2 rounded-full blur-2xl opacity-40 pointer-events-none"
        style={{ background: ringColors[tier] }}
      />
      {/* rotating sigil ring */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full p-[2.5px] animate-[aura-spin_14s_linear_infinite]"
        style={{ background: ringColors[tier] }}
      >
        <div className="h-full w-full rounded-full bg-background" />
      </div>
      {/* counter-rotating thin inner arc */}
      <div
        aria-hidden
        className="absolute inset-[3px] rounded-full p-[1px] opacity-70 animate-[aura-spin_22s_linear_infinite] [animation-direction:reverse]"
        style={{
          background:
            "conic-gradient(from 90deg, transparent 0deg, hsl(0 0% 100% / 0.6) 60deg, transparent 120deg, transparent 360deg)",
        }}
      >
        <div className="h-full w-full rounded-full bg-transparent" />
      </div>
      {/* avatar */}
      <div className="absolute inset-[5px] rounded-full overflow-hidden bg-muted grid place-items-center">
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-foreground/80 font-semibold" style={{ fontSize: size * 0.32 }}>
            {initials ?? "·"}
          </span>
        )}
      </div>
    </div>
  );
};
