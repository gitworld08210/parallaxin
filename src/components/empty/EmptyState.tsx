import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type CTA =
  | { label: string; to: string; onClick?: never }
  | { label: string; onClick: () => void; to?: never };

export const EmptyState = ({
  icon: Icon,
  title,
  subtitle,
  cta,
  className,
  size = "md",
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  cta?: CTA;
  className?: string;
  size?: "sm" | "md" | "lg";
}) => {
  const padding = size === "sm" ? "py-10" : size === "lg" ? "py-24" : "py-16";
  const iconSize = size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const iconInner = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div className={cn("text-center px-6", padding, className)}>
      {Icon && (
        <div className={cn("mx-auto mb-4 grid place-items-center rounded-full border border-border bg-card", iconSize)}>
          <Icon className={cn("text-muted-foreground", iconInner)} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">{subtitle}</p>}
      {cta && (
        <div className="mt-5">
          {cta.to ? (
            <Link
              to={cta.to}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
            >
              {cta.label}
            </Link>
          ) : (
            <button
              onClick={cta.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
            >
              {cta.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
