/**
 * Aurelix Admin OS — Design System tokens.
 *
 * The single source of truth for status, tone, and severity styling
 * used by every shared component. No module may hardcode these.
 */

export type StatusTone =
  | "active"
  | "inactive"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "archived"
  | "completed"
  | "cancelled"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

/**
 * Tailwind class fragments per tone. All colors reference semantic
 * design-system tokens defined in `src/index.css` (no raw hex).
 */
export const TONE_CLASSES: Record<StatusTone, string> = {
  active:     "bg-success/15 text-success border-success/30",
  approved:   "bg-success/15 text-success border-success/30",
  completed:  "bg-success/15 text-success border-success/30",
  success:    "bg-success/15 text-success border-success/30",

  pending:    "bg-warning/15 text-warning border-warning/30",
  warning:    "bg-warning/15 text-warning border-warning/30",

  rejected:   "bg-danger/15 text-danger border-danger/30",
  suspended:  "bg-danger/15 text-danger border-danger/30",
  cancelled:  "bg-danger/15 text-danger border-danger/30",
  danger:     "bg-danger/15 text-danger border-danger/30",

  info:       "bg-primary/15 text-primary border-primary/30",

  inactive:   "bg-muted text-muted-foreground border-border",
  archived:   "bg-muted text-muted-foreground border-border",
  neutral:    "bg-muted text-muted-foreground border-border",
};

export const TONE_LABELS: Record<StatusTone, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
  archived: "Archived",
  completed: "Completed",
  cancelled: "Cancelled",
  info: "Info",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
  neutral: "Neutral",
};
