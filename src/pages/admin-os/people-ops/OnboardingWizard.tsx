import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, SectionCard } from "@/components/admin-os/ds";
import { useDepartments, useRoles, useEmployeesList } from "@/hooks/admin-os/useEmployees";
import { useStartOnboarding } from "@/hooks/admin-os/useOnboarding";

export default function OnboardingWizard() {
  const nav = useNavigate();
  const { data: departments = [] } = useDepartments();
  const { data: roles = [] } = useRoles();
  const { data: potentialManagers = [] } = useEmployeesList({ status: "active" });
  const start = useStartOnboarding();

  const [form, setForm] = useState({
    full_name: "",
    company_email: "",
    department_id: "",
    role_id: "",
    level: "",
    joining_date: "",
    reporting_manager_id: "",
    background_check_required: false,
  });

  const canSubmit =
    form.full_name.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.company_email) &&
    !!form.department_id &&
    !!form.role_id;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      const { employee } = await start.mutateAsync({
        full_name: form.full_name.trim(),
        company_email: form.company_email.trim().toLowerCase(),
        department_id: form.department_id,
        role_id: form.role_id,
        level: form.level || null,
        joining_date: form.joining_date || null,
        reporting_manager_id: form.reporting_manager_id || null,
        background_check_required: form.background_check_required,
      });
      toast.success(`Onboarding started · ${employee.employee_number}`);
      nav(`/admin-os/people-ops/onboarding/${employee.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start onboarding");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="People Ops · Onboarding"
        title="Start new onboarding"
        description="Creates the employee record, assigns manager and department, and queues the account for HR review. No credentials are issued yet."
      />

      <SectionCard title="Candidate details">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Aditi Sharma"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company_email">Company email</Label>
            <Input
              id="company_email"
              type="email"
              value={form.company_email}
              onChange={(e) => setForm({ ...form, company_email: e.target.value })}
              placeholder="aditi@aurelix.io"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role_id} onValueChange={(v) => setForm({ ...form, role_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {roles.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="level">Level</Label>
            <Input
              id="level"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              placeholder="L3, M1, IC2…"
              maxLength={20}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="joining_date">Joining date</Label>
            <Input
              id="joining_date"
              type="date"
              value={form.joining_date}
              onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Reporting manager</Label>
            <Select
              value={form.reporting_manager_id || "__none__"}
              onValueChange={(v) => setForm({ ...form, reporting_manager_id: v === "__none__" ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No manager (assign later)</SelectItem>
                {potentialManagers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name} · {m.employee_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <Checkbox
              id="bg"
              checked={form.background_check_required}
              onCheckedChange={(v) => setForm({ ...form, background_check_required: !!v })}
            />
            <Label htmlFor="bg" className="cursor-pointer">Background verification required</Label>
          </div>
        </div>
      </SectionCard>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => nav("/admin-os/people-ops/onboarding")}>Cancel</Button>
        <Button onClick={submit} disabled={!canSubmit || start.isPending}>
          {start.isPending ? "Starting…" : "Start onboarding"}
        </Button>
      </div>
    </div>
  );
}
