import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Mail, Phone, LogOut, RefreshCw, ShieldCheck } from "lucide-react";

const isSyntheticPhoneEmail = (e?: string | null) =>
  !!e && e.endsWith("@phone.aurelix.local");

export function useNeedsEmailVerification() {
  const { user } = useAuth();
  if (!user) return false;
  const meta: any = user.user_metadata || {};
  const emailVerified =
    !!user.email_confirmed_at && !isSyntheticPhoneEmail(user.email) && !meta.pending_email && !(user as any).new_email;
  const phoneVerified = !!(user as any).phone_confirmed_at || !!(user as any).phone;
  return !(emailVerified || phoneVerified);
}

export const EmailVerificationGate = () => {
  const { user, signOut } = useAuth();
  const meta: any = user?.user_metadata || {};

  const pendingEmail: string =
    meta.pending_email || (user as any)?.new_email || (isSyntheticPhoneEmail(user?.email) ? "" : user?.email ?? "");
  const needsEmailAdded = isSyntheticPhoneEmail(user?.email) && !meta.pending_email;

  const initialPhone: string = meta.pending_phone || (user as any)?.phone
    ? ((user as any)?.phone ? `+${(user as any).phone}` : meta.pending_phone)
    : "";

  const [emailInput, setEmailInput] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState<null | "email" | "phone">(null);

  // Poll for verification completion
  useEffect(() => {
    const iv = setInterval(async () => {
      await supabase.auth.refreshSession();
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  const attachEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      toast.error("Enter a valid email");
      return;
    }
    setBusy("email");
    const { error } = await supabase.auth.updateUser(
      { email: emailInput.trim(), data: { ...meta, pending_email: emailInput.trim() } },
      { emailRedirectTo: `${window.location.origin}/` },
    );
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Verification link sent — check your inbox");
  };

  const resendEmail = async () => {
    if (!pendingEmail) return;
    setBusy("email");
    const type = (user as any)?.new_email ? "email_change" : "signup";
    const { error } = await supabase.auth.resend({ type: type as any, email: pendingEmail } as any);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Verification link re-sent");
  };

  const sendPhoneCode = async () => {
    const p = phone.trim();
    if (!/^\+[1-9]\d{6,14}$/.test(p)) { toast.error("Enter phone in E.164 (e.g. +14155551234)"); return; }
    setBusy("phone");
    const { data, error } = await supabase.functions.invoke("send-phone-otp", { body: { phone: p } });
    setBusy(null);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Failed to send code"); return; }
    setOtpSent(true);
    toast.success("Code sent");
  };

  const verifyPhoneCode = async () => {
    if (!/^\d{4,8}$/.test(code)) { toast.error("Enter the code"); return; }
    setBusy("phone");
    const { data, error } = await supabase.functions.invoke("verify-signup-phone", {
      body: { phone: phone.trim(), code },
    });
    if (error || (data as any)?.error) {
      setBusy(null);
      toast.error((data as any)?.error || error?.message || "Invalid code");
      return;
    }
    await supabase.auth.refreshSession();
    setBusy(null);
    toast.success("Phone verified ✦");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl overflow-y-auto">
      <div className="min-h-full flex items-center justify-center px-6 py-10">
        <div className="max-w-sm w-full space-y-5">
          <div className="text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl">Verify your account</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Confirm your <span className="text-foreground">email</span> or your <span className="text-foreground">phone number</span> to continue. Either one unlocks your account.
              </p>
            </div>
          </div>

          {/* Email card */}
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Email</p>
            </div>
            {needsEmailAdded ? (
              <form onSubmit={(e) => { e.preventDefault(); attachEmail(); }} className="space-y-2">
                <input
                  type="email"
                  placeholder="you@aurelix.app"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full rounded-xl bg-background/60 border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary/60"
                  required
                />
                <button disabled={busy === "email"} className="w-full py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm disabled:opacity-60">
                  {busy === "email" ? "Sending…" : "Send verification link"}
                </button>
              </form>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Link sent to <span className="text-foreground font-medium">{pendingEmail}</span>. Open it to verify.
                </p>
                <button
                  onClick={resendEmail}
                  disabled={busy === "email"}
                  className="w-full py-2.5 rounded-xl bg-background/60 border border-border text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> {busy === "email" ? "Sending…" : "Resend email"}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Phone card */}
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Phone</p>
            </div>
            <input
              type="tel"
              placeholder="+14155551234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={otpSent}
              className="w-full rounded-xl bg-background/60 border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary/60 disabled:opacity-70"
              required
            />
            {otpSent && (
              <input
                type="text"
                inputMode="numeric"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                autoFocus
                className="w-full rounded-xl bg-background/60 border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary/60"
              />
            )}
            <button
              onClick={otpSent ? verifyPhoneCode : sendPhoneCode}
              disabled={busy === "phone"}
              className="w-full py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
            >
              {busy === "phone" ? "…" : otpSent ? "Verify & continue" : "Send code"}
            </button>
            {otpSent && (
              <button type="button" onClick={() => { setOtpSent(false); setCode(""); }} className="w-full text-[11px] text-muted-foreground">
                Change number
              </button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            This screen closes automatically once verified.
          </p>

          <button
            onClick={() => signOut()}
            className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
