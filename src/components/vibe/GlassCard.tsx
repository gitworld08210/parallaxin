import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export const GlassCard = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "glass rounded-2xl p-5 shadow-soft transition-all duration-500",
      className,
    )}
    {...props}
  />
);
