import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: { title: string; description?: string };
  onRowClick?: (row: T) => void;
  className?: string;
}

const ALIGN_CLASS = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

/**
 * Minimal, uniform table wrapper. Sorting, filtering, and pagination
 * are handled by the caller (or a higher-order data-grid). This owns
 * only rendering, empty and loading states.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (loading) return <LoadingSkeleton rows={5} />;
  if (rows.length === 0)
    return <EmptyState title={empty?.title ?? "No results"} description={empty?.description} />;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/60 bg-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-4 py-2 font-medium",
                    ALIGN_CLASS[c.align ?? "left"],
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-t border-border/60 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/40",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-2.5 text-foreground",
                      ALIGN_CLASS[c.align ?? "left"],
                      c.className,
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
