import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useDepartments } from "@/hooks/admin-os/useEmployees";
import {
  useWorkforceForecasts,
  useUpsertForecast,
  useDeleteForecast,
  useDepartmentCapacity,
  type WorkforceForecast,
} from "@/hooks/admin-os/useOrganization";
import {
  PageHeader,
  SectionCard,
  DataTable,
  type DataTableColumn,
} from "@/components/admin-os/ds";

const WorkforcePlanning = () => {
  const { hasPermission } = useEmployee();
  const { data: forecasts, isLoading, error } = useWorkforceForecasts();
  const { data: capacity } = useDepartmentCapacity();
  const { data: departments } = useDepartments();
  const [editing, setEditing] = useState<Partial<WorkforceForecast> | null>(null);
  const upsert = useUpsertForecast();
  const del = useDeleteForecast();

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ORG_VIEW))
    return <Navigate to="/admin-os/no-access" replace />;
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ORG_MANAGE);

  const currentByDept = useMemo(() => {
    const m = new Map<string, number>();
    capacity?.forEach((c) => m.set(c.department_id, c.current_headcount));
    return m;
  }, [capacity]);

  const columns: DataTableColumn<WorkforceForecast>[] = [
    {
      key: "dept",
      header: "Department",
      cell: (r) => <span className="font-medium">{r.department?.name ?? "—"}</span>,
    },
    {
      key: "period",
      header: "Period",
      cell: (r) => (
        <span className="text-xs">
          {new Date(r.period_start).toLocaleDateString()} → {new Date(r.period_end).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "current",
      header: "Current",
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {currentByDept.get(r.department_id) ?? 0}
        </span>
      ),
    },
    {
      key: "planned",
      header: "Planned",
      align: "right",
      cell: (r) => <span className="tabular-nums font-semibold">{r.planned_headcount}</span>,
    },
    {
      key: "delta",
      header: "Δ",
      align: "right",
      cell: (r) => {
        const current = currentByDept.get(r.department_id) ?? 0;
        const delta = r.planned_headcount - current;
        return (
          <span
            className={`tabular-nums font-semibold ${
              delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {delta > 0 ? `+${delta}` : delta}
          </span>
        );
      },
    },
    {
      key: "notes",
      header: "Notes",
      cell: (r) => (
        <span className="text-xs text-muted-foreground truncate max-w-[240px] inline-block">
          {r.notes ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-1">
          {canManage && (
            <>
              <button
                onClick={() => setEditing(r)}
                className="px-2 h-7 rounded border border-border bg-background text-[11px] font-medium hover:bg-muted"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this forecast?"))
                    del.mutate(r.id, { onSuccess: () => toast.success("Deleted") });
                }}
                className="px-2 h-7 rounded border border-border bg-background text-[11px] font-medium hover:bg-muted"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const submit = () => {
    if (!editing?.department_id || !editing.period_start || !editing.period_end) {
      toast.error("Department and period are required");
      return;
    }
    upsert.mutate(editing as any, {
      onSuccess: () => {
        toast.success("Forecast saved");
        setEditing(null);
      },
      onError: (e: any) => toast.error(e.message ?? "Save failed"),
    });
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Organization"
        title="Workforce Planning"
        description="Forecast planned headcount per department over time."
        actions={
          <>
            <Link
              to="/admin-os/people-ops/org"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              ← Back
            </Link>
            {canManage && (
              <button
                onClick={() =>
                  setEditing({
                    department_id: departments?.[0]?.id,
                    period_start: today,
                    period_end: today,
                    planned_headcount: 0,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> New forecast
              </button>
            )}
          </>
        }
      />

      <SectionCard padded={false}>
        {error ? (
          <div className="p-6 text-sm text-destructive">{(error as Error).message}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={forecasts ?? []}
            rowKey={(r) => r.id}
            loading={isLoading}
            empty={{
              title: "No forecasts yet",
              description: "Create a forecast to plan future workforce needs.",
            }}
          />
        )}
      </SectionCard>

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
              <h3 className="text-sm font-semibold">
                {editing.id ? "Edit forecast" : "New workforce forecast"}
              </h3>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Department</span>
                <select
                  value={editing.department_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, department_id: e.target.value })}
                  className="mt-1 w-full h-9 px-2 rounded-lg bg-background border border-border/60 text-sm"
                >
                  {departments?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Period start</span>
                  <input
                    type="date"
                    value={editing.period_start ?? ""}
                    onChange={(e) => setEditing({ ...editing, period_start: e.target.value })}
                    className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Period end</span>
                  <input
                    type="date"
                    value={editing.period_end ?? ""}
                    onChange={(e) => setEditing({ ...editing, period_end: e.target.value })}
                    className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Planned headcount</span>
                <input
                  type="number"
                  min={0}
                  value={editing.planned_headcount ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, planned_headcount: Number(e.target.value) })
                  }
                  className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Notes</span>
                <textarea
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={2}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm"
                />
              </label>
            </div>
            <div className="px-5 py-3 border-t border-border/60 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-3 h-8 rounded border border-border bg-background text-xs font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={upsert.isPending}
                className="px-3 h-8 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkforcePlanning;
