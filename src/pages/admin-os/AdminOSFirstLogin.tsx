/**
 * AdminOSFirstLogin — enforces Phase 1.3 first-login flow:
 *   1. Change temporary password
 *   2. Configure 2FA
 *   3. Accept company policies
 *
 * Password change + policy acceptance are implemented here.
 * 2FA setup redirects to the existing /settings/security screen; on return
 * the employee can mark it done.
 *
 * All flag updates go through the `employees` table under the
 * "employees can update own first-login flags" RLS policy — a user can only
 * flip flags on their own row.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ShieldCheck, KeyRound, FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthProvider";

const POLICY_VERSION = "aurelix-employee-policy-2026-01";

const AdminOSFirstLogin = () => {
  const { employee, loading } = useEmployee();
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [marking2fa, setMarking2fa] = useState(false);

  useEffect(() => {
    if (!loading && !employee) nav("/admin-os/no-access", { replace: true });
  }, [loading, employee, nav]);

  if (loading || !employee) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const step1Done = !employee.requires_password_change;
  const step2Done = !employee.requires_2fa_setup;
  const step3Done = !!employee.policies_accepted_at;
  const allDone = step1Done && step2Done && step3Done;

  const strongPw = (v: string) =>
    v.length >= 12 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v);

  const savePassword = async () => {
    if (!strongPw(pw)) {
      toast.error("Password must be 12+ chars with upper, lower, number, and symbol.");
      return;
    }
    if (pw !== pw2) {
      toast.error("Passwords don't match.");
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      toast.error(error.message);
      setSavingPw(false);
      return;
    }
    const { error: e2 } = await supabase
      .from("employees")
      .update({ requires_password_change: false })
      .eq("user_id", user!.id);
    setSavingPw(false);
    if (e2) return toast.error(e2.message);
    toast.success("Password updated.");
    setPw("");
    setPw2("");
    qc.invalidateQueries({ queryKey: ["admin-os", "employee"] });
  };

  const mark2faDone = async () => {
    setMarking2fa(true);
    const { error } = await supabase
      .from("employees")
      .update({ requires_2fa_setup: false })
      .eq("user_id", user!.id);
    setMarking2fa(false);
    if (error) return toast.error(error.message);
    toast.success("2FA marked as configured.");
    qc.invalidateQueries({ queryKey: ["admin-os", "employee"] });
  };

  const acceptPolicies = async () => {
    setSavingPolicy(true);
    const { error } = await supabase
      .from("employees")
      .update({ policies_accepted_at: new Date().toISOString() })
      .eq("user_id", user!.id);
    setSavingPolicy(false);
    if (error) return toast.error(error.message);
    toast.success(`Policies accepted (${POLICY_VERSION}).`);
    qc.invalidateQueries({ queryKey: ["admin-os", "employee"] });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">FIRST LOGIN</p>
        <h1 className="mt-1 text-2xl font-bold">Activate your Aurelix account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Before you can enter Admin OS, complete these three steps. Your progress is saved as you go.
        </p>

        {/* Step 1 — Password */}
        <Step index={1} title="Change your temporary password" done={step1Done} icon={<KeyRound className="h-4 w-4" />}>
          {step1Done ? (
            <p className="text-xs text-muted-foreground">Password already changed. ✓</p>
          ) : (
            <div className="space-y-2">
              <input
                type="password"
                placeholder="New password (12+ chars)"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={savePassword}
                disabled={savingPw}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {savingPw ? "Saving…" : "Update password"}
              </button>
              <p className="text-[11px] text-muted-foreground">
                Must include uppercase, lowercase, number, and symbol.
              </p>
            </div>
          )}
        </Step>

        {/* Step 2 — 2FA */}
        <Step index={2} title="Configure Two-Factor Authentication" done={step2Done} icon={<ShieldCheck className="h-4 w-4" />}>
          {step2Done ? (
            <p className="text-xs text-muted-foreground">2FA configured. ✓</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Set up an authenticator app (Google Authenticator, 1Password, Authy) using the account security screen, then confirm below.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/settings/security"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted/40"
                >
                  Open 2FA setup ↗
                </a>
                <button
                  onClick={mark2faDone}
                  disabled={marking2fa}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {marking2fa ? "Saving…" : "I've configured 2FA"}
                </button>
              </div>
            </div>
          )}
        </Step>

        {/* Step 3 — Policies */}
        <Step index={3} title="Accept Aurelix employee policies" done={step3Done} icon={<FileCheck2 className="h-4 w-4" />}>
          {step3Done ? (
            <p className="text-xs text-muted-foreground">Policies accepted. ✓</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                I agree to Aurelix's employee code of conduct, security policy, and confidentiality policy (version {POLICY_VERSION}).
              </p>
              <button
                onClick={acceptPolicies}
                disabled={savingPolicy}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {savingPolicy ? "Saving…" : "Accept & continue"}
              </button>
            </div>
          )}
        </Step>

        {allDone && (
          <div className="mt-6 rounded-xl border border-primary/40 bg-primary/10 p-4">
            <p className="text-sm font-semibold text-primary">All steps complete.</p>
            <button
              onClick={() => nav("/admin-os", { replace: true })}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Enter Admin OS →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Step = ({
  index,
  title,
  done,
  icon,
  children,
}: {
  index: number;
  title: string;
  done: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className={`mt-5 rounded-2xl border p-5 ${done ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
    <div className="flex items-start gap-3">
      <div className="mt-0.5">
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">
            STEP {index}
          </p>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <h2 className="mt-0.5 text-sm font-semibold">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  </div>
);

export default AdminOSFirstLogin;
