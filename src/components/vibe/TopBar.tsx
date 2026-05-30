import { cn } from "@/lib/utils";

export const TopBar = ({
  title,
  subtitle,
  right,
  className,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) => {
  return (
    <header className={cn("h-14 px-4 flex items-center justify-between gap-3 border-b border-border", className)}>
      <div className="min-w-0 flex items-baseline gap-2">
        {title && (
          <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate hidden sm:block">{subtitle}</p>
        )}
      </div>
      {right && <div className="flex items-center gap-1 shrink-0">{right}</div>}
    </header>
  );
};
