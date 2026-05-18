import { cn } from "@/lib/utils";

interface AuraAvatarProps {
  gradient: string;
  initials?: string;
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
  className?: string;
}

const sizes = {
  sm: "h-10 w-10 text-xs",
  md: "h-14 w-14 text-sm",
  lg: "h-24 w-24 text-lg",
  xl: "h-32 w-32 text-2xl",
};

export const AuraAvatar = ({ gradient, initials = "VN", size = "md", glow = false, className }: AuraAvatarProps) => {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {glow && (
        <div
          className={cn(
            "absolute inset-0 -m-1.5 rounded-full aura-ring opacity-80 blur-[2px]",
          )}
          aria-hidden
        />
      )}
      <div
        className={cn(
          "relative rounded-full ring-2 ring-background flex items-center justify-center font-display font-semibold text-foreground",
          sizes[size],
        )}
        style={{ backgroundImage: gradient }}
      >
        {initials}
      </div>
    </div>
  );
};
