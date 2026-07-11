import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/format";
import { useCountUp } from "./useCountUp";

export interface ProfileStat {
  key: string;
  label: string;
  value: number;
  to?: string;
}

interface Props {
  stats: ProfileStat[];
  className?: string;
}

/** Animated stat row. Values count up on mount. */
export const ProfileStats = ({ stats, className }: Props) => {
  return (
    <motion.div
      role="list"
      aria-label="Profile statistics"
      className={cn(
        "grid grid-cols-3 sm:grid-cols-5 gap-2 rounded-2xl border border-border bg-card p-3",
        className,
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {stats.map((s, i) => (
        <StatCell key={s.key} stat={s} index={i} />
      ))}
    </motion.div>
  );
};

const StatCell = ({ stat, index }: { stat: ProfileStat; index: number }) => {
  const animated = useCountUp(stat.value, 700 + index * 90);
  const inner = (
    <div role="listitem" className="px-2 py-1.5 text-center rounded-xl transition-colors hover:bg-secondary/40">
      <p className="text-xl font-bold leading-tight tracking-tight tabular-nums">
        {fmt(animated)}
      </p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
        {stat.label}
      </p>
    </div>
  );
  return stat.to ? (
    <Link
      to={stat.to}
      className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${stat.value} ${stat.label}`}
    >
      {inner}
    </Link>
  ) : (
    inner
  );
};

export default ProfileStats;
