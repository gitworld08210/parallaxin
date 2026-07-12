import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Plus, Send } from "lucide-react";
import { z } from "zod";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useHireCompProposals,
  useCreateHireComp,
  useSubmitToFinance,
  useUpdateHireComp,
  type HireCompStatus,
} from "@/hooks/admin-os/useHireCompensation";
import { useEmployeesList } from "@/hooks/admin-os/useEmployees";

const statusColor: Record<HireCompStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_finance_l1: "bg-amber-500/10 text-amber-600",
  pending_finance_l2: "bg-sky-500/10 text-sky-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-red-500/10 text-red-600",
  sent_back: "bg-orange-500/10 text-orange-600",
};

const schema = z.object({
  employee_id: z.string().uuid().optional().or(z.literal("")),
  role_title: z.string().trim().min(2).max(120),
  level: z.string().trim().max(20).optional(),
  currency: z.string().trim().min(1).max(6),
  base_monthly: z.number().min(0).max(1e9),
  joining_bonus: z.number().min(0).max(1e9),
  variable_bonus: z.number().min(0).max(1e9),
  notes: z.string().trim().max(1000).optional(),
});

const fmt = (n: number, ccy: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: ccy || "INR", maximumFractionDigits: 0 }).format(n || 0);

const HireCompensation = () => {
  const { hasPermission } = useEmployee();
  const canSubmit = hasPermission(ADMIN_PERMISSIONS.FINANCE_HIRE_COMP_SUBMIT);
  const { data: proposals, isLoading } = useHireCompProposals();
  const { data: employees } = useEmployees();
  const create = useCreateHireComp();
  const submit = useSubmitToFinance();
  const update = useUpdateHireComp();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    employee_id: "",
    role_title: "",
    level: "",
    currency: "INR",
    base_monthly: 0,
    joining_bonus: 0,
    variable_bonus: 0,
    notes: "",
  });

  if (!canSubmit) return <Navigate to="/admin-os/no-access" replace />;

  const save = async (submitNow: boolean) => {
    const parsed = schema.safeParse({
      ...form,
      base_monthly: Number(form.base_monthly),
      joining_bonus: Number(form.joining_bonus),
      variable_bonus: Number(form.variable_bonus),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    try {
      const created = await create.mutateAsync({
        ...parsed.data,
        employee_id: parsed.data.employee_id || null,
        status: submitNow ? "pending_finance_l1" : "draft",
      } as any);
      if (submitNow && created?.id) {
        await submit.mutateAsync(created.id);
      }
      toast.success(submitNow ? "Sent to Finance L1" : "Draft saved");
      setShow(false);
      setForm({
        employee_id: "",
        role_title: "",
        level: "",
        currency: "INR",
        base_monthly: 0,
        joining_bonus: 0,
        variable_bonus: 0,
        notes: "",
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const resubmit = async (id: string) => {
    try {
      await update.mutateAsync({ id, patch: { status: "pending_finance_l1" as HireCompStatus } });
      toast.success("Resubmitted to Finance");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            PEOPLE OPS · HIRE COMPENSATION
          </p>
          <h1 className="text-xl font-bold">Salary Proposals to Finance</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            HR yaha se naye hire ki salary Finance ko bhejta hai. Finance L1 → L2 approve karega.
          </p>
        </div>
        <button
          onClick={() => setShow((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> New proposal
        </button>
      </div>

      {show && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(false);
          }}
          className="rounded-xl border border-border/60 bg-card p-4 grid gap-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Employee (optional, if already created)</label>
            <select
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
            >
              <option value="">— None yet —</option>
              {employees?.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.full_name} ({e.employee_number})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Role title *</label>
            <input
              required
              value={form.role_title}
              onChange={(e) => setForm({ ...form, role_title: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Level</label>
            <input
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Currency</label>
            <input
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Base monthly</label>
            <input
              type="number"
              min={0}
              value={form.base_monthly}
              onChange={(e) => setForm({ ...form, base_monthly: Number(e.target.value) })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Joining bonus</label>
            <input
              type="number"
              min={0}
              value={form.joining_bonus}
              onChange={(e) => setForm({ ...form, joining_bonus: Number(e.target.value) })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Variable bonus (annual)</label>
            <input
              type="number"
              min={0}
              value={form.variable_bonus}
              onChange={(e) => setForm({ ...form, variable_bonus: Number(e.target.value) })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Notes for Finance</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={create.isPending}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={create.isPending || submit.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold"
            >
              <Send className="h-3 w-3" /> Send to Finance
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !proposals || proposals.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Abhi tak koi proposal nahi.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {proposals.map((p) => (
              <div key={p.id} className="p-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{p.role_title}</p>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {p.proposal_number}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[p.status]}`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Base {fmt(Number(p.base_monthly), p.currency)}/mo · Joining{" "}
                    {fmt(Number(p.joining_bonus), p.currency)} · Variable{" "}
                    {fmt(Number(p.variable_bonus), p.currency)}
                  </p>
                  {(p.l1_reason || p.l2_reason) && (
                    <p className="text-[11px] text-orange-600 mt-0.5">
                      {p.l2_reason ?? p.l1_reason}
                    </p>
                  )}
                </div>
                {(p.status === "draft" || p.status === "sent_back") && (
                  <button
                    onClick={() => resubmit(p.id)}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1 text-[11px] font-semibold"
                  >
                    <Send className="h-3 w-3" /> Send to Finance
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HireCompensation;
