import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Sparkles, User, Building2 } from "lucide-react";

type Tab = "signin" | "signup";
type AccountKind = "personal" | "organization";
const ORG_INTENT_KEY = "aurelix:signup_kind";
const PENDING_PHONE_KEY = "aurelix:pending_phone";

const Auth = () => {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  // Preserve a same-origin relative `next` path across every auth path so
  // OAuth consent (and any other deep link) returns the user where they came from.
  const nextPath = useMemo(() => {
    const raw = params.get("next");
    if (!raw) return null;
    if (!raw.startsWith("/") || raw.startsWith("//")) return null;
    return raw;
  }, [params]);
  const returnUrl = nextPath ? `${window.location.origin}${nextPath}` : `${window.location.origin}/`;

  const [tab, setTab] = useState<Tab>("signin");
  const [kind, setKind] = useState<AccountKind>("personal");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const routeForUser = async (uid: string) => {
    if (nextPath) { nav(nextPath, { replace: true }); return; }
    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (role) { nav("/admin", { replace: true }); return; }
    const { data: prof } = await supabase
      .from("profiles").select("onboarded_at, account_type, organization_id").eq("user_id", uid).maybeSingle();
    const intent = (localStorage.getItem(ORG_INTENT_KEY) as AccountKind | null) || null;
    if (prof && !prof.organization_id && (prof.account_type === "organization" || intent === "organization")) {
      localStorage.removeItem(ORG_INTENT_KEY);
      nav("/onboarding/organization", { replace: true });
      return;
    }
    localStorage.removeItem(ORG_INTENT_KEY);
    nav(prof?.onboarded_at ? "/" : "/onboarding", { replace: true });
  };

  useEffect(() => { if (!loading && user) routeForUser(user.id); /* eslint-disable-next-line */ }, [user, loading]);

  const validEmail = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const validPhone = () => /^\+[1-9]\d{6,14}$/.test(phone.trim());

  const signIn = async () => {
    if (!validEmail() || password.length < 6) { toast.error("Enter a valid email and password"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast.success("Welcome back ✦");
      if (data.user) await routeForUser(data.user.id);
    } catch (e: any) {
      toast.error(e?.message || "Sign-in failed");
    } finally { setBusy(false); }
  };

  const signUp = async () => {
    if (!validEmail() || password.length < 6) { toast.error("Enter a valid email and a password (6+ chars)"); return; }
    if (!validPhone()) { toast.error("Enter phone in E.164 format, e.g. +14155551234"); return; }
    setBusy(true);
    try {
      if (kind === "organization") localStorage.setItem(ORG_INTENT_KEY, "organization");
      localStorage.setItem(PENDING_PHONE_KEY, phone.trim());
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { pending_phone: phone.trim(), account_type: kind },
        },
      });
      if (error) throw error;
      if (data.session && data.user) {
        toast.success("Account created — verify your email or phone to continue.");
        await routeForUser(data.user.id);
      } else {
        toast.success("Check your email to confirm — or sign in and verify your phone.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Sign-up failed");
    } finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true);
    if (tab === "signup" && kind === "organization") localStorage.setItem(ORG_INTENT_KEY, "organization");
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Google sign-in failed"); setBusy(false); }
  };
  const apple = async () => {
    setBusy(true);
    if (tab === "signup" && kind === "organization") localStorage.setItem(ORG_INTENT_KEY, "organization");
    const r = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Apple sign-in failed"); setBusy(false); }
  };

  const inputCls =
    "w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60 transition-colors";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="relative mx-auto max-w-md px-6 py-10 flex flex-col min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mt-6 mb-7"
        >
          <span className="inline-flex h-16 w-16 rounded-2xl bg-gradient-primary items-center justify-center shadow-glow mb-4">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </span>
          <h1 className="font-display text-5xl tracking-wide font-black text-primary">AURELIX</h1>
          <p className="text-sm text-muted-foreground mt-1">Creator Universe</p>
        </motion.div>

        {/* Tabs */}
        <div className="grid grid-cols-2 p-1 bg-secondary/40 border border-border rounded-2xl mb-5">
          {(["signin","signup"] as Tab[]).map((t) => (
            <button key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${tab===t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {t === "signin" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={tab}
            onSubmit={(e) => { e.preventDefault(); tab === "signin" ? signIn() : signUp(); }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {tab === "signup" && (
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "personal" as AccountKind, label: "Personal", icon: User, sub: "I'm an individual" },
                  { id: "organization" as AccountKind, label: "Organization", icon: Building2, sub: "Company, NGO, school…" },
                ]).map((opt) => (
                  <button type="button" key={opt.id} onClick={() => setKind(opt.id)}
                    className={`text-left p-3 rounded-2xl border transition-all ${kind === opt.id ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}>
                    <opt.icon className={`h-4 w-4 mb-1 ${kind === opt.id ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-sm font-semibold leading-tight">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            )}
            <input className={inputCls} type="email" placeholder="you@aurelix.app" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" required />
            {tab === "signup" && (
              <>
                <input className={inputCls} type="tel" placeholder="+14155551234" value={phone}
                  onChange={(e)=>setPhone(e.target.value)} autoComplete="tel" required />
                <p className="text-[11px] text-muted-foreground px-1 -mt-1">
                  You'll verify your email or phone after signing up — either one unlocks your account.
                </p>
              </>
            )}
            <input className={inputCls} type="password" placeholder="Password" minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete={tab === "signin" ? "current-password" : "new-password"} required />

            {tab === "signin" && (
              <div className="flex justify-end">
                <Link to="/reset-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</Link>
              </div>
            )}

            <button disabled={busy} className="w-full py-3.5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60 active:scale-[0.98] transition-transform">
              {busy ? "…" : tab === "signin" ? "Log in" : "Create account"}
            </button>
          </motion.form>
        </AnimatePresence>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground">or continue with</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex items-center justify-center gap-4">
          <button onClick={google} disabled={busy} aria-label="Continue with Google"
            className="h-12 w-12 rounded-full bg-secondary/60 border border-border grid place-items-center hover:border-primary/60 transition-colors disabled:opacity-50">
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-5.9-5c-2 1.4-4.4 2.2-7 2.2-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C8.9 38.6 16 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l5.9 5c2.9-2.7 4.6-7 4.6-12.7 0-1.2-.1-2.4-.4-3.5z"/></svg>
          </button>
          <button onClick={apple} disabled={busy} aria-label="Continue with Apple"
            className="h-12 w-12 rounded-full bg-secondary/60 border border-border grid place-items-center hover:border-primary/60 transition-colors disabled:opacity-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-foreground"><path d="M16.365 12.86c-.026-2.62 2.14-3.88 2.236-3.94-1.218-1.78-3.114-2.022-3.79-2.05-1.614-.164-3.152.95-3.972.95-.82 0-2.084-.926-3.428-.9-1.764.026-3.39 1.026-4.296 2.6-1.832 3.176-.468 7.878 1.314 10.46.87 1.262 1.906 2.68 3.264 2.628 1.31-.052 1.806-.85 3.39-.85 1.582 0 2.03.85 3.414.824 1.41-.026 2.302-1.286 3.166-2.554 1-1.464 1.412-2.886 1.436-2.96-.032-.014-2.756-1.058-2.784-4.208z"/></svg>
          </button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-8 leading-relaxed">
          By continuing you agree to our Terms & Privacy.
        </p>
      </div>
    </div>
  );
};

export default Auth;
