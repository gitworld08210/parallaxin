import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useDepartmentCapacity,
  useUpsertCapacity,
  type DepartmentCapacityRow,
} from "@/hooks/admin-os/useOrganization";
import {
  PageHeader,
  SectionCard,
  DataTable,
  type DataTableColumn,
  StatusBadge,
} from "@/components/admin-os/ds";

const HEALTH_TONE: Record<
  DepartmentCapacityRow["health"],
  "success" | "warning" | "danger" | "neutral"
> = {
  healthy: "success",
  watch: "warning",
  overloaded: "danger",
  under: "warning",
};

const HEALTH_LABEL: Record<DepartmentCapacityRow["health"], string> = {
  healthy: "Healthy",
  watch: "At capacity",
  overloaded: "Overloaded",
  under: "Below target",
};

const CapacityRowEditor = ({
  row,
  canManage,
}: {
  row: DepartmentCapacityRow;
  canManage: boolean;
}) => {
  const [maxVal, setMax] = useState(row.max_capacity);
  const [targetVal, setTarget] = useState(row.target_capacity);
  const [notes, setNotes] = useState(row.notes ?? "");
  const upsert = useUpsertCapacity();

  const save = () => {
    upsert.mutate(
      {
        department_id: row.department_id,
        max_capacity: Number(maxVal) || 0,
        target_capacity: Number(targetVal) || 0,
        notes: notes || null,
      },
      {
        onSuccess: () => toast.success(`${row.department_name} capacity saved`),
        onError: (e: any) => toast.error(e.message ?? "Save failed"),
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min={0}
        value={targetVal}
        disabled={!canManage}
        onChange={(e) => setTarget(Number(e.target.value))}
        className="w-16 h-8 px-2 rounded-md bg-background border border-border/60 text-xs"
        aria-label="Target capacity"
      />
      <span className="text-[10px] text-muted-foreground">/</span>
      <input
        type="number"
        min={0}
        value={maxVal}
        disabled={!canManage}
        onChange={(e) => setMax(Number(e.target.value))}
        className="w-16 h-8 px-2 rounded-md bg-background border border-border/60 text-xs"
        aria-label="Max capacity"
      />
      <input
        type="text"
        value={notes}
        disabled={!canManage}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        className="w-40 h-8 px-2 rounded-md bg-background border border-border/60 text-xs"
      />
      {canManage && (
        <button
          type="button"
          onClick={save}
          disabled={upsert.isPending}
          className="inline-flex items-center gap-1 h-8 px-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-3 w-3" /> Save
        </button>
      )}
    </div>
  );
};

const CapacityDashboard = () => {
  const { hasPermission } = useEmployee();
  const { data, isLoading, error } = useDepartmentCapacity();

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ORG_VIEW))
    return <Navigate to="/admin-os/no-access" replace />;

  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_CAPACITY_MANAGE);

  const columns: DataTableColumn<DepartmentCapacityRow>[] = [
    {
      key: "dept",
      header: "Department",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.department_name}</p>
          <p className="text-[11px] text-muted-foreground font-mono">{r.department_key}</p>
        </div>
      ),
    },
    {
      key: "headcount",
      header: "Current",
      align: "right",
      cell: (r) => <span className="tabular-nums font-semibold">{r.current_headcount}</span>,
    },
    {
      key: "vacancies",
      header: "Vacancies",
      align: "right",
      cell: (r) => <span className="tabular-nums">{r.vacancies}</span>,
    },
    {
      key: "pct",
      header: "Utilisation",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full ${
                r.capacity_pct > 100
                  ? "bg-red-500"
                  : r.capacity_pct >= 90
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, r.capacity_pct)}%` }}
            />
          </div>
          <span className="tabular-nums text-xs">{r.capacity_pct}%</span>
        </div>
      ),
    },
    {
      key: "health",
      header: "Health",
      cell: (r) => <StatusBadge tone={HEALTH_TONE[r.health]}>{HEALTH_LABEL[r.health]}</StatusBadge>,
    },
    {
      key: "edit",
      header: canManage ? "Target / Max" : "Target / Max (read-only)",
      cell: (r) => <CapacityRowEditor row={r} canManage={canManage} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Organization"
        title="Department Capacity"
        description="Current headcount vs target and max capacity, refreshed from live employee data."
        actions={
          <Link
            to="/admin-os/people-ops/org"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to Organization
          </Link>
        }
      />
      <SectionCard padded={false}>
        {error ? (
          <div className="p-6 text-sm text-destructive">{(error as Error).message}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={data ?? []}
            rowKey={(r) => r.department_id}
            loading={isLoading}
            empty={{
              title: "No departments yet",
              description: "Add a department to start planning capacity.",
            }}
          />
        )}
      </SectionCard>
    </div>
  );
};

export default CapacityDashboard;
