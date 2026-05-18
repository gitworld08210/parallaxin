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
    <header className={cn("px-5 pt-6 pb-4 flex items-end justify-between gap-4", className)}>
      <div>
        {subtitle && (
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
            {subtitle}
          </p>
        )}
        {title && (
          <h1 className="font-display text-3xl font-semibold leading-tight">
            {title}
          </h1>
        )}
      </div>
      {right}
    </header>
  );
};
