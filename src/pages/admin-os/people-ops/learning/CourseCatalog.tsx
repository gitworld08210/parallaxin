import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useCourses,
  useUpsertCourse,
  type LearningCourse,
  type CourseCategory,
  type CourseDifficulty,
  type CourseStatus,
} from "@/hooks/admin-os/useLearning";
import { useDepartments } from "@/hooks/admin-os/useEmployees";
import {
  PageHeader,
  SectionCard,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  StatusBadge,
  type DataTableColumn,
} from "@/components/admin-os/ds";

const CATS: CourseCategory[] = [
  "department",
  "policy",
  "technical",
  "leadership",
  "security",
  "compliance",
  "ai",
  "onboarding",
];
const DIFFS: CourseDifficulty[] = ["beginner", "intermediate", "advanced", "expert"];
const STATUSES: CourseStatus[] = ["draft", "published", "archived"];

const STATUS_TONE: Record<CourseStatus, "info" | "success" | "neutral"> = {
  draft: "neutral",
  published: "success",
  archived: "info",
};

const CourseCatalog = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_MANAGE);
  const canView =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_VIEW) ||
    canManage ||
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_ENROLL);

  const [catFilter, setCatFilter] = useState<CourseCategory | "">("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "">("");
  const courses = useCourses({
    ...(catFilter ? { category: catFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  });
  const departments = useDepartments();
  const upsert = useUpsertCourse();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<LearningCourse>>({
    category: "department",
    difficulty: "beginner",
    status: "draft",
    duration_minutes: 30,
    is_mandatory: false,
    prerequisites: [],
  });

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const submit = async () => {
    if (!form.title) return toast.error("Title required");
    try {
      await upsert.mutateAsync(form);
      toast.success("Course saved");
      setForm({
        category: "department",
        difficulty: "beginner",
        status: "draft",
        duration_minutes: 30,
        is_mandatory: false,
        prerequisites: [],
      });
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cols: DataTableColumn<LearningCourse>[] = [
    {
      key: "title",
      header: "Course",
      cell: (c) => (
        <div>
          <p className="font-medium">{c.title}</p>
          {c.is_mandatory && <p className="text-[10px] font-semibold text-amber-500">MANDATORY</p>}
        </div>
      ),
    },
    { key: "cat", header: "Category", cell: (c) => <span className="text-xs capitalize">{c.category}</span> },
    { key: "diff", header: "Difficulty", cell: (c) => <span className="text-xs capitalize">{c.difficulty}</span> },
    { key: "dept", header: "Department", cell: (c) => c.department?.name ?? "—" },
    { key: "dur", header: "Duration", cell: (c) => `${c.duration_minutes} min` },
    { key: "status", header: "Status", cell: (c) => <StatusBadge tone={STATUS_TONE[c.status]} label={c.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Learning"
        title="Course Catalog"
        description="Every internal course, ready to be assigned or added to a learning path."
        actions={
          canManage && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              {showForm ? "Close" : "+ New course"}
            </button>
          )
        }
      />

      {showForm && canManage && (
        <SectionCard title="New course">
          <div className="grid gap-3 md:grid-cols-2">
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
            <div>
              <label className="text-xs">Department</label>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.department_id ?? ""}
                onChange={(e) => setForm({ ...form, department_id: e.target.value || null })}
              >
                <option value="">— none —</option>
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs">Category</label>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as CourseCategory })}
              >
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs">Difficulty</label>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value as CourseDifficulty })}
              >
                {DIFFS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs">Duration (min)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.duration_minutes ?? 30}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs">Status</label>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as CourseStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mand"
                checked={!!form.is_mandatory}
                onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })}
              />
              <label htmlFor="mand" className="text-xs">
                Mandatory
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs">Prerequisites (comma separated)</label>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={(form.prerequisites ?? []).join(", ")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    prerequisites: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              onClick={submit}
              disabled={upsert.isPending}
            >
              Save course
            </button>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Catalog"
        actions={
          <div className="flex gap-2">
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value as CourseCategory | "")}
            >
              <option value="">All categories</option>
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CourseStatus | "")}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {courses.error ? (
          <EmptyState title="Failed" description={(courses.error as Error).message} />
        ) : courses.isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : (courses.data ?? []).length === 0 ? (
          <EmptyState title="No courses yet" />
        ) : (
          <DataTable columns={cols} rows={courses.data ?? []} rowKey={(c: LearningCourse) => c.id} />
        )}
      </SectionCard>
    </div>
  );
};

export default CourseCatalog;
