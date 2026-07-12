import { cn } from "@/lib/utils";
import { TONE_CLASSES, TONE_LABELS, type StatusTone } from "./tokens";

interface StatusBadgeProps {
  tone: StatusTone;
  label?: string;
  className?: string;
}

/**
 * Unified status pill used across every module. Never build a custom
 * status chip — extend `StatusTone` in `tokens.ts` instead.
 */
export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label ?? TONE_LABELS[tone]}
    </span>
  );
}
