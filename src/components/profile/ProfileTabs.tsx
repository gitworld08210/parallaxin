import { LayoutGroup, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export interface ProfileTabDef<T extends string = string> {
  id: T;
  label: string;
  icon: LucideIcon;
}

interface Props<T extends string> {
  tabs: ProfileTabDef<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  /** Sticky offset (px) — matches TopBar height. */
  stickyTop?: number;
}

/** Sticky animated tab bar with a shared indicator. */
export function ProfileTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  stickyTop = 56,
}: Props<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the active tab visible on horizontal scroll.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${value}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [value]);

  return (
    <div
      className={cn(
        "sticky z-20 -mx-4 sm:mx-0 border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70",
        className,
      )}
      style={{ top: stickyTop }}
      role="tablist"
      aria-label="Profile sections"
    >
      <LayoutGroup id="profile-tabs">
        <div
          ref={listRef}
          className="flex overflow-x-auto no-scrollbar px-2"
        >
          {tabs.map((t) => {
            const active = value === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                data-tab-id={t.id}
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                id={`tab-${t.id}`}
                onClick={() => onChange(t.id)}
                className={cn(
                  "relative shrink-0 inline-flex items-center gap-1.5 px-4 h-12 text-sm font-medium transition-colors focus-visible:outline-none",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                <span>{t.label}</span>
                {active && (
                  <motion.span
                    layoutId="profile-tab-underline"
                    className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}

export default ProfileTabs;
