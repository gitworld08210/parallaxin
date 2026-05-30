import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Seat = {
  id: string;
  seat_number: number;
  user_id: string | null;
  is_active: boolean;
  founder_title: string | null;
  council_role: string | null;
  revoke_reason: string | null;
};

const FounderSeatsAdmin = () => {
  const [rows, setRows] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("founder_seats").select("*").order("seat_number");
    if (error) toast.error(error.message);
    setRows((data as Seat[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createSeat = async () => {
    const next = (rows.reduce((m, r) => Math.max(m, r.seat_number), 0) || 0) + 1;
    const { error } = await supabase.from("founder_seats").insert({ seat_number: next, is_active: false });
    if (error) return toast.error(error.message);
    toast.success(`Created seat #${next}`);
    load();
  };

  const save = async (s: Seat) => {
    const { error } = await supabase
      .from("founder_seats")
      .update({
        user_id: s.user_id || null,
        is_active: s.is_active,
        founder_title: s.founder_title,
        council_role: (s.council_role as any) || null,
        revoke_reason: s.revoke_reason,
      })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(`Seat #${s.seat_number} saved`);
    load();
  };

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Founder Seats</h1>
          <p className="text-sm text-muted-foreground">Assign founders, set titles, and manage council roles.</p>
        </div>
        <button onClick={createSeat} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold whitespace-nowrap">+ New seat</button>
      </header>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
      : rows.length === 0 ? <p className="text-sm text-muted-foreground">No seats yet. Click “New seat” to add one.</p>
      : (
        <div className="space-y-3">
          {rows.map((s) => (
            <article key={s.id} className="rounded-2xl border border-border bg-card/60 p-4 space-y-2">
              <p className="font-bold">Seat #{s.seat_number}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="User ID (uuid)" value={s.user_id || ""} onChange={(v) => setRows((rs) => rs.map((x) => x.id === s.id ? { ...x, user_id: v } : x))} />
                <Field label="Founder title" value={s.founder_title || ""} onChange={(v) => setRows((rs) => rs.map((x) => x.id === s.id ? { ...x, founder_title: v } : x))} />
                <Field label="Council role" value={s.council_role || ""} onChange={(v) => setRows((rs) => rs.map((x) => x.id === s.id ? { ...x, council_role: v } : x))} />
                <Field label="Revoke reason" value={s.revoke_reason || ""} onChange={(v) => setRows((rs) => rs.map((x) => x.id === s.id ? { ...x, revoke_reason: v } : x))} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.is_active} onChange={(e) => setRows((rs) => rs.map((x) => x.id === s.id ? { ...x, is_active: e.target.checked } : x))} />
                Active
              </label>
              <button onClick={() => save(s)} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Save</button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
    <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm" />
  </label>
);

export default FounderSeatsAdmin;
