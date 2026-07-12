import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

/**
 * Standard container for grouped content inside a page. Replaces
 * one-off card wrappers so surface color, border radius, and header
 * spacing stay uniform.
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/60 bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}
