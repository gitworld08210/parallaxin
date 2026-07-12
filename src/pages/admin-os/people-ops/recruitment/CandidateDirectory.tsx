import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useCandidates, useCreateCandidate } from "@/hooks/admin-os/useRecruitment";

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  source: z.string().trim().max(80).optional(),
  headline: z.string().trim().max(200).optional(),
  resume_url: z.string().trim().url().max(500).optional().or(z.literal("")),
});

const CandidateDirectory = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_MANAGE);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useCandidates({ search: search || undefined });
  const create = useCreateCandidate();

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_VIEW) && !canManage)
    return <Navigate to="/admin-os/no-access" replace />;

  const [form, setForm] = useState({ full_name: "", email: "", phone: "", source: "", headline: "", resume_url: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    try {
      await create.mutateAsync({
        full_name: parsed.data.full_name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        source: parsed.data.source || null,
        headline: parsed.data.headline || null,
        resume_url: parsed.data.resume_url || null,
      });
      toast.success("Candidate added");
      setShowForm(false);
      setForm({ full_name: "", email: "", phone: "", source: "", headline: "", resume_url: "" });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PEOPLE OPS · CANDIDATES</p>
          <h1 className="text-xl font-bold">Candidate Directory</h1>
        </div>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 py-2 text-xs font-semibold hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Add candidate
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-border/60 bg-card p-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Full name *</label>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Source</label>
            <input value={form.source} placeholder="LinkedIn, Referral..." onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Resume URL</label>
            <input value={form.resume_url} onChange={(e) => setForm({ ...form, resume_url: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Headline</label>
            <input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
            <button type="submit" disabled={create.isPending} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">
              Save
            </button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, ID"
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border/60 text-sm" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No candidates found.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {data.map((c) => (
              <Link key={c.id} to={`/admin-os/people-ops/recruitment/candidates/${c.id}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/40">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {c.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{c.full_name}</p>
                    <span className="text-[10px] font-mono text-muted-foreground">{c.candidate_number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border">{c.current_stage}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.email ?? "—"} · {c.headline ?? ""}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{c.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateDirectory;
