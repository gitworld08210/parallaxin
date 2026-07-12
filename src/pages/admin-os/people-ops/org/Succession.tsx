import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { useEmployeesList, useDepartments } from "@/hooks/admin-os/useEmployees";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useSuccessionPlans,
  useUpsertSuccession,
  useDeleteSuccession,
  type SuccessionPlan,
} from "@/hooks/admin-os/useOrganization";
import {
  PageHeader,
  SectionCard,
  DataTable,
  type DataTableColumn,
  StatusBadge,
} from "@/components/admin-os/ds";

const SCOPE_LABEL: Record<SuccessionPlan["scope"], string> = {
  department_head: "Department Head",
  deputy_head: "Deputy Head",
  team_lead: "Team Lead",
  specialist: "Specialist",
};

const READINESS_LABEL: Record<SuccessionPlan["readiness_level"], string> = {
  not_ready: "Not ready",
  dev_1y: "1y development",
  dev_6m: "6m development",
  ready_now: "Ready now",
};

const READINESS_TONE: Record<
  SuccessionPlan["readiness_level"],
  "success" | "warning" | "danger" | "neutral"
> = {
  not_ready: "danger",
  dev_1y: "warning",
  dev_6m: "warning",
  ready_now: "success",
};

const Succession = () => {
  const { hasPermission } = useEmployee();
  const { data: plans, isLoading, error } = useSuccessionPlans();
  const { data: employees } = useEmployeesList();
  const { data: departments } = useDepartments();
  const [editing, setEditing] = useState<Partial<SuccessionPlan> | null>(null);
  const upsert = useUpsertSuccession();
  const del = useDeleteSuccession();

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ORG_VIEW))
    return <Navigate to="/admin-os/no-access" replace />;
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_SUCCESSION_MANAGE);

  const empName = (id: string | null | undefined) =>
    employees?.find((e) => e.id === id)?.full_name ?? "—";

  const stats = useMemo(() => {
    const arr = plans ?? [];
    return {
      total: arr.length,
      covered: arr.filter((p) => !!p.primary_successor_id).length,
      readyNow: arr.filter((p) => p.readiness_level === "ready_now").length,
    };
  }, [plans]);

  const columns: DataTableColumn<SuccessionPlan>[] = [
    {
      key: "scope",
      header: "Scope",
      cell: (r) => (
        <div>
          <p className="font-medium">{SCOPE_LABEL[r.scope]}</p>
          <p className="text-[11px] text-muted-foreground">{r.department?.name ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "incumbent",
      header: "Incumbent",
      cell: (r) => (
        <div>
          <p className="text-sm">{r.incumbent?.full_name ?? "—"}</p>
          <p className="text-[10px] font-mono text-muted-foreground">
            {r.incumbent?.employee_number}
          </p>
        </div>
      ),
    },
    {
      key: "primary",
      header: "Primary successor",
      cell: (r) => <span className="text-sm">{r.primary_successor?.full_name ?? "—"}</span>,
    },
    {
      key: "secondary",
      header: "Secondary",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.secondary_successor?.full_name ?? "—"}
        </span>
      ),
    },
    {
      key: "readiness",
      header: "Readiness",
      cell: (r) => (
        <div>
          <StatusBadge tone={READINESS_TONE[r.readiness_level]}>
            {READINESS_LABEL[r.readiness_level]}
          </StatusBadge>
          <div className="mt-1 h-1 w-24 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${r.training_progress}%` }}
            />
          </div>
        </div>
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
                  if (confirm("Delete this succession plan?"))
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
    if (!editing?.scope || !editing.incumbent_employee_id) {
      toast.error("Scope and incumbent are required");
      return;
    }
    upsert.mutate(editing as any, {
      onSuccess: () => {
        toast.success("Succession plan saved");
        setEditing(null);
      },
      onError: (e: any) => toast.error(e.message ?? "Save failed"),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Organization"
        title="Succession Planning"
        description="Track primary and secondary successors for every critical role."
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
                    scope: "department_head",
                    readiness_level: "not_ready",
                    training_progress: 0,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> New plan
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Plans", value: stats.total },
          { label: "Primary covered", value: stats.covered },
          { label: "Ready now", value: stats.readyNow },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <SectionCard padded={false}>
        {error ? (
          <div className="p-6 text-sm text-destructive">{(error as Error).message}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={plans ?? []}
            rowKey={(r) => r.id}
            loading={isLoading}
            empty={{
              title: "No succession plans yet",
              description: "Add one for each critical role.",
            }}
          />
        )}
      </SectionCard>

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
              <h3 className="text-sm font-semibold">
                {editing.id ? "Edit succession plan" : "New succession plan"}
              </h3>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Scope</span>
                  <select
                    value={editing.scope ?? "department_head"}
                    onChange={(e) => setEditing({ ...editing, scope: e.target.value as any })}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-background border border-border/60 text-sm"
                  >
                    {Object.entries(SCOPE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Department</span>
                  <select
                    value={editing.department_id ?? ""}
                    onChange={(e) => setEditing({ ...editing, department_id: e.target.value || null })}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-background border border-border/60 text-sm"
                  >
                    <option value="">—</option>
                    {departments?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Incumbent</span>
                <select
                  value={editing.incumbent_employee_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, incumbent_employee_id: e.target.value })}
                  className="mt-1 w-full h-9 px-2 rounded-lg bg-background border border-border/60 text-sm"
                >
                  <option value="">Select employee…</option>
                  {employees?.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} · {e.employee_number}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Primary successor</span>
                  <select
                    value={editing.primary_successor_id ?? ""}
                    onChange={(e) => setEditing({ ...editing, primary_successor_id: e.target.value || null })}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-background border border-border/60 text-sm"
                  >
                    <option value="">—</option>
                    {employees?.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Secondary</span>
                  <select
                    value={editing.secondary_successor_id ?? ""}
                    onChange={(e) => setEditing({ ...editing, secondary_successor_id: e.target.value || null })}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-background border border-border/60 text-sm"
                  >
                    <option value="">—</option>
                    {employees?.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Readiness</span>
                  <select
                    value={editing.readiness_level ?? "not_ready"}
                    onChange={(e) => setEditing({ ...editing, readiness_level: e.target.value as any })}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-background border border-border/60 text-sm"
                  >
                    {Object.entries(READINESS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">
                    Training progress ({editing.training_progress ?? 0}%)
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editing.training_progress ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, training_progress: Number(e.target.value) })
                    }
                    className="mt-3 w-full"
                  />
                </label>
              </div>
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

// keep unused import from tree-shaking removal
void empName;
export default Succession;
