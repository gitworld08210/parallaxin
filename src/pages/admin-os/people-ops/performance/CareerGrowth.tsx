import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useCareerProgress, useUpsertCareer, type CareerProgress } from "@/hooks/admin-os/usePerformance";
import { useEmployeesList } from "@/hooks/admin-os/useEmployees";
import {
  PageHeader,
  SectionCard,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  type DataTableColumn,
} from "@/components/admin-os/ds";

const parseList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

const CareerGrowth = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_MANAGE);
  const canView =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_VIEW) || canManage;

  const list = useCareerProgress();
  const employees = useEmployeesList({});
  const upsert = useUpsertCareer();

  const [form, setForm] = useState<{
    employee_id?: string;
    current_level?: string;
    target_level?: string;
    required_skills?: string;
    training_needed?: string;
    experience_required_months?: number;
    progress?: number;
    notes?: string;
  }>({ progress: 0, experience_required_months: 0 });

  const employeeMap = useMemo(
    () => new Map((employees.data ?? []).map((e) => [e.id, e])),
    [employees.data],
  );

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const submit = async () => {
    if (!form.employee_id) return toast.error("Employee required");
    try {
      await upsert.mutateAsync({
        employee_id: form.employee_id,
        current_level: form.current_level ?? null,
        target_level: form.target_level ?? null,
        required_skills: parseList(form.required_skills ?? ""),
        training_needed: parseList(form.training_needed ?? ""),
        experience_required_months: form.experience_required_months ?? 0,
        progress: form.progress ?? 0,
        notes: form.notes ?? null,
      });
      toast.success("Career record saved");
      setForm({ progress: 0, experience_required_months: 0 });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cols: DataTableColumn<CareerProgress>[] = [
    { key: "emp", header: "Employee", cell: (c) => employeeMap.get(c.employee_id)?.full_name ?? c.employee_id.slice(0, 8) },
    { key: "current", header: "Current level", cell: (c) => c.current_level ?? "—" },
    { key: "target", header: "Target level", cell: (c) => c.target_level ?? "—" },
    { key: "skills", header: "Required skills", cell: (c) => c.required_skills.join(", ") || "—" },
    { key: "training", header: "Training", cell: (c) => c.training_needed.join(", ") || "—" },
    { key: "exp", header: "Exp (mo)", cell: (c) => c.experience_required_months },
    {
      key: "progress",
      header: "Progress",
      cell: (c) => (
        <div className="w-24">
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${c.progress}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground">{c.progress}%</p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Performance"
        title="Career Growth"
        description="Track current level, target level, required skills, training, and readiness."
      />

      {canManage && (
        <SectionCard title="Upsert career record">
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
              <label className="text-xs">Current level</label>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.current_level ?? ""}
                onChange={(e) => setForm({ ...form, current_level: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs">Target level</label>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.target_level ?? ""}
                onChange={(e) => setForm({ ...form, target_level: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs">Experience required (months)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.experience_required_months ?? 0}
                onChange={(e) => setForm({ ...form, experience_required_months: Number(e.target.value) })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs">Required skills (comma-separated)</label>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.required_skills ?? ""}
                onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs">Training needed (comma-separated)</label>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.training_needed ?? ""}
                onChange={(e) => setForm({ ...form, training_needed: e.target.value })}
              />
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
              <label className="text-xs">Notes</label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              onClick={submit}
              disabled={upsert.isPending}
            >
              Save
            </button>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Career records">
        {list.error ? (
          <EmptyState title="Failed" description={(list.error as Error).message} />
        ) : list.isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState title="No career records yet" />
        ) : (
          <DataTable columns={cols} rows={list.data ?? []} rowKey={(c: CareerProgress) => c.id} />
        )}
      </SectionCard>
    </div>
  );
};

export default CareerGrowth;
