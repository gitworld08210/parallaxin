import { cn } from "@/lib/utils";
import { VerificationKind } from "@/lib/mock";
import { BadgeCheck, Crown, Landmark, Sparkles, Star } from "lucide-react";

const map: Record<VerificationKind, { icon: typeof BadgeCheck; color: string; label: string }> = {
  verified: { icon: BadgeCheck, color: "text-verified", label: "Verified" },
  creator: { icon: Sparkles, color: "text-creator", label: "Creator" },
  gov: { icon: Landmark, color: "text-gov", label: "Government" },
  brand: { icon: Star, color: "text-brand", label: "Brand" },
  founder: { icon: Crown, color: "text-founder", label: "Founder" },
};

export const VerificationBadge = ({ kind, className }: { kind: VerificationKind; className?: string }) => {
  const { icon: Icon, color, label } = map[kind];
  return (
    <span
      title={label}
      className={cn("inline-flex items-center justify-center", color, className)}
    >
      <Icon className="h-4 w-4" strokeWidth={2.5} />
    </span>
  );
};
