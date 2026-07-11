import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2 } from "lucide-react";
import type { WorkspaceSummary } from "@/types/organization/organization";
import { EmptyState } from "@/components/empty/EmptyState";
import { OrganizationCard } from "./OrganizationCard";
import { cn } from "@/lib/utils";

interface Props {
  memberships: WorkspaceSummary[];
  /** compact = preview mode (max 3 + "+N more"). Full = show all. */
  variant?: "compact" | "full";
  className?: string;
}

const MAX_PREVIEW = 3;

/**
 * Redesigned affiliation section — rich cards, primary pinned first,
 * expand-in-place when there are more than 3.
 */
export const OrganizationsSection = ({
  memberships,
  variant = "compact",
  className,
}: Props) => {
  const [expanded, setExpanded] = useState(variant === "full");

  if (!memberships.length) {
    return (
      <div className={className}>
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          subtitle="Affiliated organizations will appear here."
          size="sm"
        />
      </div>
    );
  }

  const showAll = expanded || variant === "full";
  const visible = showAll ? memberships : memberships.slice(0, MAX_PREVIEW);
  const remaining = memberships.length - MAX_PREVIEW;

  return (
    <section
      aria-label="Affiliated organizations"
      className={cn("space-y-3", className)}
    >
      <div
        className={cn(
          "grid gap-3",
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        <AnimatePresence initial={false}>
          {visible.map((m, i) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
            >
              <OrganizationCard membership={m} primary={i === 0} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {variant === "compact" && remaining > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 hover:bg-secondary px-4 h-9 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : `Show ${remaining} more`}
          </button>
        </div>
      )}
    </section>
  );
};

export default OrganizationsSection;
