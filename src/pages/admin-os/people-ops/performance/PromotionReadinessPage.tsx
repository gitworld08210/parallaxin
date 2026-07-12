import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  usePromotionReadiness,
  useComputePromotionReadiness,
  type PromotionReadiness,
  type ReadinessLevel,
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

const LEVEL_TONE: Record<ReadinessLevel, "info" | "warning" | "success" | "danger" | "neutral"> = {
  not_ready: "neutral",
  emerging: "info",
  developing: "info",
  ready_soon: "warning",
  ready_now: "success",
};

const PromotionReadinessPage = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_MANAGE);
  const canView =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_VIEW) || canManage;

  const list = usePromotionReadiness();
  const employees = useEmployeesList({});
  const compute = useComputePromotionReadiness();

  const [form, setForm] = useState({
    employee_id: "",
    performance_score: 70,
    skills_score: 70,
    training_score: 70,
    audit_score: 70,
    department_recommendation: false,
    notes: "",
  });

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const submit = async () => {
    if (!form.employee_id) return toast.error("Employee required");
    try {
      await compute.mutateAsync(form);
      toast.success("Readiness computed");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cols: DataTableColumn<PromotionReadiness>[] = [
    { key: "emp", header: "Employee", cell: (p) => p.employee?.full_name ?? "—" },
    { key: "level", header: "Current level", cell: (p) => p.employee?.level ?? "—" },
    { key: "perf", header: "Perf", cell: (p) => Number(p.performance_score).toFixed(0) },
    { key: "skl", header: "Skills", cell: (p) => Number(p.skills_score).toFixed(0) },
    { key: "trn", header: "Training", cell: (p) => Number(p.training_score).toFixed(0) },
    { key: "aud", header: "Audit", cell: (p) => Number(p.audit_score).toFixed(0) },
    { key: "dept", header: "Dept rec", cell: (p) => (p.department_recommendation ? "✓" : "—") },
    {
      key: "overall",
      header: "Overall",
      cell: (p) => <span className="font-bold">{Number(p.overall_score).toFixed(1)}</span>,
    },
    {
      key: "readiness",
      header: "Readiness",
      cell: (p) => <StatusBadge tone={LEVEL_TONE[p.readiness_level]} label={p.readiness_level.replace("_", " ")} />,
    },
    { key: "at", header: "Computed", cell: (p) => new Date(p.computed_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Performance"
        title="Promotion Readiness"
        description="Advisory readiness scoring. Final approval follows governance policy."
      />

      {canManage && (
        <SectionCard title="Compute readiness snapshot">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <label className="text-xs">Employee</label>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.employee_id}
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
            {(
              [
                ["performance_score", "Performance (0-100)"],
                ["skills_score", "Skills (0-100)"],
                ["training_score", "Training (0-100)"],
                ["audit_score", "Audit (0-100)"],
              ] as const
            ).map(([k, l]) => (
              <div key={k}>
                <label className="text-xs">{l}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
                />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rec"
                checked={form.department_recommendation}
                onChange={(e) => setForm({ ...form, department_recommendation: e.target.checked })}
              />
              <label htmlFor="rec" className="text-xs">
                Department recommends promotion
              </label>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs">Notes</label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              onClick={submit}
              disabled={compute.isPending}
            >
              Compute
            </button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Formula: performance × 40% + skills × 25% + training × 20% + audit × 15%. Ready-now requires
            department recommendation and overall ≥ 85.
          </p>
        </SectionCard>
      )}

      <SectionCard title="Readiness snapshots">
        {list.error ? (
          <EmptyState title="Failed" description={(list.error as Error).message} />
        ) : list.isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState title="No snapshots yet" />
        ) : (
          <DataTable columns={cols} rows={list.data ?? []} rowKey={(p: PromotionReadiness) => p.id} />
        )}
      </SectionCard>
    </div>
  );
};

export default PromotionReadinessPage;
