import type { LucideIcon } from "lucide-react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItemProps {
  icon?: LucideIcon;
  title: string;
  meta?: string;
  timestamp?: string;
  className?: string;
}

/**
 * Uniform row for activity feeds and audit lists.
 */
export function ActivityItem({
  icon: Icon = Activity,
  title,
  meta,
  timestamp,
  className,
}: ActivityItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3",
        className,
      )}
    >
      <div className="mt-0.5 rounded-full bg-muted p-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{title}</div>
        {meta ? <div className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</div> : null}
      </div>
      {timestamp ? (
        <time className="shrink-0 text-xs tabular-nums text-muted-foreground">{timestamp}</time>
      ) : null}
    </div>
  );
}
