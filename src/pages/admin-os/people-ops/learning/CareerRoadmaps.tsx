import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useCareerRoadmaps,
  useUpsertRoadmap,
  useRoadmapRequirements,
  useAddRoadmapRequirement,
  useCourses,
  useSkillsCatalog,
  useCertificationsCatalog,
  type CareerRoadmap,
  type RoadmapReqType,
} from "@/hooks/admin-os/useLearning";
import { useDepartments } from "@/hooks/admin-os/useEmployees";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingSkeleton,
} from "@/components/admin-os/ds";

const CareerRoadmaps = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_MANAGE);
  const canView =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_VIEW) || canManage;

  const roadmaps = useCareerRoadmaps();
  const departments = useDepartments();
  const upsert = useUpsertRoadmap();
  const courses = useCourses({ status: "published" });
  const skills = useSkillsCatalog();
  const certs = useCertificationsCatalog();
  const addReq = useAddRoadmapRequirement();

  const [selected, setSelected] = useState<string | null>(null);
  const reqs = useRoadmapRequirements(selected ?? undefined);

  const [form, setForm] = useState<Partial<CareerRoadmap>>({});
  const [reqType, setReqType] = useState<RoadmapReqType>("course");
  const [reqRef, setReqRef] = useState<string>("");
  const [reqNotes, setReqNotes] = useState<string>("");

  const roadmap = useMemo(
    () => (roadmaps.data ?? []).find((r) => r.id === selected) ?? null,
    [roadmaps.data, selected],
  );

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const saveRoadmap = async () => {
    if (!form.name || !form.target_level) return toast.error("Name & target level required");
    try {
      await upsert.mutateAsync(form);
      toast.success("Roadmap saved");
      setForm({});
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const addRequirement = async () => {
    if (!selected || !reqRef) return toast.error("Requirement target required");
    try {
      await addReq.mutateAsync({
        roadmap_id: selected,
        requirement_type: reqType,
        course_id: reqType === "course" ? reqRef : undefined,
        skill_id: reqType === "skill" ? reqRef : undefined,
        certification_id: reqType === "certification" ? reqRef : undefined,
        notes: reqNotes || undefined,
        sequence: (reqs.data?.length ?? 0) + 1,
      });
      toast.success("Requirement added");
      setReqRef("");
      setReqNotes("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const refOptions =
    reqType === "course"
      ? (courses.data ?? []).map((c) => ({ id: c.id, label: c.title }))
      : reqType === "skill"
        ? (skills.data ?? []).map((s) => ({ id: s.id, label: s.name }))
        : (certs.data ?? []).map((c) => ({ id: c.id, label: c.title }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Learning"
        title="Career Roadmaps"
        description="Level-by-level requirements: courses, skills, certifications. Feeds Career Growth & Performance."
      />

      {canManage && (
        <SectionCard title="New roadmap">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              placeholder="Name"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="Target level (e.g. Senior Support)"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={form.target_level ?? ""}
              onChange={(e) => setForm({ ...form, target_level: e.target.value })}
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
              rows={2}
              placeholder="Description"
              className="md:col-span-3 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={saveRoadmap}
              disabled={upsert.isPending}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              Save roadmap
            </button>
          </div>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Roadmaps" className="lg:col-span-1">
          {roadmaps.isLoading ? (
            <LoadingSkeleton rows={3} />
          ) : (roadmaps.data ?? []).length === 0 ? (
            <EmptyState title="No roadmaps yet" />
          ) : (
            <ul className="space-y-1">
              {(roadmaps.data ?? []).map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelected(r.id)}
                    className={`w-full text-left rounded-md px-3 py-2 text-sm ${
                      selected === r.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      → {r.target_level} · {r.department?.name ?? "any dept"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={roadmap ? `Requirements · ${roadmap.name}` : "Select a roadmap"}
          className="lg:col-span-2"
        >
          {!selected ? (
            <EmptyState title="Pick a roadmap on the left" />
          ) : (
            <div className="space-y-3">
              {canManage && (
                <div className="grid gap-2 md:grid-cols-4">
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    value={reqType}
                    onChange={(e) => {
                      setReqType(e.target.value as RoadmapReqType);
                      setReqRef("");
                    }}
                  >
                    <option value="course">Course</option>
                    <option value="skill">Skill</option>
                    <option value="certification">Certification</option>
                  </select>
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm md:col-span-2"
                    value={reqRef}
                    onChange={(e) => setReqRef(e.target.value)}
                  >
                    <option value="">Select {reqType}…</option>
                    {refOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addRequirement}
                    disabled={addReq.isPending}
                    className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Add
                  </button>
                  <input
                    placeholder="Notes"
                    className="md:col-span-4 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                  />
                </div>
              )}

              {reqs.isLoading ? (
                <LoadingSkeleton rows={3} />
              ) : (reqs.data ?? []).length === 0 ? (
                <EmptyState title="No requirements yet" />
              ) : (
                <ol className="space-y-2">
                  {(reqs.data ?? []).map((r, idx) => {
                    const label =
                      r.requirement_type === "course"
                        ? r.course?.title
                        : r.requirement_type === "skill"
                          ? r.skill?.name
                          : r.certification?.title;
                    return (
                      <li
                        key={r.id}
                        className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3"
                      >
                        <span className="rounded-full bg-primary/10 text-primary w-7 h-7 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground mr-2">
                              {r.requirement_type}
                            </span>
                            {label ?? "—"}
                          </p>
                          {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default CareerRoadmaps;
