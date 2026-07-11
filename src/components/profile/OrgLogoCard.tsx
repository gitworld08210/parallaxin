import { Link } from "react-router-dom";
import { BadgeCheck, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import type { WorkspaceSummary } from "@/types/organization/organization";
import { cn } from "@/lib/utils";

interface Props {
  membership: WorkspaceSummary;
  className?: string;
}

/** Compact organization logo card — X-style affiliated org tile. */
export const OrgLogoCard = ({ membership: m, className }: Props) => {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn("shrink-0", className)}
    >
      <Link
        to={`/organization/${m.slug}/dashboard`}
        className="flex items-center gap-2.5 rounded-xl border border-border bg-card/60 hover:bg-secondary/60 transition-colors px-2.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open ${m.name}`}
      >
        {m.logo_url ? (
          <img src={m.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-border" />
        ) : (
          <div className="h-9 w-9 rounded-lg bg-secondary grid place-items-center ring-1 ring-border">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 pr-1">
          <p className="text-xs font-semibold leading-tight truncate max-w-[140px] inline-flex items-center gap-1">
            <span className="truncate">{m.name}</span>
            {m.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={2.5} />}
          </p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
            {m.is_owner ? "Owner" : m.role_names[0] ?? "Member"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
};

export default OrgLogoCard;
