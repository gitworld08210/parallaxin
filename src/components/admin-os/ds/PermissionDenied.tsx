import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface PermissionDeniedProps {
  message?: string;
  className?: string;
}

/**
 * Standard "no access" surface. Use inside a page when the current
 * admin can view the module but not this specific view.
 */
export function PermissionDenied({
  message = "You don't have permission to view this content.",
  className,
}: PermissionDeniedProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card px-6 py-14 text-center",
        className,
      )}
    >
      <div className="rounded-full bg-warning/10 p-3 text-warning">
        <ShieldAlert className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">Access restricted</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
