import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { z } from "zod";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useLeavePolicies,
  useLeaveBalances,
  useLeaveRequests,
  useCreateLeaveRequest,
  useReviewLeaveRequest,
  type LeaveType,
  type LeaveRequestStatus,
} from "@/hooks/admin-os/useAttendance";

const daysBetween = (a: string, b: string) => {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.max(1, Math.floor((d2.getTime() - d1.getTime()) / 86400000) + 1);
};

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_lead: "bg-amber-500/10 text-amber-600",
  pending_dept_head: "bg-amber-500/10 text-amber-600",
  pending_hr: "bg-sky-500/10 text-sky-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-red-500/10 text-red-600",
  cancelled: "bg-muted text-muted-foreground",
};

const schema = z.object({
  leave_type: z.enum(["annual", "medical", "emergency", "maternity", "paternity", "bereavement", "compensatory", "unpaid"]),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  reason: z.string().trim().min(3).max(1000),
});

const LeaveCenter = () => {
  const { employee, hasPermission } = useEmployee();
  const canApprove = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEAVE_APPROVE);
  const canViewAll = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ATTENDANCE_VIEW) || canApprove;
  const year = new Date().getFullYear();

  const { data: policies } = useLeavePolicies();
  const { data: balances } = useLeaveBalances(employee?.id, year);
  const { data: myRequests } = useLeaveRequests({ employee_id: employee?.id });
  const { data: allRequests } = useLeaveRequests(canViewAll ? undefined : { employee_id: employee?.id });
  const create = useCreateLeaveRequest();
  const review = useReviewLeaveRequest();

  const [form, setForm] = useState({
    leave_type: "annual" as LeaveType,
    start_date: "",
    end_date: "",
    reason: "",
    handover_notes: "",
  });
  const [showForm, setShowForm] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    if (new Date(parsed.data.end_date) < new Date(parsed.data.start_date)) {
      toast.error("End date must be on or after start date");
      return;
    }
    const days = daysBetween(parsed.data.start_date, parsed.data.end_date);
    try {
      await create.mutateAsync({
        employee_id: employee.id,
        leave_type: parsed.data.leave_type,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date,
        days,
        reason: parsed.data.reason,
        handover_notes: form.handover_notes || null,
      });
      toast.success("Leave submitted");
      setShowForm(false);
      setForm({ leave_type: "annual", start_date: "", end_date: "", reason: "", handover_notes: "" });
    } catch (err) { toast.error((err as Error).message); }
  };

  const advance = async (id: string, next: LeaveRequestStatus) => {
    try {
      const reason = next === "rejected" ? prompt("Rejection reason?") ?? "Rejected" : undefined;
      await review.mutateAsync({ id, next, rejection_reason: reason });
      toast.success(`Marked ${next}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  const balanceRows = useMemo(() => {
    return (policies ?? []).map((p) => {
      const b = balances?.find((x) => x.leave_type === p.leave_type);
      return {
        leave_type: p.leave_type,
        allocated: b?.allocated ?? p.annual_allowance,
        used: b?.used ?? 0,
        pending: b?.pending ?? 0,
        available: (Number(b?.allocated ?? p.annual_allowance) - Number(b?.used ?? 0) - Number(b?.pending ?? 0)),
      };
    });
  }, [policies, balances]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PEOPLE OPS · LEAVE</p>
          <h1 className="text-xl font-bold">Leave Center · {year}</h1>
        </div>
        {employee && (
          <button onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> Request leave
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-border/60 bg-card p-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Leave type</label>
            <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value as LeaveType })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
              {["annual", "medical", "emergency", "maternity", "paternity", "bereavement", "compensatory", "unpaid"].map((t) =>
                <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div />
          <div>
            <label className="text-xs font-medium">Start</label>
            <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">End</label>
            <input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Reason</label>
            <textarea required rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Handover notes (optional)</label>
            <textarea rows={2} value={form.handover_notes} onChange={(e) => setForm({ ...form, handover_notes: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
            <button type="submit" disabled={create.isPending}
              className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">Submit</button>
          </div>
        </form>
      )}

      {/* Balances */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-sm font-semibold mb-3">My leave balance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {balanceRows.map((b) => (
            <div key={b.leave_type} className="rounded-lg border border-border/60 p-2">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{b.leave_type}</p>
              <p className="text-lg font-bold">{b.available}</p>
              <p className="text-[10px] text-muted-foreground">
                Allocated {b.allocated} · Used {b.used} · Pending {b.pending}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* My requests */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border/60 text-xs font-semibold text-muted-foreground">
          My leave requests
        </div>
        {!myRequests || myRequests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No leave requests yet.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {myRequests.map((r) => (
              <div key={r.id} className="p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{r.leave_type} · {r.days}d</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[r.status]}`}>{r.status}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{r.request_number}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {r.start_date} → {r.end_date} · {r.reason}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval queue */}
      {canApprove && (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-4 py-2 border-b border-border/60 text-xs font-semibold text-muted-foreground">
            Approvals · all requests
          </div>
          {!allRequests || allRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nothing to review.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {allRequests.filter((r) => !["approved", "rejected", "cancelled"].includes(r.status)).map((r: any) => (
                <div key={r.id} className="p-3 flex items-center gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{r.employee?.full_name}</p>
                      <span className="text-[10px] font-mono text-muted-foreground">{r.employee?.employee_number}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[r.status]}`}>{r.status}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {r.leave_type} · {r.days}d · {r.start_date} → {r.end_date} · {r.reason}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {r.status === "pending_lead" && (
                      <button onClick={() => advance(r.id, "pending_dept_head")}
                        className="rounded-md border border-border px-2 py-1 text-[11px]">Lead OK → Dept</button>
                    )}
                    {r.status === "pending_dept_head" && (
                      <button onClick={() => advance(r.id, "pending_hr")}
                        className="rounded-md border border-border px-2 py-1 text-[11px]">Dept OK → HR</button>
                    )}
                    {r.status === "pending_hr" && (
                      <button onClick={() => advance(r.id, "approved")}
                        className="rounded-md bg-emerald-500/10 text-emerald-600 px-2 py-1 text-[11px]">HR approve</button>
                    )}
                    <button onClick={() => advance(r.id, "rejected")}
                      className="rounded-md bg-red-500/10 text-red-600 px-2 py-1 text-[11px]">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaveCenter;
