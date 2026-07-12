import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const audit = async (action: string, target_type: string, target_id: string | null, after: any = null) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("admin_audit_logs").insert({
    actor_user_id: user.id, module: "founder_office_security",
    action, target_type, target_id, after,
  } as any);
};

const logEvent = async (event_type: string, outcome: string = "success", metadata: any = {}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("executive_login_events").insert({
    user_id: user.id, event_type, outcome,
    user_agent: navigator.userAgent, metadata,
  } as any);
};

/* -------- Security Policy -------- */
export const useSecurityPolicy = () =>
  useQuery({
    queryKey: ["exec-security-policy"],
    queryFn: async () => {
      const { data, error } = await supabase.from("executive_security_policies").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useUpdateSecurityPolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: any) => {
      const { data: existing } = await supabase.from("executive_security_policies").select("id").limit(1).maybeSingle();
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...patch, updated_by: user?.id };
      let result;
      if (existing?.id) {
        const { data, error } = await supabase.from("executive_security_policies").update(payload).eq("id", existing.id).select().single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase.from("executive_security_policies").insert(payload).select().single();
        if (error) throw error;
        result = data;
      }
      await audit("policy.update", "executive_security_policy", result.id, patch);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-security-policy"] });
      toast.success("Security policy updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

/* -------- Trusted Devices -------- */
export const useTrustedDevices = () =>
  useQuery({
    queryKey: ["exec-trusted-devices"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("executive_trusted_devices")
        .select("*").eq("user_id", user.id).order("last_used_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const row = { ...payload, user_id: payload.user_id ?? user?.id };
      const { data, error } = payload.id
        ? await supabase.from("executive_trusted_devices").update(row).eq("id", payload.id).select().single()
        : await supabase.from("executive_trusted_devices").insert(row).select().single();
      if (error) throw error;
      await audit(payload.id ? "device.update" : "device.register", "executive_device", data.id, { name: data.device_name });
      await logEvent("device_registered", "success", { device_id: data.id });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-trusted-devices"] });
      toast.success("Device saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useDeleteDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("executive_trusted_devices").delete().eq("id", id);
      if (error) throw error;
      await audit("device.remove", "executive_device", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-trusted-devices"] });
      toast.success("Device removed");
    },
  });
};

/* -------- Recovery Methods -------- */
export const useRecoveryMethods = () =>
  useQuery({
    queryKey: ["exec-recovery-methods"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("executive_recovery_methods")
        .select("*").eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertRecoveryMethod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const row = { ...payload, user_id: payload.user_id ?? user?.id };
      const { data, error } = payload.id
        ? await supabase.from("executive_recovery_methods").update(row).eq("id", payload.id).select().single()
        : await supabase.from("executive_recovery_methods").insert(row).select().single();
      if (error) throw error;
      await audit(payload.id ? "recovery.update" : "recovery.add", "executive_recovery_method", data.id, { type: data.method_type });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-recovery-methods"] });
      toast.success("Recovery method saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useDeleteRecoveryMethod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("executive_recovery_methods").delete().eq("id", id);
      if (error) throw error;
      await audit("recovery.remove", "executive_recovery_method", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-recovery-methods"] }),
  });
};

/* -------- Recovery Codes -------- */
const hashCode = async (code: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const useRecoveryCodes = () =>
  useQuery({
    queryKey: ["exec-recovery-codes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("executive_recovery_codes")
        .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useGenerateRecoveryCodes = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      // Invalidate existing
      await supabase.from("executive_recovery_codes").delete().eq("user_id", user.id);
      const codes: string[] = [];
      const rows: any[] = [];
      for (let i = 0; i < 10; i++) {
        const bytes = new Uint8Array(6);
        crypto.getRandomValues(bytes);
        const code = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
        codes.push(code.match(/.{1,4}/g)!.join("-"));
        rows.push({ user_id: user.id, code_hash: await hashCode(code) });
      }
      const { error } = await supabase.from("executive_recovery_codes").insert(rows);
      if (error) throw error;
      await audit("recovery.codes_generated", "executive_recovery_code", null, { count: codes.length });
      return codes;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-recovery-codes"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

/* -------- Security Alerts -------- */
export const useSecurityAlerts = () =>
  useQuery({
    queryKey: ["exec-security-alerts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("executive_security_alerts")
        .select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAcknowledgeAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("executive_security_alerts")
        .update({ is_acknowledged: true, acknowledged_by: user?.id, acknowledged_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await audit("alert.acknowledge", "executive_security_alert", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exec-security-alerts"] }),
  });
};

/* -------- Login Events -------- */
export const useLoginEvents = () =>
  useQuery({
    queryKey: ["exec-login-events"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("executive_login_events")
        .select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

/* -------- MFA Settings -------- */
export const useMFASettings = () =>
  useQuery({
    queryKey: ["exec-mfa-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("executive_mfa_settings")
        .select("*").eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertMFA = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { method: string; is_enabled: boolean; secret_ref?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const row: any = {
        user_id: user.id, method: payload.method,
        is_enabled: payload.is_enabled, secret_ref: payload.secret_ref ?? null,
        verified_at: payload.is_enabled ? new Date().toISOString() : null,
      };
      const { data, error } = await supabase.from("executive_mfa_settings")
        .upsert(row, { onConflict: "user_id,method" }).select().single();
      if (error) throw error;
      await audit(payload.is_enabled ? "mfa.enable" : "mfa.disable", "executive_mfa", data.id, { method: payload.method });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-mfa-settings"] });
      toast.success("MFA updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

/* -------- Password Change -------- */
export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      const hash = await hashCode(newPassword);
      await supabase.from("executive_password_history").insert({ user_id: user.id, password_hash: hash, changed_by: user.id } as any);
      await audit("password.change", "auth_user", user.id);
      await logEvent("password_change", "success");
    },
    onSuccess: () => toast.success("Password changed"),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

/* -------- Employee Sessions (existing table) -------- */
export const useExecutiveSessions = (employeeId?: string) =>
  useQuery({
    queryKey: ["exec-sessions", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase.from("employee_sessions")
        .select("*").eq("employee_id", employeeId!).order("started_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useRevokeSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("employee_sessions")
        .update({ revoked_at: new Date().toISOString(), revoked_by: user?.id, revoke_reason: "user_revoked" } as any)
        .eq("id", id);
      if (error) throw error;
      await audit("session.revoke", "employee_session", id);
      await logEvent("session_revoked", "success", { session_id: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-sessions"] });
      toast.success("Session revoked");
    },
  });
};

export const useRevokeAllSessions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("employee_sessions")
        .update({ revoked_at: new Date().toISOString(), revoked_by: user?.id, revoke_reason: "bulk_revoke" } as any)
        .eq("employee_id", employeeId).is("revoked_at", null);
      if (error) throw error;
      await audit("session.revoke_all", "employee", employeeId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-sessions"] });
      toast.success("All sessions revoked");
    },
  });
};

/* -------- Security Score (derived) -------- */
export const useSecurityScore = () => {
  const { data: devices = [] } = useTrustedDevices();
  const { data: methods = [] } = useRecoveryMethods();
  const { data: mfa = [] } = useMFASettings();
  const { data: codes = [] } = useRecoveryCodes();
  const { data: alerts = [] } = useSecurityAlerts();

  let score = 0;
  const checks: { label: string; passed: boolean; weight: number }[] = [
    { label: "MFA enabled", passed: mfa.some((m: any) => m.is_enabled), weight: 30 },
    { label: "Recovery method configured", passed: methods.some((m: any) => m.is_active && m.is_verified), weight: 20 },
    { label: "Recovery codes generated", passed: codes.some((c: any) => !c.is_used), weight: 15 },
    { label: "Trusted device registered", passed: devices.length > 0, weight: 15 },
    { label: "No unacknowledged critical alerts", passed: !alerts.some((a: any) => !a.is_acknowledged && a.severity === "critical"), weight: 20 },
  ];
  checks.forEach((c) => { if (c.passed) score += c.weight; });
  return { score, checks };
};
