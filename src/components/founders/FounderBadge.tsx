import { cn } from "@/lib/utils";

type Tier = "founder" | "council" | "genesis";

/**
 * Premium animated neural sigil. Not a check mark.
 * A small geometric mark with pulsing aura — meant to feel rare.
 */
export const FounderBadge = ({
  tier = "founder",
  size = 14,
  className,
}: { tier?: Tier; size?: number; className?: string }) => {
  const color =
    tier === "genesis" ? "hsl(48 100% 70%)"
    : tier === "council" ? "hsl(265 80% 70%)"
    : "hsl(48 100% 60%)";

  return (
    <span
      className={cn("relative inline-flex items-center justify-center align-middle", className)}
      style={{ width: size, height: size }}
      title={tier === "genesis" ? "Genesis Founder" : tier === "council" ? "Founder Council" : "Founder"}
    >
      {/* pulse halo */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full opacity-60 animate-[founder-pulse_2.4s_ease-in-out_infinite]"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
      />
      <svg viewBox="0 0 24 24" width={size} height={size} className="relative">
        <defs>
          <linearGradient id={`fg-${tier}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="hsl(0 0% 100%)" />
          </linearGradient>
        </defs>
        {/* hexagonal sigil */}
        <polygon
          points="12,2 21,7 21,17 12,22 3,17 3,7"
          fill={`url(#fg-${tier})`}
          stroke="hsl(0 0% 5%)"
          strokeWidth="1"
        />
        {/* inner neural node */}
        <circle cx="12" cy="12" r="2.4" fill="hsl(0 0% 5%)" />
        <circle cx="12" cy="12" r="1.1" fill={color} />
      </svg>
    </span>
  );
};
