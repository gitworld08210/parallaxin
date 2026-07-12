import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { useDepartments } from "@/hooks/admin-os/useEmployees";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useHiringRequests,
  useCreateHiringRequest,
  useUpdateHiringRequest,
  type HiringRequestStatus,
} from "@/hooks/admin-os/useRecruitment";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_hr: "bg-amber-500/10 text-amber-500",
  pending_founder: "bg-purple-500/10 text-purple-500",
  approved: "bg-emerald-500/10 text-emerald-500",
  on_hold: "bg-sky-500/10 text-sky-500",
  rejected: "bg-red-500/10 text-red-500",
  closed: "bg-muted text-muted-foreground",
  filled: "bg-primary/10 text-primary",
};

const schema = z.object({
  role_title: z.string().trim().min(2).max(120),
  department_id: z.string().uuid().optional().or(z.literal("")),
  level: z.string().trim().max(20).optional(),
  vacancies: z.number().int().min(1).max(999),
  priority: z.enum(["low", "medium", "high", "critical"]),
  reason: z.string().trim().min(5).max(1000),
  expected_joining: z.string().optional(),
});

const HiringRequestCenter = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_MANAGE);

  const [status, setStatus] = useState<HiringRequestStatus | "">("");
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useHiringRequests(status ? { status: status as HiringRequestStatus } : undefined);
  const { data: departments } = useDepartments();
  const create = useCreateHiringRequest();
  const update = useUpdateHiringRequest();

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_VIEW) && !canManage)
    return <Navigate to="/admin-os/no-access" replace />;

  const [form, setForm] = useState({
    role_title: "",
    department_id: "",
    level: "",
    vacancies: 1,
    priority: "medium" as "low" | "medium" | "high" | "critical",
    reason: "",
    expected_joining: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ ...form, vacancies: Number(form.vacancies) });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    try {
      await create.mutateAsync({
        role_title: parsed.data.role_title,
        department_id: parsed.data.department_id || null,
        level: parsed.data.level || null,
        vacancies: parsed.data.vacancies,
        priority: parsed.data.priority,
        reason: parsed.data.reason,
        expected_joining: parsed.data.expected_joining || null,
        status: "pending_hr",
      });
      toast.success("Hiring request submitted");
      setShowForm(false);
      setForm({ role_title: "", department_id: "", level: "", vacancies: 1, priority: "medium", reason: "", expected_joining: "" });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const advance = async (id: string, next: HiringRequestStatus) => {
    try {
      await update.mutateAsync({ id, patch: { status: next, approved_at: next === "approved" ? new Date().toISOString() : null } });
      toast.success(`Marked ${next}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            PEOPLE OPS · HIRING REQUESTS
          </p>
          <h1 className="text-xl font-bold">Manpower Requests</h1>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 py-2 text-xs font-semibold hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> New request
          </button>
        )}
      </div>

      {showForm && canManage && (
        <form onSubmit={submit} className="rounded-xl border border-border/60 bg-card p-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Role title *</label>
            <input required value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Department</label>
            <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
              <option value="">—</option>
              {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Level</label>
            <input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Vacancies</label>
            <input type="number" min={1} value={form.vacancies} onChange={(e) => setForm({ ...form, vacancies: Number(e.target.value) })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
              {["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Expected joining</label>
            <input type="date" value={form.expected_joining} onChange={(e) => setForm({ ...form, expected_joining: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Reason *</label>
            <textarea required rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
            <button type="submit" disabled={create.isPending} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">
              Submit request
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as HiringRequestStatus | "")}
          className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
          <option value="">All statuses</option>
          {["draft", "pending_hr", "pending_founder", "approved", "on_hold", "rejected", "closed", "filled"].map((s) =>
            <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No hiring requests.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {data.map((r: any) => (
              <div key={r.id} className="p-3 flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{r.role_title}</p>
                    <span className="text-[10px] font-mono text-muted-foreground">{r.request_number}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor[r.status] ?? "bg-muted"}`}>
                      {r.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border">{r.priority}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.department?.name ?? "No dept"} · {r.vacancies} vacancies · {r.level ?? "—"}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    {r.status === "pending_hr" && (
                      <button onClick={() => advance(r.id, "pending_founder")}
                        className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted">Send to Founder</button>
                    )}
                    {(r.status === "pending_hr" || r.status === "pending_founder") && (
                      <>
                        <button onClick={() => advance(r.id, "approved")}
                          className="rounded-md bg-emerald-500/10 text-emerald-600 px-2 py-1 text-[11px] hover:bg-emerald-500/20">Approve</button>
                        <button onClick={() => advance(r.id, "rejected")}
                          className="rounded-md bg-red-500/10 text-red-600 px-2 py-1 text-[11px] hover:bg-red-500/20">Reject</button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <button onClick={() => advance(r.id, "closed")}
                        className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted">Close</button>
                    )}
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

export default HiringRequestCenter;
