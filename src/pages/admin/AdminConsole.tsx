import { useEffect, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronLeft, ShieldCheck, BadgeCheck, Crown, Flag, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type VR = { id: string; user_id: string; full_name: string; category: string; links: string[] | null; id_doc_url: string | null; status: string; created_at: string; profile?: { username: string; display_name: string; avatar_url: string | null } | null };
type FA = { id: string; user_id: string; chronicle: string; why: string; desired_role: string | null; status: string; created_at: string; profile?: { username: string; display_name: string; avatar_url: string | null } | null };
type RP = { id: string; reporter_id: string; target_id: string; target_kind: string; reason: string; details: string | null; status: string; created_at: string };

const AdminConsole = () => {
  const { isAdmin, loading } = useUserRole();

  if (loading) return <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 h-14 px-3 flex items-center gap-2 bg-background/90 backdrop-blur border-b border-border">
        <Link to="/" className="p-1.5"><ChevronLeft className="h-5 w-5" /></Link>
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Admin Console</h1>
      </header>

      <Tabs defaultValue="verification" className="px-3 pt-3">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="verification"><BadgeCheck className="h-4 w-4 mr-1.5" /> Verify</TabsTrigger>
          <TabsTrigger value="founder"><Crown className="h-4 w-4 mr-1.5" /> Founder</TabsTrigger>
          <TabsTrigger value="reports"><Flag className="h-4 w-4 mr-1.5" /> Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="verification" className="mt-4"><VerificationQueue /></TabsContent>
        <TabsContent value="founder" className="mt-4"><FounderQueue /></TabsContent>
        <TabsContent value="reports" className="mt-4"><ReportsQueue /></TabsContent>
      </Tabs>
    </div>
  );
};

const Header = ({ title, count, onRefresh }: { title: string; count: number; onRefresh: () => void }) => (
  <div className="flex items-center justify-between mb-3">
    <p className="text-sm text-muted-foreground">{title} · <span className="text-foreground font-semibold">{count}</span></p>
    <button onClick={onRefresh} className="p-1.5 rounded hover:bg-muted" aria-label="Refresh"><RefreshCw className="h-4 w-4" /></button>
  </div>
);

const Avatar = ({ url, name }: { url?: string | null; name: string }) => (
  url ? <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover" />
      : <div className="h-10 w-10 rounded-full bg-muted grid place-items-center text-xs font-semibold">{name.slice(0, 2).toUpperCase()}</div>
);

