import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabDef<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  tabs: TabDef<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Sticky offset in px (below top bar). */
  stickyTop?: number;
}

/** X-style sticky tab bar — equal-width tabs, animated underline. */
export const StickyTabs = <T extends string>({ tabs, value, onChange, stickyTop = 56 }: Props<T>) => {
  return (
    <div
      className="sticky z-20 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 border-b border-border"
      style={{ top: stickyTop }}
    >
      <div role="tablist" className="flex overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const active = value === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              id={`tab-${t.id}`}
              aria-controls={`panel-${t.id}`}
              onClick={() => onChange(t.id)}
              className={cn(
                "relative flex-1 min-w-[90px] px-4 h-12 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-none",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="relative inline-flex h-full items-center justify-center">
                {t.label}
                {active && (
                  <motion.span
                    layoutId="profile-tab-underline"
                    className="absolute -bottom-px left-0 right-0 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StickyTabs;
