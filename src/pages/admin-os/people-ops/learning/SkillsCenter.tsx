import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useSkillsCatalog,
  useUpsertSkill,
  useSkillVerifications,
  useSubmitSkillRequest,
  useDecideSkillVerification,
  type Skill,
  type SkillVerification,
  type SkillVerifyStatus,
} from "@/hooks/admin-os/useLearning";
import { useEmployeesList, useDepartments } from "@/hooks/admin-os/useEmployees";
import {
  PageHeader,
  SectionCard,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  StatusBadge,
  type DataTableColumn,
} from "@/components/admin-os/ds";

const V_TONE: Record<SkillVerifyStatus, "info" | "warning" | "success" | "danger" | "neutral"> = {
  pending: "neutral",
  assessing: "info",
  dept_head_review: "warning",
  verified: "success",
  rejected: "danger",
};

const LEVELS = ["beginner", "intermediate", "advanced", "expert"];

const SkillsCenter = () => {
  const { hasPermission, employee } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_MANAGE);
  const canVerify =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_VERIFY_SKILL) || canManage;
  const canView =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_VIEW) || canManage || canVerify;

  const skills = useSkillsCatalog();
  const departments = useDepartments();
  const employees = useEmployeesList({});
  const verifs = useSkillVerifications();
  const upsertSkill = useUpsertSkill();
  const submitReq = useSubmitSkillRequest();
  const decide = useDecideSkillVerification();

  const [skillForm, setSkillForm] = useState<Partial<Skill>>({});
  const [req, setReq] = useState<{ employee_id?: string; skill_id?: string; requested_level?: string; evidence?: string }>({
    requested_level: "intermediate",
  });

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const addSkill = async () => {
    if (!skillForm.name) return toast.error("Name required");
    try {
      await upsertSkill.mutateAsync(skillForm);
      toast.success("Skill added");
      setSkillForm({});
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const submitRequest = async () => {
    const empId = req.employee_id ?? employee?.id;
    if (!empId || !req.skill_id) return toast.error("Skill required");
    try {
      await submitReq.mutateAsync({
        employee_id: empId,
        skill_id: req.skill_id,
        requested_level: req.requested_level ?? "intermediate",
        evidence: req.evidence,
      });
      toast.success("Verification requested");
      setReq({ requested_level: "intermediate" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cols: DataTableColumn<SkillVerification>[] = [
    { key: "emp", header: "Employee", cell: (v) => v.employee?.full_name ?? "—" },
    { key: "skill", header: "Skill", cell: (v) => v.skill?.name ?? "—" },
    { key: "level", header: "Level", cell: (v) => <span className="text-xs capitalize">{v.requested_level}</span> },
    { key: "status", header: "Status", cell: (v) => <StatusBadge tone={V_TONE[v.status]} label={v.status.replace("_", " ")} /> },
    {
      key: "actions",
      header: "",
      cell: (v) => {
        if (!canVerify) return null;
        if (v.status === "verified" || v.status === "rejected") return null;
        return (
          <div className="flex gap-1 flex-wrap">
            {v.status !== "assessing" && (
              <button
                className="text-[10px] rounded border border-border px-2 py-1"
                onClick={() =>
                  decide.mutate(
                    { id: v.id, status: "assessing" },
                    { onError: (e: any) => toast.error(e.message) },
                  )
                }
              >
                Assess
              </button>
            )}
            {v.status !== "dept_head_review" && (
              <button
                className="text-[10px] rounded border border-border px-2 py-1"
                onClick={() =>
                  decide.mutate(
                    { id: v.id, status: "dept_head_review" },
                    { onError: (e: any) => toast.error(e.message) },
                  )
                }
              >
                Dept review
              </button>
            )}
            <button
              className="text-[10px] rounded bg-emerald-600 text-white px-2 py-1"
              onClick={() =>
                decide.mutate(
                  { id: v.id, status: "verified" },
                  {
                    onSuccess: () => toast.success("Verified · passport updated"),
                    onError: (e: any) => toast.error(e.message),
                  },
                )
              }
            >
              Verify
            </button>
            <button
              className="text-[10px] rounded bg-red-600 text-white px-2 py-1"
              onClick={() =>
                decide.mutate(
                  { id: v.id, status: "rejected" },
                  { onError: (e: any) => toast.error(e.message) },
                )
              }
            >
              Reject
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Learning"
        title="Skills & Verification"
        description="Skill catalog and multi-stage verification workflow. HR cannot verify technical skills."
      />

      {canManage && (
        <SectionCard title="Add skill to catalog">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              placeholder="Skill name"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={skillForm.name ?? ""}
              onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
            />
            <input
              placeholder="Category"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={skillForm.category ?? ""}
              onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
            />
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={skillForm.department_id ?? ""}
              onChange={(e) => setSkillForm({ ...skillForm, department_id: e.target.value || null })}
            >
              <option value="">— any dept —</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              onClick={addSkill}
              disabled={upsertSkill.isPending}
            >
              Add skill
            </button>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Request skill verification">
        <div className="grid gap-3 md:grid-cols-4">
          {canManage || canVerify ? (
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={req.employee_id ?? employee?.id ?? ""}
              onChange={(e) => setReq({ ...req, employee_id: e.target.value })}
            >
              <option value="">Select employee…</option>
              {(employees.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs text-muted-foreground self-center">
              For: {employee?.full_name ?? "you"}
            </div>
          )}
          <select
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={req.skill_id ?? ""}
            onChange={(e) => setReq({ ...req, skill_id: e.target.value })}
          >
            <option value="">Select skill…</option>
            {(skills.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={req.requested_level}
            onChange={(e) => setReq({ ...req, requested_level: e.target.value })}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            onClick={submitRequest}
            disabled={submitReq.isPending}
            className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            Request
          </button>
          <textarea
            rows={2}
            placeholder="Evidence / rationale"
            className="md:col-span-4 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={req.evidence ?? ""}
            onChange={(e) => setReq({ ...req, evidence: e.target.value })}
          />
        </div>
      </SectionCard>

      <SectionCard title="Verification queue">
        {verifs.error ? (
          <EmptyState title="Failed" description={(verifs.error as Error).message} />
        ) : verifs.isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : (verifs.data ?? []).length === 0 ? (
          <EmptyState title="No verifications yet" />
        ) : (
          <DataTable columns={cols} rows={verifs.data ?? []} rowKey={(v: SkillVerification) => v.id} />
        )}
      </SectionCard>

      <SectionCard title="Skill catalog">
        {skills.isLoading ? (
          <LoadingSkeleton rows={3} />
        ) : (skills.data ?? []).length === 0 ? (
          <EmptyState title="No skills yet" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(skills.data ?? []).map((s) => (
              <div key={s.id} className="rounded-lg border border-border/60 bg-background p-3">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.category ?? "—"} · {s.department?.name ?? "any dept"}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default SkillsCenter;
