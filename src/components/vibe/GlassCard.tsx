import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export const GlassCard = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "liquid-glass liquid-hover p-5",
      className,
    )}
    {...props}
  />
);
