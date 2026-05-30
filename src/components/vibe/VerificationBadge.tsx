import { cn } from "@/lib/utils";
import { BadgeCheck, Crown, Landmark, Sparkles, Star, Newspaper } from "lucide-react";

const map: Record<string, { icon: typeof BadgeCheck; color: string; label: string }> = {
  verified: { icon: BadgeCheck, color: "text-verified", label: "Verified" },
  creator: { icon: Sparkles, color: "text-creator", label: "Creator" },
  public_figure: { icon: Sparkles, color: "text-creator", label: "Creator" },
  gov: { icon: Landmark, color: "text-gov", label: "Government" },
  government: { icon: Landmark, color: "text-gov", label: "Government" },
  brand: { icon: Star, color: "text-brand", label: "Brand" },
  business: { icon: Star, color: "text-brand", label: "Brand" },
  founder: { icon: Crown, color: "text-founder", label: "Founder" },
  media: { icon: Newspaper, color: "text-verified", label: "Standard" },
};

export const VerificationBadge = ({ kind, className }: { kind: string; className?: string }) => {
  const entry = map[kind] ?? map.verified;
  const { icon: Icon, color, label } = entry;
  return (
    <span
      title={label}
      className={cn("inline-flex items-center justify-center", color, className)}
    >
      <Icon className="h-4 w-4" strokeWidth={2.5} />
    </span>
  );
};
