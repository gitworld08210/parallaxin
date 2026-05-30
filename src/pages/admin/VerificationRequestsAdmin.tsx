import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, ExternalLink, FileText } from "lucide-react";

type Req = {
  id: string;
  user_id: string;
  full_name: string;
  category: string;
  organization: string | null;
  official_email: string | null;
  country: string | null;
  dob: string | null;
  reason: string | null;
  links: string[] | null;
  id_doc_url: string | null;
  supporting_doc_url: string | null;
  status: string;
  approved: boolean;
  created_at: string;
};

const signedUrl = async (path: string | null) => {
  if (!path) return null;
  const { data } = await supabase.storage.from("verification-docs").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
};

const VerificationRequestsAdmin = () => {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [docs, setDocs] = useState<Record<string, { id?: string | null; sup?: string | null }>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase.from("verification_requests").select("*").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    if (filter === "approved") q = q.eq("approved", true);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as Req[]) || []);
    setLoading(false);

    // resolve signed urls
    const map: Record<string, { id?: string | null; sup?: string | null }> = {};
    await Promise.all(
      ((data as Req[]) || []).map(async (r) => {
        map[r.id] = {
          id: await signedUrl(r.id_doc_url),
          sup: await signedUrl(r.supporting_doc_url),
        };
      })
    );
    setDocs(map);
  };

  useEffect(() => { load(); }, [filter]);

  const decide = async (id: string, approve: boolean) => {
    const { error } = await supabase
      .from("verification_requests")
      .update({ approved: approve, status: approve ? "approved" : "rejected" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved" : "Rejected");
    load();
  };

  return (
    <div>
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Verification Requests</h1>
          <p className="text-sm text-muted-foreground">Review and approve verification submissions.</p>
        </div>
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          {(["pending", "approved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requests.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <article key={r.id} className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg">{r.full_name}</h3>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {r.category}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      r.status === "approved" ? "bg-emerald-500/20 text-emerald-400"
                      : r.status === "rejected" ? "bg-destructive/20 text-destructive"
                      : "bg-muted text-muted-foreground"
                    }`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => decide(r.id, true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-semibold"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => decide(r.id, false)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/20 text-destructive hover:bg-destructive/30 text-sm font-semibold"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                )}
              </div>

              <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Row label="Organization" v={r.organization} />
                <Row label="Official email" v={r.official_email} />
                <Row label="Country" v={r.country} />
                <Row label="Date of birth" v={r.dob} />
              </dl>

              {r.reason && (
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm whitespace-pre-wrap">{r.reason}</p>
                </div>
              )}

              {r.links && r.links.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Links</p>
                  <ul className="space-y-1">
                    {r.links.map((l, i) => (
                      <li key={i}>
                        <a href={l} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                          {l} <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex gap-3 flex-wrap">
                {docs[r.id]?.id && (
                  <a href={docs[r.id].id!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted text-sm">
                    <FileText className="h-4 w-4" /> ID Document
                  </a>
                )}
                {docs[r.id]?.sup && (
                  <a href={docs[r.id].sup!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted text-sm">
                    <FileText className="h-4 w-4" /> Supporting Document
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

const Row = ({ label, v }: { label: string; v: string | null }) => (
  <div>
    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="text-sm">{v || <span className="text-muted-foreground">—</span>}</dd>
  </div>
);

export default VerificationRequestsAdmin;
