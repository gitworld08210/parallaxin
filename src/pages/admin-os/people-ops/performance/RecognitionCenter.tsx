import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Award } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useRecognitions,
  useGrantRecognition,
  type RecognitionType,
  type Recognition,
} from "@/hooks/admin-os/usePerformance";
import { useEmployeesList } from "@/hooks/admin-os/useEmployees";
import {
  PageHeader,
  SectionCard,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  type DataTableColumn,
} from "@/components/admin-os/ds";

const TYPES: RecognitionType[] = [
  "award",
  "achievement",
  "outstanding",
  "innovation",
  "leadership",
  "special",
];

const RecognitionCenter = () => {
  const { hasPermission } = useEmployee();
  const canGrant =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECOGNITION_GRANT) ||
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_MANAGE);

  const list = useRecognitions();
  const employees = useEmployeesList({});
  const grant = useGrantRecognition();

  const [form, setForm] = useState<Partial<Recognition>>({ type: "achievement" });

  const submit = async () => {
    if (!form.employee_id || !form.title) return toast.error("Employee and title required");
    try {
      await grant.mutateAsync(form);
      toast.success("Recognition granted");
      setForm({ type: "achievement" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cols: DataTableColumn<Recognition>[] = [
    {
      key: "title",
      header: "Recognition",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" />
          <span className="font-medium">{r.title}</span>
        </div>
      ),
    },
    { key: "emp", header: "Employee", cell: (r) => r.employee?.full_name ?? "—" },
    { key: "type", header: "Type", cell: (r) => <span className="text-xs capitalize">{r.type}</span> },
    { key: "desc", header: "Description", cell: (r) => r.description ?? "—" },
    { key: "at", header: "Awarded", cell: (r) => new Date(r.awarded_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Performance"
        title="Recognition Center"
        description="Awards, achievements, and spotlights. Every entry automatically updates the Employee Passport."
      />

      {canGrant && (
        <SectionCard title="Grant recognition">
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
              <label className="text-xs">Type</label>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as RecognitionType })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs">Title</label>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs">Description</label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              onClick={submit}
              disabled={grant.isPending}
            >
              Grant recognition
            </button>
          </div>
        </SectionCard>
      )}

      <SectionCard title="History">
        {list.error ? (
          <EmptyState title="Failed" description={(list.error as Error).message} />
        ) : list.isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState title="No recognitions yet" />
        ) : (
          <DataTable columns={cols} rows={list.data ?? []} rowKey={(r: Recognition) => r.id} />
        )}
      </SectionCard>
    </div>
  );
};

export default RecognitionCenter;
