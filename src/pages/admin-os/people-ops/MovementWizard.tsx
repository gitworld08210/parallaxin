/**
 * Movement Wizard — Phase 2.4.
 * A single form that creates every kind of movement request. Fields
 * are shown/hidden per movement kind. Auto-seeds the approval chain.
 */
import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useEmployeesList, useDepartments } from "@/hooks/admin-os/useEmployees";
import { useCreateMovement, movementChain, type MovementKind } from "@/hooks/admin-os/useMovements";
import {
  PageHeader, SectionCard, PermissionDenied,
} from "@/components/admin-os/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const KINDS: { value: MovementKind; label: string; group: string }[] = [
  { value: "department_transfer", label: "Department transfer", group: "Transfers" },
  { value: "team_transfer", label: "Team transfer", group: "Transfers" },
  { value: "manager_change", label: "Reporting manager change", group: "Transfers" },
  { value: "promotion", label: "Promotion", group: "Level" },
  { value: "demotion", label: "Demotion", group: "Level" },
  { value: "temporary_assignment", label: "Temporary assignment", group: "Assignments" },
  { value: "cross_department_assignment", label: "Cross-department assignment", group: "Assignments" },
  { value: "acting_assignment", label: "Acting assignment", group: "Assignments" },
  { value: "leave", label: "Leave", group: "Absence" },
  { value: "suspension", label: "Suspension", group: "Absence" },
  { value: "reinstatement", label: "Reinstatement", group: "Absence" },
  { value: "resignation", label: "Resignation", group: "Exit" },
  { value: "exit", label: "Exit", group: "Exit" },
  { value: "rejoin", label: "Rejoin", group: "Exit" },
  { value: "workload_transfer", label: "Workload transfer", group: "Continuity" },
  { value: "knowledge_transfer", label: "Knowledge transfer", group: "Continuity" },
];

const needsDept = (k: MovementKind) =>
  ["department_transfer", "cross_department_assignment", "temporary_assignment"].includes(k);
const needsLevel = (k: MovementKind) => ["promotion", "demotion"].includes(k);
const needsManager = (k: MovementKind) => ["manager_change", "department_transfer"].includes(k);
const needsTeam = (k: MovementKind) => ["team_transfer"].includes(k);
const needsEndDate = (k: MovementKind) =>
  ["temporary_assignment", "acting_assignment", "leave", "suspension"].includes(k);

const MovementWizard = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_MOVEMENTS_MANAGE)
    || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_MANAGE)
    || hasPermission(ADMIN_PERMISSIONS.FOUNDER_OFFICE_ACCESS);

  const { data: employees } = useEmployeesList({});
  const { data: departments } = useDepartments();
  const create = useCreateMovement();

  const [form, setForm] = useState({
    employee_id: params.get("employee_id") ?? "",
    kind: (params.get("kind") as MovementKind) ?? "department_transfer",
    reason: "",
    business_justification: "",
    effective_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    target_department_id: "",
    target_level: "",
    target_manager_id: "",
    target_team_name: "",
  });

  const chain = useMemo(() => movementChain(form.kind), [form.kind]);

  if (!canManage) return <PermissionDenied />;

  const submit = async (auto_submit: boolean) => {
    if (!form.employee_id) return toast.error("Choose an employee");
    if (needsLevel(form.kind) && !form.target_level) return toast.error("Target level required");
    if (needsDept(form.kind) && !form.target_department_id) return toast.error("Target department required");
    if (needsEndDate(form.kind) && !form.end_date) return toast.error("End date required");

    try {
      const mov = await create.mutateAsync({
        employee_id: form.employee_id,
        kind: form.kind,
        reason: form.reason || undefined,
        business_justification: form.business_justification || undefined,
        effective_date: form.effective_date || null,
        end_date: form.end_date || null,
        target_department_id: form.target_department_id || null,
        target_level: form.target_level || null,
        target_manager_id: form.target_manager_id || null,
        target_team_name: form.target_team_name || null,
        auto_submit,
      });
      toast.success(auto_submit ? "Movement submitted for approval" : "Draft saved");
      nav(`/admin-os/people-ops/movements/${mov.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create movement");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        eyebrow="MOVEMENT WIZARD"
        title="New workforce movement"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin-os/people-ops/movements"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
          </Button>
        }
      />

      <SectionCard title="Movement details">
        <div className="grid gap-4">
          <div>
            <Label>Kind</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as MovementKind })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Employee *</Label>
            <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {(employees ?? []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name} · {e.employee_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsDept(form.kind) && (
            <div>
              <Label>Target department</Label>
              <Select value={form.target_department_id} onValueChange={(v) => setForm({ ...form, target_department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {(departments ?? []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {needsTeam(form.kind) && (
            <div>
              <Label>Target team</Label>
              <Input value={form.target_team_name} onChange={(e) => setForm({ ...form, target_team_name: e.target.value })} />
            </div>
          )}
          {needsLevel(form.kind) && (
            <div>
              <Label>Target level *</Label>
              <Input placeholder="e.g. L4" value={form.target_level} onChange={(e) => setForm({ ...form, target_level: e.target.value })} />
            </div>
          )}
          {needsManager(form.kind) && (
            <div>
              <Label>Target reporting manager</Label>
              <Select value={form.target_manager_id} onValueChange={(v) => setForm({ ...form, target_manager_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? []).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Effective date</Label>
              <Input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
            </div>
            {needsEndDate(form.kind) && (
              <div>
                <Label>End date *</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            )}
          </div>

          <div>
            <Label>Reason</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div>
            <Label>Business justification</Label>
            <Textarea value={form.business_justification} onChange={(e) => setForm({ ...form, business_justification: e.target.value })} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Approval chain" description="Each step must approve before the movement can be applied.">
        <ol className="space-y-2 text-sm">
          {chain.map((role, i) => (
            <li key={role} className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5">
              <span className="text-xs font-semibold w-6 text-center rounded bg-muted">{i + 1}</span>
              <span className="uppercase tracking-wide text-xs">{role.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ol>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => submit(false)} disabled={create.isPending}>Save draft</Button>
        <Button onClick={() => submit(true)} disabled={create.isPending}>Submit for approval</Button>
      </div>
    </div>
  );
};

export default MovementWizard;
