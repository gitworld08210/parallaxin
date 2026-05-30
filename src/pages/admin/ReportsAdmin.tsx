import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Report = {
  id: string;
  reporter_id: string;
  target_kind: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

const STATUSES = ["open", "reviewed", "resolved"] as const;

const ReportsAdmin = () => {
  const [rows, setRows] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Report[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Review user-submitted reports.</p>
      </header>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
      : rows.length === 0 ? <p className="text-sm text-muted-foreground">No reports.</p>
      : (
        <div className="space-y-3">
          {rows.map((r) => (
            <article key={r.id} className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold capitalize">{r.target_kind} • {r.reason}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-all">target: {r.target_id}</p>
                  {r.details && <p className="text-sm mt-2 whitespace-pre-wrap">{r.details}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <select
                  value={r.status}
                  onChange={(e) => update(r.id, e.target.value)}
                  className="bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsAdmin;
