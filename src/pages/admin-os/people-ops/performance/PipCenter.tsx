import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useImprovementPlans,
  useUpsertPip,
  type PipStatus,
  type ImprovementPlan,
} from "@/hooks/admin-os/usePerformance";
import { useEmployeesList } from "@/hooks/admin-os/useEmployees";
import {
  PageHeader,
  SectionCard,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  StatusBadge,
  type DataTableColumn,
} from "@/components/admin-os/ds";

const PIP_TONE: Record<PipStatus, "info" | "warning" | "success" | "danger" | "neutral"> = {
  draft: "neutral",
  active: "info",
  on_track: "success",
  off_track: "warning",
  completed: "success",
  failed: "danger",
  cancelled: "neutral",
};

const STATUSES: PipStatus[] = ["draft", "active", "on_track", "off_track", "completed", "failed", "cancelled"];

const PipCenter = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_MANAGE);
  const canView =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_VIEW) || canManage;

  const list = useImprovementPlans();
  const employees = useEmployeesList({});
  const upsert = useUpsertPip();

  const [form, setForm] = useState<Partial<ImprovementPlan>>({
    status: "draft",
    progress: 0,
    review_dates: [],
  });
  const [editing, setEditing] = useState<string | null>(null);

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const submit = async () => {
    if (!form.employee_id || !form.objectives || !form.timeline_start || !form.timeline_end)
      return toast.error("All required fields");
    try {
      await upsert.mutateAsync({ ...form, id: editing ?? undefined });
      toast.success("PIP saved");
      setForm({ status: "draft", progress: 0, review_dates: [] });
      setEditing(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cols: DataTableColumn<ImprovementPlan>[] = [
    { key: "emp", header: "Employee", cell: (p) => p.employee?.full_name ?? "—" },
    { key: "coach", header: "Coach", cell: (p) => p.coach?.full_name ?? "—" },
    {
      key: "timeline",
      header: "Timeline",
      cell: (p) => `${new Date(p.timeline_start).toLocaleDateString()} → ${new Date(p.timeline_end).toLocaleDateString()}`,
    },
    { key: "progress", header: "Progress", cell: (p) => `${p.progress}%` },
    { key: "status", header: "Status", cell: (p) => <StatusBadge tone={PIP_TONE[p.status]} label={p.status.replace("_", " ")} /> },
    {
      key: "actions",
      header: "",
      cell: (p) =>
        canManage && (
          <button
            className="text-xs underline"
            onClick={() => {
              setEditing(p.id);
              setForm(p);
            }}
          >
            edit
          </button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Performance"
        title="Improvement Plans (PIP)"
        description="Coach-led improvement plans with objectives, review checkpoints, and final outcome."
      />

      {canManage && (
        <SectionCard title={editing ? "Edit PIP" : "New PIP"}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs">Employee</label>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.employee_id ?? ""}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              >
                <option value="">Select…</option>
                {(employees.data ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs">Coach</label>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.coach_id ?? ""}
                onChange={(e) => setForm({ ...form, coach_id: e.target.value || null })}
              >
                <option value="">— none —</option>
                {(employees.data ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs">Start</label>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.timeline_start ?? ""}
                onChange={(e) => setForm({ ...form, timeline_start: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs">End</label>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.timeline_end ?? ""}
                onChange={(e) => setForm({ ...form, timeline_end: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs">Objectives</label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.objectives ?? ""}
                onChange={(e) => setForm({ ...form, objectives: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs">Status</label>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as PipStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs">Progress %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.progress ?? 0}
                onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs">Final outcome</label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.final_outcome ?? ""}
                onChange={(e) => setForm({ ...form, final_outcome: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            {editing && (
              <button
                className="rounded-md border border-border px-3 py-2 text-xs"
                onClick={() => {
                  setEditing(null);
                  setForm({ status: "draft", progress: 0, review_dates: [] });
                }}
              >
                Cancel
              </button>
            )}
            <button
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              onClick={submit}
              disabled={upsert.isPending}
            >
              Save PIP
            </button>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Improvement plans">
        {list.error ? (
          <EmptyState title="Failed" description={(list.error as Error).message} />
        ) : list.isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState title="No PIPs" />
        ) : (
          <DataTable columns={cols} rows={list.data ?? []} rowKey={(p: ImprovementPlan) => p.id} />
        )}
      </SectionCard>
    </div>
  );
};

export default PipCenter;
