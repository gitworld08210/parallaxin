import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useAllOffers,
  useApplications,
  useGenerateOffer,
  useUpdateOffer,
  type OfferStatus,
} from "@/hooks/admin-os/useRecruitment";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-amber-500/10 text-amber-600",
  approved: "bg-sky-500/10 text-sky-600",
  sent: "bg-primary/10 text-primary",
  accepted: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-red-500/10 text-red-600",
  expired: "bg-muted text-muted-foreground",
  withdrawn: "bg-muted text-muted-foreground",
};

const schema = z.object({
  application_id: z.string().uuid(),
  role_title: z.string().trim().min(2).max(120),
  level: z.string().trim().max(20).optional(),
  salary_amount: z.number().min(0).max(1e9),
  salary_currency: z.string().trim().min(1).max(6),
  effective_date: z.string().optional(),
  expires_at: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const OfferCenter = () => {
  const { hasPermission } = useEmployee();
  const canOffer = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_OFFER);
  const [status, setStatus] = useState<OfferStatus | "">("");
  const [showForm, setShowForm] = useState(false);
  const { data: offers, isLoading } = useAllOffers(status ? { status: status as OfferStatus } : undefined);
  const { data: apps } = useApplications();
  const generate = useGenerateOffer();
  const update = useUpdateOffer();

  const [form, setForm] = useState({
    application_id: "", role_title: "", level: "", salary_amount: 0, salary_currency: "USD",
    effective_date: "", expires_at: "", notes: "",
  });

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_VIEW) && !canOffer)
    return <Navigate to="/admin-os/no-access" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ ...form, salary_amount: Number(form.salary_amount) });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    try {
      await generate.mutateAsync({
        application_id: parsed.data.application_id,
        role_title: parsed.data.role_title,
        level: parsed.data.level || null,
        salary_amount: parsed.data.salary_amount,
        salary_currency: parsed.data.salary_currency,
        effective_date: parsed.data.effective_date || null,
        expires_at: parsed.data.expires_at || null,
        notes: parsed.data.notes || null,
        status: "pending_approval",
      });
      toast.success("Offer generated");
      setShowForm(false);
      setForm({ application_id: "", role_title: "", level: "", salary_amount: 0, salary_currency: "USD", effective_date: "", expires_at: "", notes: "" });
    } catch (err) { toast.error((err as Error).message); }
  };

  const setStatusOf = async (id: string, next: OfferStatus) => {
    try {
      await update.mutateAsync({ id, patch: { status: next } });
      toast.success(`Offer ${next}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PEOPLE OPS · OFFERS</p>
          <h1 className="text-xl font-bold">Offer Center</h1>
        </div>
        {canOffer && (
          <button onClick={() => setShowForm((s) => !s)}
            className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold">
            {showForm ? "Cancel" : "Generate offer"}
          </button>
        )}
      </div>

      {showForm && canOffer && (
        <form onSubmit={submit} className="rounded-xl border border-border/60 bg-card p-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Application *</label>
            <select required value={form.application_id} onChange={(e) => setForm({ ...form, application_id: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
              <option value="">Choose…</option>
              {apps?.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.candidate?.full_name} → {a.hiring_request?.role_title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Role title *</label>
            <input required value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Level</label>
            <input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Salary</label>
            <input type="number" min={0} value={form.salary_amount} onChange={(e) => setForm({ ...form, salary_amount: Number(e.target.value) })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Currency</label>
            <input value={form.salary_currency} onChange={(e) => setForm({ ...form, salary_currency: e.target.value.toUpperCase() })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Effective date</label>
            <input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Expires at</label>
            <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={generate.isPending}
              className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">
              Save offer
            </button>
          </div>
        </form>
      )}

      <select value={status} onChange={(e) => setStatus(e.target.value as OfferStatus | "")}
        className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
        <option value="">All statuses</option>
        {["draft", "pending_approval", "approved", "sent", "accepted", "rejected", "expired", "withdrawn"].map((s) =>
          <option key={s} value={s}>{s}</option>)}
      </select>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !offers || offers.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No offers.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {offers.map((o: any) => (
              <div key={o.id} className="p-3 flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{o.role_title} · v{o.version}</p>
                    <span className="text-[10px] font-mono text-muted-foreground">{o.offer_number}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[o.status]}`}>{o.status}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {o.application?.candidate?.full_name} · {o.salary_amount} {o.salary_currency} · {o.level ?? "—"}
                    {o.effective_date ? ` · joins ${o.effective_date}` : ""}
                  </p>
                </div>
                {canOffer && (
                  <div className="flex gap-1 flex-wrap">
                    {o.status === "pending_approval" && <button onClick={() => setStatusOf(o.id, "approved")} className="rounded-md bg-sky-500/10 text-sky-600 px-2 py-1 text-[11px]">Approve</button>}
                    {o.status === "approved" && <button onClick={() => setStatusOf(o.id, "sent")} className="rounded-md bg-primary/10 text-primary px-2 py-1 text-[11px]">Send</button>}
                    {o.status === "sent" && (
                      <>
                        <button onClick={() => setStatusOf(o.id, "accepted")} className="rounded-md bg-emerald-500/10 text-emerald-600 px-2 py-1 text-[11px]">Mark accepted</button>
                        <button onClick={() => setStatusOf(o.id, "rejected")} className="rounded-md bg-red-500/10 text-red-600 px-2 py-1 text-[11px]">Mark rejected</button>
                      </>
                    )}
                    {!["accepted", "rejected", "withdrawn"].includes(o.status) && (
                      <button onClick={() => setStatusOf(o.id, "withdrawn")} className="rounded-md border border-border px-2 py-1 text-[11px]">Withdraw</button>
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

export default OfferCenter;
