import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useEnrollments,
  useEnroll,
  useUpdateEnrollment,
  useCourses,
  type CourseEnrollment,
  type EnrollmentStatus,
} from "@/hooks/admin-os/useLearning";
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

const TONE: Record<EnrollmentStatus, "info" | "warning" | "success" | "danger" | "neutral"> = {
  assigned: "info",
  in_progress: "info",
  completed: "success",
  overdue: "danger",
  cancelled: "neutral",
};

const EnrollmentCenter = () => {
  const { hasPermission, employee } = useEmployee();
  const canEnroll =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_ENROLL) ||
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_MANAGE);
  const canView =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_VIEW) || canEnroll;

  const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | "">("");
  const enrollments = useEnrollments(statusFilter ? { status: statusFilter } : {});
  const courses = useCourses({ status: "published" });
  const employees = useEmployeesList({});
  const enroll = useEnroll();
  const update = useUpdateEnrollment();

  const [courseId, setCourseId] = useState("");
  const [empIds, setEmpIds] = useState<string[]>([]);
  const [due, setDue] = useState<string>("");

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const submit = async () => {
    if (!courseId || empIds.length === 0) return toast.error("Course & employees required");
    try {
      await enroll.mutateAsync({ course_id: courseId, employee_ids: empIds, due_date: due || null });
      toast.success(`Assigned to ${empIds.length} employee(s)`);
      setEmpIds([]);
      setDue("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cols: DataTableColumn<CourseEnrollment>[] = [
    { key: "course", header: "Course", cell: (r) => r.course?.title ?? "—" },
    { key: "emp", header: "Employee", cell: (r) => r.employee?.full_name ?? "—" },
    { key: "cat", header: "Category", cell: (r) => <span className="text-xs capitalize">{r.course?.category ?? "—"}</span> },
    { key: "due", header: "Due", cell: (r) => (r.due_date ? new Date(r.due_date).toLocaleDateString() : "—") },
    {
      key: "progress",
      header: "Progress",
      cell: (r) => (
        <div className="w-24">
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${r.progress}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground">{r.progress}%</p>
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge tone={TONE[r.status]} label={r.status.replace("_", " ")} /> },
    {
      key: "actions",
      header: "",
      cell: (r) => {
        const isOwner = employee?.id === r.employee_id;
        if (!isOwner && !canEnroll) return null;
        if (r.status === "completed" || r.status === "cancelled") return null;
        return (
          <input
            type="number"
            min={0}
            max={100}
            defaultValue={r.progress}
            className="w-14 rounded-md border border-border bg-background px-1.5 py-1 text-xs"
            onBlur={(e) => {
              const v = Math.max(0, Math.min(100, Number(e.target.value)));
              if (v !== r.progress)
                update.mutate(
                  { id: r.id, progress: v, status: v === 100 ? "completed" : "in_progress" },
                  {
                    onSuccess: () => toast.success("Progress saved"),
                    onError: (err: any) => toast.error(err.message),
                  },
                );
            }}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Learning"
        title="Enrollments"
        description="Course assignments and progress tracking across the whole company."
      />

      {canEnroll && (
        <SectionCard title="Assign course">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs">Course</label>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">Select…</option>
                {(courses.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.is_mandatory ? "★" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs">Due date</label>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs">Employees ({empIds.length})</label>
              <select
                multiple
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm h-24"
                value={empIds}
                onChange={(e) =>
                  setEmpIds(Array.from(e.target.selectedOptions).map((o) => o.value))
                }
              >
                {(employees.data ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              onClick={submit}
              disabled={enroll.isPending}
            >
              Assign
            </button>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Enrollments"
        actions={
          <select
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EnrollmentStatus | "")}
          >
            <option value="">All statuses</option>
            {(["assigned", "in_progress", "completed", "overdue", "cancelled"] as EnrollmentStatus[]).map(
              (s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ),
            )}
          </select>
        }
      >
        {enrollments.error ? (
          <EmptyState title="Failed" description={(enrollments.error as Error).message} />
        ) : enrollments.isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : (enrollments.data ?? []).length === 0 ? (
          <EmptyState title="No enrollments yet" />
        ) : (
          <DataTable columns={cols} rows={enrollments.data ?? []} rowKey={(r: CourseEnrollment) => r.id} />
        )}
      </SectionCard>
    </div>
  );
};

export default EnrollmentCenter;
