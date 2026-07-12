import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useDepartments, useRoles } from "@/hooks/admin-os/useEmployees";
import {
  useOpenPositions,
  useUpsertPosition,
  useTransitionPositionStatus,
  type OpenPosition,
} from "@/hooks/admin-os/useOrganization";
import {
  PageHeader,
  SectionCard,
  DataTable,
  type DataTableColumn,
  StatusBadge,
} from "@/components/admin-os/ds";

const STATUS_TONE: Record<
  OpenPosition["status"],
  "success" | "warning" | "danger" | "neutral" | "info"
> = {
  draft: "neutral",
  pending_approval: "warning",
  approved: "info",
  filled: "success",
  cancelled: "neutral",
};

const STATUS_LABEL: Record<OpenPosition["status"], string> = {
  draft: "Draft",
  pending_approval: "Pending",
  approved: "Approved",
  filled: "Filled",
  cancelled: "Cancelled",
};

const PRIORITY_TONE: Record<
  OpenPosition["priority"],
  "success" | "warning" | "danger" | "neutral"
> = {
  low: "neutral",
  medium: "neutral",
  high: "warning",
  critical: "danger",
};

const OpenPositions = () => {
  const { hasPermission } = useEmployee();
  const [filters, setFilters] = useState({ status: "", departmentId: "", priority: "" });
  const { data: positions, isLoading, error } = useOpenPositions(filters);
  const { data: departments } = useDepartments();
  const { data: roles } = useRoles();
  const [editing, setEditing] = useState<Partial<OpenPosition> | null>(null);
  const upsert = useUpsertPosition();
  const transition = useTransitionPositionStatus();

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ORG_VIEW))
    return <Navigate to="/admin-os/no-access" replace />;
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_POSITIONS_MANAGE);

  const stats = useMemo(() => {
    const arr = positions ?? [];
    return {
      total: arr.length,
      open: arr.filter((p) => ["pending_approval", "approved"].includes(p.status)).length,
      critical: arr.filter((p) => p.priority === "critical" && p.status !== "filled" && p.status !== "cancelled").length,
      filled: arr.filter((p) => p.status === "filled").length,
    };
  }, [positions]);

  const columns: DataTableColumn<OpenPosition>[] = [
    {
      key: "title",
      header: "Position",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.title}</p>
          <p className="text-[11px] text-muted-foreground">
            {r.department?.name ?? "—"} · {r.role?.name ?? "—"} {r.level ? `· L${r.level}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      cell: (r) => (
        <StatusBadge tone={PRIORITY_TONE[r.priority]} label={r.priority.toUpperCase()} />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge tone={STATUS_TONE[r.status]} label={STATUS_LABEL[r.status]} />,
    },
    {
      key: "expected",
      header: "Expected joining",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.expected_joining ? new Date(r.expected_joining).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex items-center gap-1 justify-end">
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setEditing(r)}
                className="px-2 h-7 rounded border border-border bg-background text-[11px] font-medium hover:bg-muted"
              >
                Edit
              </button>
              {r.status === "draft" && (
                <button
                  onClick={() =>
                    transition.mutate(
                      { id: r.id, to: "pending_approval" },
                      { onSuccess: () => toast.success("Submitted for approval") },
                    )
                  }
                  className="px-2 h-7 rounded bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90"
                >
                  Submit
                </button>
              )}
              {r.status === "pending_approval" && (
                <button
                  onClick={() =>
                    transition.mutate({ id: r.id, to: "approved" }, { onSuccess: () => toast.success("Approved") })
                  }
                  className="px-2 h-7 rounded bg-emerald-500 text-white text-[11px] font-medium hover:bg-emerald-600"
                >
                  Approve
                </button>
              )}
              {r.status === "approved" && (
                <button
                  onClick={() =>
                    transition.mutate({ id: r.id, to: "filled" }, { onSuccess: () => toast.success("Marked filled") })
                  }
                  className="px-2 h-7 rounded bg-emerald-500 text-white text-[11px] font-medium hover:bg-emerald-600"
                >
                  Mark filled
                </button>
              )}
              {!["filled", "cancelled"].includes(r.status) && (
                <button
                  onClick={() =>
                    transition.mutate({ id: r.id, to: "cancelled" }, { onSuccess: () => toast.success("Cancelled") })
                  }
                  className="px-2 h-7 rounded border border-border bg-background text-[11px] font-medium hover:bg-muted"
                >
                  Cancel
                </button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  const submit = () => {
    if (!editing?.title || !editing.department_id) {
      toast.error("Title and department are required");
      return;
    }
    upsert.mutate(editing as any, {
      onSuccess: () => {
        toast.success(editing.id ? "Position updated" : "Position created");
        setEditing(null);
      },
      onError: (e: any) => toast.error(e.message ?? "Save failed"),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Organization"
        title="Open Positions"
        description="Internal hiring requests, approvals, and fills."
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
                type="button"
                onClick={() =>
                  setEditing({
                    title: "",
                    department_id: departments?.[0]?.id,
                    priority: "medium",
                    status: "draft",
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> New position
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Open", value: stats.open },
          { label: "Critical", value: stats.critical },
          { label: "Filled", value: stats.filled },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <SectionCard>
        <div className="flex flex-wrap gap-2 mb-3">
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={filters.departmentId}
            onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value }))}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
          >
            <option value="">All departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
          >
            <option value="">All priorities</option>
            {["low", "medium", "high", "critical"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        {error ? (
          <div className="p-6 text-sm text-destructive">{(error as Error).message}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={positions ?? []}
            rowKey={(r) => r.id}
            loading={isLoading}
            empty={{
              title: "No open positions",
              description: "Create a hiring request to get started.",
            }}
          />
        )}
      </SectionCard>

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
              <h3 className="text-sm font-semibold">
                {editing.id ? "Edit position" : "New open position"}
              </h3>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Title</span>
                <input
                  type="text"
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
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
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Role</span>
                  <select
                    value={editing.role_id ?? ""}
                    onChange={(e) => setEditing({ ...editing, role_id: e.target.value || null })}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-background border border-border/60 text-sm"
                  >
                    <option value="">—</option>
                    {roles?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Level</span>
                  <input
                    type="text"
                    value={editing.level ?? ""}
                    onChange={(e) => setEditing({ ...editing, level: e.target.value })}
                    className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Priority</span>
                  <select
                    value={editing.priority ?? "medium"}
                    onChange={(e) => setEditing({ ...editing, priority: e.target.value as any })}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-background border border-border/60 text-sm"
                  >
                    {["low", "medium", "high", "critical"].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Expected joining</span>
                  <input
                    type="date"
                    value={editing.expected_joining ?? ""}
                    onChange={(e) => setEditing({ ...editing, expected_joining: e.target.value || null })}
                    className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Reason</span>
                <textarea
                  value={editing.reason ?? ""}
                  onChange={(e) => setEditing({ ...editing, reason: e.target.value })}
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

export default OpenPositions;
