import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { z } from "zod";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useCorrections,
  useCreateCorrection,
  useReviewCorrection,
  type AttendanceStatus,
} from "@/hooks/admin-os/useAttendance";

const statuses: AttendanceStatus[] = [
  "present", "absent", "late", "half_day", "wfh", "business_travel", "training", "leave",
];

const schema = z.object({
  work_date: z.string().min(1),
  requested_status: z.enum(["present", "absent", "late", "half_day", "wfh", "business_travel", "training", "leave", "holiday", "weekend"]),
  reason: z.string().trim().min(3).max(1000),
});

const AttendanceCorrections = () => {
  const { employee, hasPermission } = useEmployee();
  const canReview = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ATTENDANCE_MANAGE);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "">("pending");
  const { data, isLoading } = useCorrections(status ? { status: status as any } : undefined);
  const create = useCreateCorrection();
  const review = useReviewCorrection();

  const [form, setForm] = useState({
    work_date: "",
    requested_status: "present" as AttendanceStatus,
    reason: "",
  });
  const [showForm, setShowForm] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    try {
      await create.mutateAsync({
        employee_id: employee.id,
        work_date: parsed.data.work_date,
        requested_status: parsed.data.requested_status,
        reason: parsed.data.reason,
      });
      toast.success("Correction submitted");
      setShowForm(false);
      setForm({ work_date: "", requested_status: "present", reason: "" });
    } catch (err) { toast.error((err as Error).message); }
  };

  const act = async (id: string, decision: "approved" | "rejected") => {
    try {
      const notes = decision === "rejected" ? prompt("Notes?") ?? undefined : undefined;
      await review.mutateAsync({ id, decision, notes });
      toast.success(`Correction ${decision}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PEOPLE OPS · CORRECTIONS</p>
          <h1 className="text-xl font-bold">Attendance Corrections</h1>
        </div>
        {employee && (
          <button onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> Request correction
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-border/60 bg-card p-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Work date</label>
            <input type="date" required value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Requested status</label>
            <select value={form.requested_status} onChange={(e) => setForm({ ...form, requested_status: e.target.value as AttendanceStatus })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Reason</label>
            <textarea required rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">Submit</button>
          </div>
        </form>
      )}

      <select value={status} onChange={(e) => setStatus(e.target.value as any)}
        className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
        <option value="">All</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No corrections.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {data.map((c: any) => (
              <div key={c.id} className="p-3 flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{c.employee?.full_name}</p>
                    <span className="text-[10px] font-mono text-muted-foreground">{c.employee?.employee_number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border">{c.status}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {c.work_date} · {c.current_status ?? "—"} → {c.requested_status} · {c.reason}
                  </p>
                </div>
                {canReview && c.status === "pending" && (
                  <div className="flex gap-1">
                    <button onClick={() => act(c.id, "approved")} className="rounded-md bg-emerald-500/10 text-emerald-600 px-2 py-1 text-[11px]">Approve</button>
                    <button onClick={() => act(c.id, "rejected")} className="rounded-md bg-red-500/10 text-red-600 px-2 py-1 text-[11px]">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceCorrections;
