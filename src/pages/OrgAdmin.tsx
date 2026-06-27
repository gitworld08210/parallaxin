import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users, UserPlus, BarChart3, FileText, Search, Trash2, Shield, Pin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { AFFILIATION_ROLES, labelForRole } from "@/lib/affiliationRoles";

type Tab = "team" | "affiliations" | "analytics" | "posts";

type Org = {
  id: string;
  name: string;
  username: string;
  logo_url: string | null;
  email: string | null;
  industry: string | null;
  description: string | null;
  verified: boolean;
};

type Aff = {
  id: string;
  role: string;
  status: string;
  started_on: string | null;
  ended_on: string | null;
  note: string | null;
  created_at: string;
  user: { user_id: string; username: string; display_name: string; avatar_url: string | null } | null;
};

const glass = "bg-secondary/40 backdrop-blur-xl border border-border/60 rounded-3xl";

const OrgAdmin = () => {
  const { username } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("team");
  const [affs, setAffs] = useState<Aff[]>([]);
  const [teamQuery, setTeamQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Issue form
  const [issueOpen, setIssueOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [role, setRole] = useState(AFFILIATION_ROLES[0].value as string);
  const [startedOn, setStartedOn] = useState(new Date().toISOString().slice(0, 10));
  const [endedOn, setEndedOn] = useState("");
  const [note, setNote] = useState("");
  const [issuing, setIssuing] = useState(false);

  const loadAll = async () => {
    if (!username) return;
    setLoading(true);
    const { data: o } = await supabase.from("organizations" as any).select("*").eq("username", username).maybeSingle();
    if (!o) { setLoading(false); return; }
    setOrg(o as any);

    if (user) {
      const { data: m } = await supabase.from("organization_members" as any)
        .select("member_role").eq("org_id", (o as any).id).eq("user_id", user.id).maybeSingle();
      setIsAdmin(!!m && ["owner", "admin"].includes((m as any).member_role));
    }

    const { data: a } = await supabase.from("affiliations" as any)
      .select("id, role, status, started_on, ended_on, note, created_at, user:profiles!affiliations_user_id_fkey(user_id, username, display_name, avatar_url)")
      .eq("org_id", (o as any).id)
      .order("created_at", { ascending: false });
    // Fallback if foreign key alias missing
    let items: Aff[] = (a as any) ?? [];
    if (!a) {
      const { data: a2 } = await supabase.from("affiliations" as any)
        .select("id, role, status, started_on, ended_on, note, created_at, user_id")
        .eq("org_id", (o as any).id).order("created_at", { ascending: false });
      const ids = (a2 ?? []).map((x: any) => x.user_id);
      const { data: pf } = ids.length
        ? await supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", ids)
        : { data: [] as any[] };
      const byId = new Map((pf ?? []).map((p: any) => [p.user_id, p]));
      items = (a2 ?? []).map((x: any) => ({ ...x, user: byId.get(x.user_id) ?? null }));
    }
    setAffs(items);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [username, user?.id]);

  const team = useMemo(() => affs.filter((a) => a.status === "active"), [affs]);
  const pending = useMemo(() => affs.filter((a) => a.status === "pending"), [affs]);
  const past = useMemo(() => affs.filter((a) => ["revoked", "ended", "declined"].includes(a.status)), [affs]);

  const issue = async () => {
    if (!org || !target.trim()) return;
    setIssuing(true);
    try {
      const { error } = await supabase.rpc("issue_affiliation" as any, {
        _org_id: org.id,
        _target_username: target.trim().toLowerCase(),
        _role: role,
        _started_on: startedOn || null,
        _ended_on: endedOn || null,
        _note: note.trim() || null,
      });
      if (error) throw error;
      toast.success("Invitation sent ✦");
      setIssueOpen(false);
      setTarget(""); setNote(""); setEndedOn("");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Could not send invitation");
    } finally { setIssuing(false); }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this affiliation?")) return;
    const { error } = await supabase.rpc("revoke_affiliation" as any, { _aff_id: id, _reason: null });
    if (error) toast.error(error.message); else { toast.success("Revoked"); loadAll(); }
  };

  const updateRole = async (id: string, newRole: string) => {
    const { error } = await supabase.rpc("update_affiliation_role" as any, { _aff_id: id, _role: newRole });
    if (error) toast.error(error.message); else loadAll();
  };

  if (loading) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!org) return <div className="p-10 text-center text-sm text-muted-foreground">Organization not found.</div>;
  if (!isAdmin) return <div className="p-10 text-center text-sm text-muted-foreground">You don't have access to this dashboard.</div>;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "team", label: "Team", icon: Users },
    { id: "affiliations", label: "Affiliations", icon: UserPlus },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "posts", label: "Posts", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />

      {/* Top bar */}
      <header className="sticky top-0 z-30 h-14 px-3 flex items-center justify-between gap-3 bg-background/80 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-1)} className="p-2 -ml-2"><ArrowLeft className="h-5 w-5" /></button>
          <span className="text-sm font-bold tracking-tight">Org admin</span>
        </div>
        <Link to={`/u/${org.username}`} className="text-xs text-primary">View public profile</Link>
      </header>

      <div className="relative px-4 pt-5">
        {/* Org card */}
        <div className={`${glass} p-5 flex items-center gap-4 shadow-glow/20`}>
          {org.logo_url ? (
            <img src={org.logo_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-secondary grid place-items-center"><Shield className="h-6 w-6 text-muted-foreground" /></div>
          )}
          <div className="min-w-0">
            <p className="font-bold truncate">{org.name}</p>
            <p className="text-xs text-muted-foreground truncate">@{org.username} · {org.industry || "—"}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-1 mt-5 p-1 bg-secondary/40 border border-border rounded-2xl">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 ${tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{t.label}</span>
              <span className="xs:hidden">{t.label}</span>
            </button>
          ))}
        </div>

        {/* TEAM */}
        {tab === "team" && (
          <div className="mt-5 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={teamQuery}
                onChange={(e) => setTeamQuery(e.target.value)}
                placeholder="Search team by name or username…"
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-secondary/60 border border-border text-sm outline-none focus:border-primary/60"
              />
            </div>
            {(() => {
              const q = teamQuery.trim().toLowerCase();
              const filtered = q
                ? team.filter((a) =>
                    (a.user?.username || "").toLowerCase().includes(q) ||
                    (a.user?.display_name || "").toLowerCase().includes(q) ||
                    labelForRole(a.role).toLowerCase().includes(q))
                : team;
              if (team.length === 0) return <p className="text-sm text-muted-foreground text-center py-10">No active members yet.</p>;
              if (filtered.length === 0) return <p className="text-sm text-muted-foreground text-center py-10">No matches for “{teamQuery}”.</p>;
              return filtered.map((a) => (
                <div key={a.id} className={`${glass} px-3 py-3 flex items-center gap-3`}>
                  {a.user?.avatar_url ? (
                    <img src={a.user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-secondary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{a.user?.display_name || a.user?.username}</p>
                    <p className="text-xs text-muted-foreground">{labelForRole(a.role)} · since {a.started_on?.slice(0,10) || "—"}</p>
                  </div>
                  <select value={a.role} onChange={(e) => updateRole(a.id, e.target.value)} className="text-xs bg-secondary border border-border rounded-lg px-2 py-1">
                    {AFFILIATION_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <button onClick={() => revoke(a.id)} className="p-2 text-destructive" aria-label="Revoke"><Trash2 className="h-4 w-4" /></button>
                </div>
              ));
            })()}
          </div>
        )}

        {/* AFFILIATIONS */}
        {tab === "affiliations" && (
          <div className="mt-5">
            <button
              onClick={() => setIssueOpen(true)}
              className="w-full py-3 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow inline-flex items-center justify-center gap-2"
            >
              <UserPlus className="h-4 w-4" /> Issue new affiliation
            </button>

            <Section title={`Pending (${pending.length})`}>
              {pending.length === 0 ? <Empty text="No pending invites" /> :
                pending.map((a) => (
                  <Row key={a.id} a={a} actions={<button onClick={() => revoke(a.id)} className="text-xs text-destructive">Cancel</button>} />
                ))}
            </Section>

            <Section title={`Past (${past.length})`}>
              {past.length === 0 ? <Empty text="Nothing here yet" /> :
                past.map((a) => <Row key={a.id} a={a} muted />)}
            </Section>
          </div>
        )}

        {/* ANALYTICS */}
        {tab === "analytics" && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat label="Active members" value={team.length} />
            <Stat label="Pending invites" value={pending.length} />
            <Stat label="Total affiliations" value={affs.length} />
            <Stat label="Past members" value={past.length} />
            <div className={`${glass} col-span-2 p-5 text-center text-xs text-muted-foreground`}>
              Detailed profile visits, post engagement and reach analytics will appear here.
            </div>
          </div>
        )}

        {/* POSTS */}
        {tab === "posts" && (
          <div className="mt-5 space-y-3">
            <Link to="/compose" className={`${glass} px-4 py-4 flex items-center gap-3`}>
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Create an official post</p>
                <p className="text-xs text-muted-foreground">Posts and reels publish from this org profile.</p>
              </div>
            </Link>
            <Link to="/compose/reel" className={`${glass} px-4 py-4 flex items-center gap-3`}>
              <Pin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Upload a reel</p>
                <p className="text-xs text-muted-foreground">Reach more people with short video.</p>
              </div>
            </Link>
            <Link to={`/u/${org.username}`} className={`${glass} px-4 py-4 flex items-center gap-3`}>
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Manage existing posts</p>
                <p className="text-xs text-muted-foreground">Open the org profile to pin or edit.</p>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Issue sheet */}
      {issueOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/60 p-3" onClick={() => setIssueOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className={`${glass} w-full max-w-md p-5`}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold">Issue affiliation</p>
              <button onClick={() => setIssueOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">Username</span>
                <div className="mt-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="username" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Role</span>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm">
                  {AFFILIATION_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Start date</span>
                  <input type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">End date (optional)</span>
                  <input type="date" value={endedOn} onChange={(e) => setEndedOn(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-muted-foreground">Message (optional)</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm min-h-[80px]" />
              </label>
              <button disabled={issuing} onClick={issue} className="w-full py-3 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60">
                {issuing ? "Sending…" : "Send invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-6">
    <p className="text-xs font-semibold text-muted-foreground mb-2">{title}</p>
    <div className="space-y-2">{children}</div>
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <p className="text-xs text-muted-foreground py-4 text-center">{text}</p>
);

const Row = ({ a, actions, muted }: { a: Aff; actions?: React.ReactNode; muted?: boolean }) => (
  <div className={`${glass} px-3 py-3 flex items-center gap-3 ${muted ? "opacity-60" : ""}`}>
    {a.user?.avatar_url ? (
      <img src={a.user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
    ) : (
      <div className="h-9 w-9 rounded-full bg-secondary" />
    )}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold truncate">{a.user?.display_name || a.user?.username}</p>
      <p className="text-xs text-muted-foreground">{labelForRole(a.role)} · {a.status}</p>
    </div>
    {actions}
  </div>
);

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className={`${glass} px-4 py-5`}>
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

export default OrgAdmin;