const VerificationQueue = () => {
  const [items, setItems] = useState<VR[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("verification_requests")
      .select("id, user_id, full_name, category, links, id_doc_url, status, created_at, profile:profiles!verification_requests_user_id_fkey(username, display_name, avatar_url)" as any)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    // Fallback without join if FK alias not present
    if (!data) {
      const { data: raw } = await supabase.from("verification_requests").select("*").eq("status", "pending").order("created_at");
      const ids = (raw ?? []).map((r: any) => r.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      setItems((raw ?? []).map((r: any) => ({ ...r, profile: map.get(r.user_id) ?? null })));
    } else {
      setItems(data as any);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (request_id: string, action: "approve" | "reject") => {
    setBusy(request_id);
    const { error } = await supabase.functions.invoke("admin-approve-verification", { body: { request_id, action } });
    setBusy(null);
    if (error) toast.error(error.message || "Failed");
    else { toast.success(action === "approve" ? "Approved" : "Rejected"); load(); }
  };

  const getDocUrl = async (path: string) => {
    const { data } = await supabase.storage.from("verification-docs").createSignedUrl(path, 60 * 10);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>;

  return (
    <div>
      <Header title="Pending verification" count={items.length} onRefresh={load} />
      {items.length === 0 && <p className="text-sm text-muted-foreground py-12 text-center">No pending requests.</p>}
      <div className="space-y-3">
        {items.map((v) => (
          <div key={v.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <Avatar url={v.profile?.avatar_url} name={v.profile?.display_name || v.full_name} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{v.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">@{v.profile?.username ?? v.user_id.slice(0, 8)} · {v.category}</p>
              </div>
            </div>
            {!!v.links?.length && (
              <ul className="mt-2 text-xs text-primary space-y-0.5">
                {v.links.map((l, i) => <li key={i}><a href={l} target="_blank" rel="noreferrer noopener" className="underline truncate block">{l}</a></li>)}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              {v.id_doc_url && (
                <Button variant="outline" size="sm" onClick={() => getDocUrl(v.id_doc_url!)}>View ID</Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" disabled={busy === v.id} onClick={() => act(v.id, "reject")}>Reject</Button>
                <Button size="sm" disabled={busy === v.id} onClick={() => act(v.id, "approve")}>Approve</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ROLES = ["architect", "curator", "sentinel", "innovator"] as const;

const FounderQueue = () => {
  const [items, setItems] = useState<FA[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleByApp, setRoleByApp] = useState<Record<string, string>>({});
  const [titleByApp, setTitleByApp] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: raw } = await (supabase.from("founder_applications") as any).select("*").eq("status", "pending").order("created_at");
    const ids = (raw ?? []).map((r: any) => r.user_id);
    const { data: profs } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    setItems((raw ?? []).map((r: any) => ({ ...r, profile: map.get(r.user_id) ?? null })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (application_id: string, action: "approve" | "reject") => {
    setBusy(application_id);
    const { error } = await supabase.functions.invoke("admin-approve-founder", {
      body: { application_id, action, council_role: roleByApp[application_id], founder_title: titleByApp[application_id] },
    });
    setBusy(null);
    if (error) toast.error(error.message || "Failed");
    else { toast.success(action === "approve" ? "Inducted" : "Rejected"); load(); }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>;

  return (
    <div>
      <Header title="Pending founder applications" count={items.length} onRefresh={load} />
      {items.length === 0 && <p className="text-sm text-muted-foreground py-12 text-center">No pending applications.</p>}
      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <Avatar url={a.profile?.avatar_url} name={a.profile?.display_name || "?"} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{a.profile?.display_name || a.profile?.username}</p>
                <p className="text-xs text-muted-foreground truncate">@{a.profile?.username} · wants {a.desired_role ?? "any wing"}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Chronicle</p>
                <p className="whitespace-pre-wrap text-sm leading-snug mt-0.5">{a.chronicle}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Why</p>
                <p className="whitespace-pre-wrap text-sm leading-snug mt-0.5">{a.why}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select
                value={roleByApp[a.id] ?? a.desired_role ?? ""}
                onChange={(e) => setRoleByApp((p) => ({ ...p, [a.id]: e.target.value }))}
                className="bg-background border border-border rounded-md px-2 py-1.5 text-xs"
              >
                <option value="">Choose wing</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input
                value={titleByApp[a.id] ?? ""}
                onChange={(e) => setTitleByApp((p) => ({ ...p, [a.id]: e.target.value }))}
                placeholder="Founder title (optional)"
                className="bg-background border border-border rounded-md px-2 py-1.5 text-xs"
              />
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <Button variant="outline" size="sm" disabled={busy === a.id} onClick={() => act(a.id, "reject")}>Reject</Button>
              <Button size="sm" disabled={busy === a.id} onClick={() => act(a.id, "approve")}>Induct</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReportsQueue = () => {
  const [items, setItems] = useState<RP[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("reports").select("*").eq("status", "open").order("created_at", { ascending: false });
    setItems((data ?? []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string, status: "resolved" | "dismissed") => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(status); load(); }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>;
  return (
    <div>
      <Header title="Open reports" count={items.length} onRefresh={load} />
      {items.length === 0 && <p className="text-sm text-muted-foreground py-12 text-center">No open reports.</p>}
      <div className="space-y-2">
        {items.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{r.target_kind} · {new Date(r.created_at).toLocaleString()}</p>
            <p className="text-sm mt-1 font-semibold">{r.reason}</p>
            {r.details && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{r.details}</p>}
            <p className="text-[10px] font-mono text-muted-foreground mt-2 truncate">target: {r.target_id}</p>
            <div className="mt-2 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => resolve(r.id, "dismissed")}>Dismiss</Button>
              <Button size="sm" onClick={() => resolve(r.id, "resolved")}>Resolve</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminConsole;
