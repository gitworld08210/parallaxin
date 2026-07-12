import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}

const DELTA_CLASS: Record<NonNullable<StatCardProps["deltaTone"]>, string> = {
  up: "text-success",
  down: "text-danger",
  flat: "text-muted-foreground",
};

/**
 * Uniform metric tile for dashboards and overview grids.
 */
export function StatCard({
  label,
  value,
  delta,
  deltaTone = "flat",
  icon: Icon,
  loading,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
      <div className="mt-2">
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className="text-2xl font-semibold tabular-nums text-foreground">{value}</div>
        )}
        {delta && !loading ? (
          <div className={cn("mt-1 text-xs font-medium", DELTA_CLASS[deltaTone])}>{delta}</div>
        ) : null}
      </div>
    </div>
  );
}
