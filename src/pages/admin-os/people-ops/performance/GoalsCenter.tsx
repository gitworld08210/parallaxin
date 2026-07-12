import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useGoals,
  useUpsertGoal,
  useUpdateGoalProgress,
  usePerformanceCycles,
  type GoalStatus,
  type GoalPriority,
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
import type { PerformanceGoal } from "@/hooks/admin-os/usePerformance";

const STATUS_TONE: Record<GoalStatus, "info" | "warning" | "success" | "danger" | "neutral"> = {
  not_started: "neutral",
  in_progress: "info",
  at_risk: "warning",
  completed: "success",
  missed: "danger",
  cancelled: "neutral",
};

const PRIORITIES: GoalPriority[] = ["low", "medium", "high", "critical"];
const STATUSES: GoalStatus[] = [
  "not_started",
  "in_progress",
  "at_risk",
  "completed",
  "missed",
  "cancelled",
];

const GoalsCenter = () => {
  const { hasPermission, employee } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_MANAGE);
  const canView =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_VIEW) ||
    canManage ||
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_REVIEW);

  const [statusFilter, setStatusFilter] = useState<GoalStatus | "">("");
  const goals = useGoals(statusFilter ? { status: statusFilter } : {});
  const cycles = usePerformanceCycles();
  const employees = useEmployeesList({});
  const upsert = useUpsertGoal();
  const updateProgress = useUpdateGoalProgress();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<PerformanceGoal>>({
    priority: "medium",
    weightage: 10,
    status: "not_started",
    progress: 0,
  });

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const submit = async () => {
    if (!form.title || !form.employee_id) {
      toast.error("Employee and title required");
      return;
    }
    try {
      await upsert.mutateAsync(form);
      toast.success("Goal saved");
      setForm({ priority: "medium", weightage: 10, status: "not_started", progress: 0 });
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cols: DataTableColumn<PerformanceGoal>[] = [
    { key: "title", header: "Goal", cell: (g) => <span className="font-medium">{g.title}</span> },
    { key: "employee", header: "Employee", cell: (g) => g.employee?.full_name ?? "—" },
    { key: "cycle", header: "Cycle", cell: (g) => g.cycle?.name ?? "—" },
    { key: "priority", header: "Priority", cell: (g) => <span className="text-xs capitalize">{g.priority}</span> },
    { key: "weight", header: "Wt.", cell: (g) => `${g.weightage}%` },
    {
      key: "progress",
      header: "Progress",
      cell: (g) => (
        <div className="w-32">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${g.progress}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{g.progress}%</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (g) => <StatusBadge tone={STATUS_TONE[g.status]} label={g.status.replace("_", " ")} />,
    },
    { key: "due", header: "Due", cell: (g) => (g.due_date ? new Date(g.due_date).toLocaleDateString() : "—") },
    {
      key: "actions",
      header: "",
      cell: (g) => {
        const isOwner = employee?.id === g.employee_id;
        if (!isOwner && !canManage) return null;
        return (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={g.progress}
              className="w-14 rounded-md border border-border bg-background px-1.5 py-1 text-xs"
              onBlur={(e) => {
                const v = Math.max(0, Math.min(100, Number(e.target.value)));
                if (v !== g.progress)
                  updateProgress.mutate(
                    { id: g.id, progress: v, status: v === 100 ? "completed" : "in_progress" },
                    {
                      onSuccess: () => toast.success("Progress updated"),
                      onError: (err: any) => toast.error(err.message),
                    },
                  );
              }}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Performance"
        title="Goal Management"
        description="KPI-aligned goals across every employee and cycle."
        actions={
          canManage && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              {showForm ? "Close" : "+ New goal"}
            </button>
          )
        }
      />

      {showForm && canManage && (
        <SectionCard title="New goal">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Employee</label>
              <select
                className="w-full mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.employee_id ?? ""}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              >
                <option value="">Select…</option>
                {(employees.data ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} ({e.employee_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cycle</label>
              <select
                className="w-full mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.cycle_id ?? ""}
                onChange={(e) => setForm({ ...form, cycle_id: e.target.value || null })}
              >
                <option value="">— none —</option>
                {(cycles.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Title</label>
              <input
                className="w-full mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Description</label>
              <textarea
                className="w-full mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Priority</label>
              <select
                className="w-full mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as GoalPriority })}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Weightage %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.weightage ?? 10}
                onChange={(e) => setForm({ ...form, weightage: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Due date</label>
              <input
                type="date"
                className="w-full mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.due_date ?? ""}
                onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="team"
                checked={!!form.is_team_goal}
                onChange={(e) => setForm({ ...form, is_team_goal: e.target.checked })}
              />
              <label htmlFor="team" className="text-xs">
                Team goal
              </label>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={submit}
              disabled={upsert.isPending}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              {upsert.isPending ? "Saving…" : "Save goal"}
            </button>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Goals"
        actions={
          <select
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as GoalStatus | "")}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        }
      >
        {goals.error ? (
          <EmptyState title="Failed to load" description={(goals.error as Error).message} />
        ) : goals.isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : (goals.data ?? []).length === 0 ? (
          <EmptyState title="No goals yet" description="Assign the first goal for this cycle." />
        ) : (
          <DataTable columns={cols} rows={goals.data ?? []} rowKey={(g: PerformanceGoal) => g.id} />
        )}
      </SectionCard>
    </div>
  );
};

export default GoalsCenter;
