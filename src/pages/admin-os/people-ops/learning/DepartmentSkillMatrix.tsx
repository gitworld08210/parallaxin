import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useDepartmentSkillMatrix } from "@/hooks/admin-os/useLearning";
import { useDepartments } from "@/hooks/admin-os/useEmployees";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingSkeleton,
} from "@/components/admin-os/ds";

const DepartmentSkillMatrix = () => {
  const { hasPermission } = useEmployee();
  const canView =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_VIEW) ||
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_MANAGE) ||
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_VERIFY_SKILL);

  const departments = useDepartments();
  const [deptId, setDeptId] = useState<string>("");
  const matrix = useDepartmentSkillMatrix(deptId || undefined);

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Learning"
        title="Department Skill Matrix"
        description="Skill coverage across the department. Feeds workforce planning."
      />

      <SectionCard title="Select department">
        <select
          className="w-full md:w-96 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          value={deptId}
          onChange={(e) => setDeptId(e.target.value)}
        >
          <option value="">Choose a department…</option>
          {(departments.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </SectionCard>

      {!deptId ? (
        <EmptyState title="Pick a department to see its skill matrix" />
      ) : matrix.isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : matrix.error ? (
        <EmptyState title="Failed" description={(matrix.error as Error).message} />
      ) : (
        <>
          <SectionCard title="Skill coverage">
            {(matrix.data?.coverage ?? []).length === 0 ? (
              <EmptyState
                title="No skills defined for this department"
                description="Add skills in Skills & Verification."
              />
            ) : (
              <div className="space-y-3">
                {matrix.data!.coverage.map((c) => (
                  <div key={c.skill.id} className="rounded-lg border border-border/60 bg-background p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{c.skill.name}</p>
                        <p className="text-xs text-muted-foreground">{c.skill.category ?? "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {c.verified}/{c.totalEmployees}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{c.coveragePct}% coverage</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          c.coveragePct >= 70
                            ? "bg-emerald-500"
                            : c.coveragePct >= 40
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${c.coveragePct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Department roster"
            description={`${matrix.data?.employees.length ?? 0} active employees`}
          >
            <ul className="grid gap-1 sm:grid-cols-2 md:grid-cols-3">
              {(matrix.data?.employees ?? []).map((e: any) => (
                <li key={e.id} className="rounded border border-border/60 bg-background px-2 py-1.5 text-xs">
                  <span className="font-medium">{e.full_name}</span>
                  <span className="text-muted-foreground"> · {e.level ?? "—"}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default DepartmentSkillMatrix;
