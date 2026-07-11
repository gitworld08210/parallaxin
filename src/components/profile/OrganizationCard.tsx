import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, Building2, Crown } from "lucide-react";
import type { WorkspaceSummary } from "@/types/organization/organization";
import { cn } from "@/lib/utils";

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "—";

const roleOf = (m: WorkspaceSummary) =>
  m.is_owner ? "Owner" : m.role_names[0] ?? "Member";

interface Props {
  membership: WorkspaceSummary;
  primary?: boolean;
  className?: string;
}

/** Rich organization card. Replaces the old compact chip. */
export const OrganizationCard = ({ membership: m, primary, className }: Props) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={cn(
        "group relative rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 transition-shadow hover:shadow-lg",
        primary && "ring-1 ring-primary/30",
        className,
      )}
    >
      {primary && (
        <span className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wider shadow-sm">
          <Crown className="h-3 w-3" strokeWidth={2.5} />
          Primary
        </span>
      )}

      <div className="flex items-start gap-3">
        {m.logo_url ? (
          <img
            src={m.logo_url}
            alt=""
            className="h-12 w-12 rounded-xl object-cover ring-1 ring-border shrink-0"
          />
        ) : (
          <div className="h-12 w-12 rounded-xl bg-secondary grid place-items-center ring-1 ring-border shrink-0">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold leading-tight">
            <span className="truncate">{m.name}</span>
            {m.verified && (
              <BadgeCheck
                className="h-4 w-4 text-primary shrink-0"
                strokeWidth={2.5}
                aria-label="Verified organization"
              />
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{roleOf(m)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Member since {formatDate(m.joined_at)}</span>
        {m.org_type && (
          <span className="capitalize opacity-80">
            {m.org_type.replace(/_/g, " ")}
          </span>
        )}
      </div>

      <Link
        to={`/organization/${m.slug}/dashboard`}
        className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-secondary text-foreground text-xs font-semibold transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:bg-primary/10 group-hover:text-primary"
      >
        Open organization
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </motion.div>
  );
};

export default OrganizationCard;
