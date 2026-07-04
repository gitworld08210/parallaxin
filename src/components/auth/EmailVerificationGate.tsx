import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Mail, LogOut, RefreshCw } from "lucide-react";

const isSyntheticPhoneEmail = (e?: string | null) =>
  !!e && e.endsWith("@phone.aurelix.local");

// Show gate when:
// - The user signed up via phone and hasn't attached a real email yet, OR
// - Their real email address has never been confirmed, OR
// - They've requested an email change (Supabase stores it as new_email).
export function useNeedsEmailVerification() {
  const { user } = useAuth();
  if (!user) return false;
  const meta: any = user.user_metadata || {};
  const hasPendingEmail = !!meta.pending_email || !!(user as any).new_email;
  if (isSyntheticPhoneEmail(user.email)) return true;
  if (!user.email_confirmed_at) return true;
  if (hasPendingEmail) return true;
  return false;
}

export const EmailVerificationGate = () => {
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);

  const meta: any = user?.user_metadata || {};
  const pendingEmail: string =
    meta.pending_email || (user as any)?.new_email || (isSyntheticPhoneEmail(user?.email) ? "" : user?.email ?? "");
  const needsEmailAdded = isSyntheticPhoneEmail(user?.email) && !meta.pending_email;

  useEffect(() => {
    // Poll auth state to catch confirmation completion
    setPolling(true);
    const iv = setInterval(async () => {
      const { data } = await supabase.auth.refreshSession();
      if (data.session?.user?.email_confirmed_at && !isSyntheticPhoneEmail(data.session.user.email)) {
        clearInterval(iv);
      }
    }, 8000);
    return () => { clearInterval(iv); setPolling(false); };
  }, []);

  const attachEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Enter a valid email");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser(
      { email: email.trim(), data: { ...meta, pending_email: email.trim() } },
      { emailRedirectTo: `${window.location.origin}/` },
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Verification link sent — check your inbox");
  };

  const resend = async () => {
    if (!pendingEmail) return;
    setBusy(true);
    // Try email_change first (updateUser flow), fall back to signup confirmation.
    const type = (user as any)?.new_email ? "email_change" : "signup";
    const { error } = await supabase.auth.resend({ type: type as any, email: pendingEmail } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Verification link re-sent");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl mb-1">Verify your email</h1>
          <p className="text-sm text-muted-foreground">
            {needsEmailAdded
              ? "Add an email address to secure your account. We'll send a confirmation link."
              : pendingEmail
                ? <>We sent a link to <span className="text-foreground font-medium">{pendingEmail}</span>. Open it to continue.</>
                : "Please confirm your email address to continue."}
          </p>
        </div>

        {needsEmailAdded ? (
          <form onSubmit={(e) => { e.preventDefault(); attachEmail(); }} className="space-y-3">
            <input
              type="email"
              placeholder="you@aurelix.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl bg-secondary/60 border border-border px-4 py-3.5 text-sm outline-none"
              required
            />
            <button
              disabled={busy}
              className="w-full py-3.5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send verification link"}
            </button>
          </form>
        ) : (
          <button
            onClick={resend}
            disabled={busy}
            className="w-full py-3.5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> {busy ? "Sending…" : "Resend verification"}
          </button>
        )}

        <p className="text-[11px] text-muted-foreground">
          {polling ? "This screen closes automatically once verified." : ""}
        </p>

        <button
          onClick={() => signOut()}
          className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </div>
  );
};
