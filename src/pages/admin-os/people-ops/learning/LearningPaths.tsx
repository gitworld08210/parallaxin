import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useLearningPaths,
  useUpsertPath,
  usePathCourses,
  useAddPathCourse,
  useCourses,
  type LearningPath,
} from "@/hooks/admin-os/useLearning";
import { useDepartments } from "@/hooks/admin-os/useEmployees";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingSkeleton,
} from "@/components/admin-os/ds";

const LearningPaths = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_MANAGE);
  const canView =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_VIEW) || canManage;

  const paths = useLearningPaths();
  const departments = useDepartments();
  const upsert = useUpsertPath();
  const courses = useCourses({ status: "published" });
  const addPathCourse = useAddPathCourse();

  const [selected, setSelected] = useState<string | null>(null);
  const pathCourses = usePathCourses(selected ?? undefined);

  const [form, setForm] = useState<Partial<LearningPath>>({ status: "draft" });
  const [courseAdd, setCourseAdd] = useState<{ course_id?: string; sequence?: number }>({ sequence: 1 });

  const selectedPath = useMemo(
    () => (paths.data ?? []).find((p) => p.id === selected) ?? null,
    [paths.data, selected],
  );

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const savePath = async () => {
    if (!form.name) return toast.error("Name required");
    try {
      await upsert.mutateAsync(form);
      toast.success("Path saved");
      setForm({ status: "draft" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const addCourse = async () => {
    if (!selected || !courseAdd.course_id) return toast.error("Course required");
    try {
      await addPathCourse.mutateAsync({
        path_id: selected,
        course_id: courseAdd.course_id,
        sequence: courseAdd.sequence ?? 1,
      });
      toast.success("Course added");
      setCourseAdd({ sequence: (courseAdd.sequence ?? 1) + 1 });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Learning"
        title="Learning Paths"
        description="Structured learning journeys per role or department."
      />

      {canManage && (
        <SectionCard title="New learning path">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              placeholder="Name"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="Target role"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={form.target_role ?? ""}
              onChange={(e) => setForm({ ...form, target_role: e.target.value })}
            />
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={form.department_id ?? ""}
              onChange={(e) => setForm({ ...form, department_id: e.target.value || null })}
            >
              <option value="">— any dept —</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Description"
              rows={2}
              className="md:col-span-3 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={savePath}
              disabled={upsert.isPending}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              Save path
            </button>
          </div>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Paths" className="lg:col-span-1">
          {paths.error ? (
            <EmptyState title="Failed" description={(paths.error as Error).message} />
          ) : paths.isLoading ? (
            <LoadingSkeleton rows={3} />
          ) : (paths.data ?? []).length === 0 ? (
            <EmptyState title="No paths yet" />
          ) : (
            <ul className="space-y-1">
              {(paths.data ?? []).map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSelected(p.id)}
                    className={`w-full text-left rounded-md px-3 py-2 text-sm ${
                      selected === p.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.target_role ?? "—"} · {p.department?.name ?? "any dept"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={selectedPath ? `Path · ${selectedPath.name}` : "Select a path"}
          className="lg:col-span-2"
        >
          {!selected ? (
            <EmptyState title="Pick a path on the left" />
          ) : (
            <div className="space-y-3">
              {canManage && (
                <div className="flex flex-wrap gap-2 items-end">
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm flex-1 min-w-[200px]"
                    value={courseAdd.course_id ?? ""}
                    onChange={(e) => setCourseAdd({ ...courseAdd, course_id: e.target.value })}
                  >
                    <option value="">Pick a course to add…</option>
                    {(courses.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    value={courseAdd.sequence ?? 1}
                    onChange={(e) => setCourseAdd({ ...courseAdd, sequence: Number(e.target.value) })}
                  />
                  <button
                    onClick={addCourse}
                    disabled={addPathCourse.isPending}
                    className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Add course
                  </button>
                </div>
              )}

              {pathCourses.isLoading ? (
                <LoadingSkeleton rows={3} />
              ) : (pathCourses.data ?? []).length === 0 ? (
                <EmptyState title="No courses added yet" />
              ) : (
                <ol className="space-y-2">
                  {(pathCourses.data ?? []).map((pc: any, idx: number) => (
                    <li
                      key={pc.id}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3"
                    >
                      <span className="rounded-full bg-primary/10 text-primary w-7 h-7 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pc.course?.title ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {pc.course?.category} · {pc.course?.duration_minutes} min
                        </p>
                      </div>
                      {pc.is_required && (
                        <span className="text-[10px] font-semibold text-amber-500 uppercase">Required</span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default LearningPaths;
