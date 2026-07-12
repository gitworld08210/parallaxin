import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useCertificationsCatalog,
  useUpsertCertification,
  useEmployeeCertifications,
  useIssueCertification,
  useRevokeCertification,
  type Certification,
  type EmployeeCertification,
  type CertCategory,
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

const CATS: CertCategory[] = ["technical", "leadership", "compliance", "security", "department", "process"];

const STATUS_TONE: Record<string, "info" | "warning" | "success" | "danger" | "neutral"> = {
  active: "success",
  expired: "warning",
  revoked: "danger",
};

const CertificationCenter = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_MANAGE);
  const canIssue =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_VERIFY_SKILL) || canManage;
  const canView =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_VIEW) || canManage || canIssue;

  const catalog = useCertificationsCatalog();
  const departments = useDepartments();
  const employees = useEmployeesList({});
  const list = useEmployeeCertifications();
  const upsert = useUpsertCertification();
  const issue = useIssueCertification();
  const revoke = useRevokeCertification();

  const [catForm, setCatForm] = useState<Partial<Certification>>({ category: "technical" });
  const [issueForm, setIssueForm] = useState<{ employee_id?: string; certification_id?: string; issued_at?: string; expires_at?: string; notes?: string }>({});

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const saveCat = async () => {
    if (!catForm.title) return toast.error("Title required");
    try {
      await upsert.mutateAsync(catForm);
      toast.success("Certification saved");
      setCatForm({ category: "technical" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const issueCert = async () => {
    if (!issueForm.employee_id || !issueForm.certification_id)
      return toast.error("Employee & certification required");
    try {
      await issue.mutateAsync({
        employee_id: issueForm.employee_id,
        certification_id: issueForm.certification_id,
        issued_at: issueForm.issued_at,
        expires_at: issueForm.expires_at ?? null,
        notes: issueForm.notes,
      });
      toast.success("Certification issued · passport updated");
      setIssueForm({});
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cols: DataTableColumn<EmployeeCertification>[] = [
    { key: "emp", header: "Employee", cell: (r) => r.employee?.full_name ?? "—" },
    { key: "cert", header: "Certification", cell: (r) => r.certification?.title ?? "—" },
    { key: "cat", header: "Category", cell: (r) => <span className="text-xs capitalize">{r.certification?.category ?? "—"}</span> },
    { key: "issued", header: "Issued", cell: (r) => new Date(r.issued_at).toLocaleDateString() },
    { key: "expires", header: "Expires", cell: (r) => (r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—") },
    { key: "status", header: "Status", cell: (r) => <StatusBadge tone={STATUS_TONE[r.status]} label={r.status} /> },
    {
      key: "actions",
      header: "",
      cell: (r) =>
        canIssue && r.status === "active" ? (
          <button
            className="text-[10px] rounded bg-red-600 text-white px-2 py-1"
            onClick={() =>
              revoke.mutate(
                { id: r.id },
                {
                  onSuccess: () => toast.success("Revoked"),
                  onError: (e: any) => toast.error(e.message),
                },
              )
            }
          >
            Revoke
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Learning"
        title="Certifications"
        description="Manage the certification catalog and issue/revoke certifications for employees."
      />

      {canManage && (
        <SectionCard title="Add certification to catalog">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              placeholder="Title"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={catForm.title ?? ""}
              onChange={(e) => setCatForm({ ...catForm, title: e.target.value })}
            />
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={catForm.category}
              onChange={(e) => setCatForm({ ...catForm, category: e.target.value as CertCategory })}
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={catForm.department_id ?? ""}
              onChange={(e) => setCatForm({ ...catForm, department_id: e.target.value || null })}
            >
              <option value="">— any dept —</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              placeholder="Validity (months, blank = no expiry)"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={catForm.validity_months ?? ""}
              onChange={(e) =>
                setCatForm({ ...catForm, validity_months: e.target.value ? Number(e.target.value) : null })
              }
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!catForm.is_mandatory}
                onChange={(e) => setCatForm({ ...catForm, is_mandatory: e.target.checked })}
              />
              Mandatory
            </label>
            <button
              onClick={saveCat}
              disabled={upsert.isPending}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              Save
            </button>
            <textarea
              rows={2}
              placeholder="Description"
              className="md:col-span-3 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={catForm.description ?? ""}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
            />
          </div>
        </SectionCard>
      )}

      {canIssue && (
        <SectionCard title="Issue certification">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={issueForm.employee_id ?? ""}
              onChange={(e) => setIssueForm({ ...issueForm, employee_id: e.target.value })}
            >
              <option value="">Select employee…</option>
              {(employees.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={issueForm.certification_id ?? ""}
              onChange={(e) => setIssueForm({ ...issueForm, certification_id: e.target.value })}
            >
              <option value="">Select certification…</option>
              {(catalog.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={issueForm.issued_at ?? ""}
              onChange={(e) => setIssueForm({ ...issueForm, issued_at: e.target.value })}
            />
            <input
              type="date"
              placeholder="Expires (optional)"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={issueForm.expires_at ?? ""}
              onChange={(e) => setIssueForm({ ...issueForm, expires_at: e.target.value })}
            />
            <textarea
              rows={1}
              placeholder="Notes"
              className="md:col-span-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={issueForm.notes ?? ""}
              onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={issueCert}
              disabled={issue.isPending}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              Issue
            </button>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Issued certifications">
        {list.error ? (
          <EmptyState title="Failed" description={(list.error as Error).message} />
        ) : list.isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState title="No certifications issued yet" />
        ) : (
          <DataTable columns={cols} rows={list.data ?? []} rowKey={(r: EmployeeCertification) => r.id} />
        )}
      </SectionCard>
    </div>
  );
};

export default CertificationCenter;
