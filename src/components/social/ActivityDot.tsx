// Small green dot rendered when user has been active within `withinMs` (default 2 min).
// Hidden if last_seen_at is null.
export const ActivityDot = ({
  lastSeenAt, className = "", withinMs = 120_000,
}: { lastSeenAt?: string | null; className?: string; withinMs?: number }) => {
  if (!lastSeenAt) return null;
  const ago = Date.now() - new Date(lastSeenAt).getTime();
  if (ago > withinMs) return null;
  return (
    <span className={`block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background ${className}`} />
  );
};
