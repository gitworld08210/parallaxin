import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, LogOut, KeyRound, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { toast } from "sonner";

const ExecutiveSecurity = () => {
  const { user } = useAuth();
  const { employee } = useEmployee();
  const qc = useQueryClient();

  const sessions = useQuery({
    queryKey: ["executive", "sessions", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_sessions")
        .select("*")
        .eq("employee_id", employee!.id)
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const history = useQuery({
    queryKey: ["executive", "login-history", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_events")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employee_sessions")
        .update({ revoked_at: new Date().toISOString(), revoked_by: user?.id, revoke_reason: "user_revoked" })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null, module: "founder_office",
        action: "session.revoke", target_type: "employee_session", target_id: id,
      });
    },
    onSuccess: () => {
      toast.success("Session revoked");
      qc.invalidateQueries({ queryKey: ["executive", "sessions"] });
    },
  });

  const revokeAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut({ scope: "others" as any });
      if (error) throw error;
      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null, module: "founder_office",
        action: "session.revoke_all", target_type: "user", target_id: user?.id ?? "",
      });
    },
    onSuccess: () => toast.success("All other sessions signed out"),
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const [pw, setPw] = useState("");
  const changePassword = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    await supabase.from("admin_audit_logs").insert({
      actor_user_id: user?.id ?? null, module: "founder_office",
      action: "password.change", target_type: "user", target_id: user?.id ?? "",
    });
    setPw("");
    toast.success("Password updated");
  };

  const [email, setEmail] = useState("");
  const changeEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Invalid email");
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return toast.error(error.message);
    await supabase.from("admin_audit_logs").insert({
      actor_user_id: user?.id ?? null, module: "founder_office",
      action: "email.change", target_type: "user", target_id: user?.id ?? "",
    });
    setEmail("");
    toast.success("Check your inbox to confirm the change");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            EXECUTIVE · SECURITY
          </p>
          <h1 className="text-2xl font-bold">Security Settings</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <p className="text-xs font-bold tracking-[0.15em] text-muted-foreground flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5" /> CHANGE PASSWORD
          </p>
          <input
            type="password" value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="New password (min 8 chars)"
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm w-full"
          />
          <button
            onClick={changePassword}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 h-9 text-xs font-semibold hover:bg-primary/90"
          >
            Update password
          </button>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <p className="text-xs font-bold tracking-[0.15em] text-muted-foreground flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" /> CHANGE EMAIL
          </p>
          <input
            type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="new@company.com"
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm w-full"
          />
          <button
            onClick={changeEmail}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 h-9 text-xs font-semibold hover:bg-primary/90"
          >
            Send confirmation
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
          <p className="text-xs font-bold tracking-[0.15em] text-muted-foreground">
            ACTIVE SESSIONS
          </p>
          <button
            disabled={revokeAll.isPending}
            onClick={() => revokeAll.mutate()}
            className="text-[11px] px-2 py-1 rounded border border-red-500/40 text-red-500 hover:bg-red-500/10 disabled:opacity-50 inline-flex items-center gap-1"
          >
            {revokeAll.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            <LogOut className="h-3 w-3" /> Sign out all other sessions
          </button>
        </div>
        {sessions.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !sessions.data || sessions.data.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No sessions recorded yet.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {sessions.data.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.user_agent ?? "Unknown device"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Started {new Date(s.started_at).toLocaleString()}
                    {s.ip ? ` · ${s.ip}` : ""}
                    {s.revoked_at ? ` · revoked ${new Date(s.revoked_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
                {!s.revoked_at && (
                  <button
                    onClick={() => revoke.mutate(s.id)}
                    className="text-[11px] px-2 py-1 rounded border border-border hover:bg-muted"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 text-xs font-bold tracking-[0.15em] text-muted-foreground">
          LOGIN HISTORY
        </div>
        {history.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !history.data || history.data.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No login events yet.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {history.data.map((h: any) => (
              <div key={h.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{h.user_agent ?? "Unknown"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()}
                    {h.ip ? ` · ${h.ip}` : ""}
                    {h.city ? ` · ${h.city}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveSecurity;
