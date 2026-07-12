/**
 * Aurelix Admin OS — Design System barrel.
 *
 * The single import surface for shared enterprise components.
 * Every future module must import UI primitives from here instead
 * of building duplicate wrappers.
 *
 *   import { PageHeader, StatCard, StatusBadge } from "@/components/admin-os/ds";
 */

export * from "./tokens";
export { PageHeader } from "./PageHeader";
export { SectionCard } from "./SectionCard";
export { StatCard } from "./StatCard";
export { StatusBadge } from "./StatusBadge";
export { EmptyState } from "./EmptyState";
export { ErrorState } from "./ErrorState";
export { LoadingSkeleton } from "./LoadingSkeleton";
export { PermissionDenied } from "./PermissionDenied";
export { Toolbar } from "./Toolbar";
export { DataTable, type DataTableColumn } from "./DataTable";
export { ConfirmDialog } from "./ConfirmDialog";
export { ActivityItem } from "./ActivityItem";
