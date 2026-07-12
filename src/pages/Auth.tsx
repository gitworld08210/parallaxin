import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Sparkles, User, Building2, ArrowLeft, ArrowRight } from "lucide-react";

type Tab = "signin" | "signup";
type AccountKind = "personal" | "organization";
type Step = "landing" | "form";
const ORG_INTENT_KEY = "aurelix:signup_kind";
const PENDING_PHONE_KEY = "aurelix:pending_phone";

const Auth = () => {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  const nextPath = useMemo(() => {
    const raw = params.get("next");
    if (!raw) return null;
    if (!raw.startsWith("/") || raw.startsWith("//")) return null;
    return raw;
  }, [params]);
  const returnUrl = nextPath ? `${window.location.origin}${nextPath}` : `${window.location.origin}/`;

  const [step, setStep] = useState<Step>("landing");
  const [tab, setTab] = useState<Tab>("signin");
  const [kind, setKind] = useState<AccountKind>("personal");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const routeForUser = async (uid: string) => {
    if (nextPath) { nav(nextPath, { replace: true }); return; }

    // Role routing (Phase 3.1) — active employees enter Admin OS.
    // Founder Office members land inside the Executive Workspace.
    const { data: emp } = await supabase
      .from("employees")
      .select("id, employment_status, department:admin_departments!employees_department_id_fkey(key)")
      .eq("user_id", uid)
      .maybeSingle();
    if (emp && ["active", "on_leave", "joining_today"].includes((emp as any).employment_status)) {
      const deptKey = (emp as any).department?.key;
      if (deptKey === "founder_office") {
        // Best-effort audit + session ping — RLS-guarded, ignore failures.
        try {
          await supabase.from("admin_audit_logs").insert({
            actor_user_id: uid, module: "founder_office", action: "founder.login",
            target_type: "employee", target_id: (emp as any).id,
          });
          await supabase.from("employee_sessions").insert({
            employee_id: (emp as any).id,
            user_agent: navigator.userAgent,
          });
          await supabase.from("login_events").insert({
            user_id: uid, user_agent: navigator.userAgent,
          });
        } catch { /* ignore */ }
        nav("/admin-os/executive", { replace: true });
        return;
      }
      nav("/admin-os", { replace: true });
      return;
    }

    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (role) { nav("/admin", { replace: true }); return; }

    let prof: { onboarded_at: string | null; account_type: string | null; organization_id: string | null } | null = null;
    for (let i = 0; i < 4; i++) {
      const { data } = await supabase
        .from("profiles").select("onboarded_at, account_type, organization_id").eq("user_id", uid).maybeSingle();
      if (data) { prof = data as any; break; }
      await new Promise((r) => setTimeout(r, 250));
    }

    const intent = (localStorage.getItem(ORG_INTENT_KEY) as AccountKind | null) || null;
    const wantsOrg = intent === "organization" || prof?.account_type === "organization";

    if (wantsOrg && !prof?.organization_id) {
      if (prof && prof.account_type !== "organization") {
        await supabase.from("profiles").update({ account_type: "organization" as any }).eq("user_id", uid);
      }
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
      toast.success("Welcome back");
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
          emailRedirectTo: returnUrl,
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
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: returnUrl });
    if (r.error) { toast.error("Google sign-in failed"); setBusy(false); }
  };
  const apple = async () => {
    setBusy(true);
    if (tab === "signup" && kind === "organization") localStorage.setItem(ORG_INTENT_KEY, "organization");
    const r = await lovable.auth.signInWithOAuth("apple", { redirect_uri: returnUrl });
    if (r.error) { toast.error("Apple sign-in failed"); setBusy(false); }
  };

  const openForm = (t: Tab) => { setTab(t); setStep("form"); };

  const inputCls =
    "w-full bg-transparent border border-border rounded-md px-4 pt-6 pb-2 text-[15px] outline-none focus:border-primary transition-colors peer";
  const labelCls =
    "absolute left-4 top-4 text-sm text-muted-foreground pointer-events-none transition-all peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px]";

  const BrandMark = () => (
    <div className="inline-flex items-center gap-2">
      <span className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-primary shadow-glow">
        <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
      </span>
      <span className="font-display text-2xl tracking-widest font-black">AURELIX</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />

      {/* Split shell: hero left (desktop) / form right */}
      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
        {/* Hero */}
        <aside className="hidden lg:flex relative items-center justify-center px-16 overflow-hidden">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="h-[520px] w-[520px] rounded-full bg-gradient-primary opacity-25 blur-3xl" />
          </motion.div>
          <div className="relative">
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="grid place-items-center h-28 w-28 rounded-[2rem] bg-gradient-primary shadow-glow">
                <Sparkles className="h-14 w-14 text-primary-foreground" strokeWidth={2.2} />
              </span>
            </motion.div>
          </div>
        </aside>

        {/* Right column */}
        <section className="flex flex-col justify-between px-6 sm:px-10 lg:px-16 py-8 min-h-screen">
          {/* Top brand (mobile only) */}
          <div className="lg:hidden flex items-center justify-between">
            <BrandMark />
            {step === "form" && (
              <button
                type="button"
                onClick={() => setStep("landing")}
                className="p-2 -mr-2 rounded-full hover:bg-secondary/60 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex-1 flex items-center py-10 lg:py-0">
            <div className="w-full max-w-[420px] mx-auto lg:mx-0">
              <AnimatePresence mode="wait">
                {step === "landing" ? (
                  <motion.div
                    key="landing"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <h1 className="font-display font-black tracking-tight text-5xl sm:text-6xl leading-[0.95]">
                      Happening<br />now.
                    </h1>
                    <p className="mt-8 text-2xl font-bold">Join Aurelix today.</p>

                    <div className="mt-6 space-y-3">
                      <button
                        onClick={google}
                        disabled={busy}
                        className="w-full h-12 rounded-full bg-foreground text-background font-semibold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-[0.98]"
                      >
                        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-5.9-5c-2 1.4-4.4 2.2-7 2.2-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C8.9 38.6 16 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l5.9 5c2.9-2.7 4.6-7 4.6-12.7 0-1.2-.1-2.4-.4-3.5z"/></svg>
                        Continue with Google
                      </button>
                      <button
                        onClick={apple}
                        disabled={busy}
                        className="w-full h-12 rounded-full bg-foreground text-background font-semibold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-[0.98]"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M16.365 12.86c-.026-2.62 2.14-3.88 2.236-3.94-1.218-1.78-3.114-2.022-3.79-2.05-1.614-.164-3.152.95-3.972.95-.82 0-2.084-.926-3.428-.9-1.764.026-3.39 1.026-4.296 2.6-1.832 3.176-.468 7.878 1.314 10.46.87 1.262 1.906 2.68 3.264 2.628 1.31-.052 1.806-.85 3.39-.85 1.582 0 2.03.85 3.414.824 1.41-.026 2.302-1.286 3.166-2.554 1-1.464 1.412-2.886 1.436-2.96-.032-.014-2.756-1.058-2.784-4.208z"/></svg>
                        Continue with Apple
                      </button>

                      <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      <button
                        onClick={() => openForm("signup")}
                        disabled={busy}
                        className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all shadow-glow active:scale-[0.98]"
                      >
                        Create account
                      </button>
                    </div>

                    <p className="mt-5 text-[11px] text-muted-foreground leading-relaxed">
                      By signing up, you agree to the <span className="text-primary">Terms</span> and{" "}
                      <span className="text-primary">Privacy Policy</span>, including{" "}
                      <span className="text-primary">Cookie Use</span>.
                    </p>

                    <div className="mt-10">
                      <p className="text-base font-bold mb-3">Already have an account?</p>
                      <button
                        onClick={() => openForm("signin")}
                        className="w-full h-12 rounded-full border border-primary/40 text-primary font-semibold text-sm hover:bg-primary/10 transition-colors active:scale-[0.98]"
                      >
                        Sign in
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <h2 className="font-display font-black tracking-tight text-3xl sm:text-4xl leading-tight">
                      {tab === "signin" ? "Sign in to Aurelix" : "Create your account"}
                    </h2>

                    <form
                      onSubmit={(e) => { e.preventDefault(); tab === "signin" ? signIn() : signUp(); }}
                      className="mt-8 space-y-3"
                    >
                      {tab === "signup" && (
                        <div className="grid grid-cols-2 gap-2 pb-2">
                          {([
                            { id: "personal" as AccountKind, label: "Personal", icon: User, sub: "Individual" },
                            { id: "organization" as AccountKind, label: "Organization", icon: Building2, sub: "Business, NGO" },
                          ]).map((opt) => (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => setKind(opt.id)}
                              className={`text-left p-3 rounded-2xl border transition-all ${
                                kind === opt.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/40"
                              }`}
                            >
                              <opt.icon className={`h-4 w-4 mb-1 ${kind === opt.id ? "text-primary" : "text-muted-foreground"}`} />
                              <p className="text-sm font-semibold leading-tight">{opt.label}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{opt.sub}</p>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="relative">
                        <input
                          id="email"
                          className={inputCls}
                          type="email"
                          placeholder=" "
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="email"
                          required
                        />
                        <label htmlFor="email" className={labelCls}>Email</label>
                      </div>

                      {tab === "signup" && (
                        <div className="relative">
                          <input
                            id="phone"
                            className={inputCls}
                            type="tel"
                            placeholder=" "
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoComplete="tel"
                            required
                          />
                          <label htmlFor="phone" className={labelCls}>Phone (E.164, e.g. +14155551234)</label>
                        </div>
                      )}

                      <div className="relative">
                        <input
                          id="password"
                          className={inputCls}
                          type="password"
                          placeholder=" "
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete={tab === "signin" ? "current-password" : "new-password"}
                          required
                        />
                        <label htmlFor="password" className={labelCls}>Password</label>
                      </div>

                      {tab === "signin" && (
                        <div className="flex justify-end pt-1">
                          <Link to="/reset-password" className="text-xs text-muted-foreground hover:text-foreground">
                            Forgot password?
                          </Link>
                        </div>
                      )}

                      {tab === "signup" && (
                        <p className="text-[11px] text-muted-foreground px-1 pt-1">
                          You'll verify your email or phone after signing up — either one unlocks your account.
                        </p>
                      )}

                      <div className="pt-4">
                        <button
                          disabled={busy}
                          className="w-full h-12 rounded-full bg-foreground text-background font-semibold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 active:scale-[0.98]"
                        >
                          {busy ? "Please wait…" : tab === "signin" ? "Log in" : "Create account"}
                          {!busy && <ArrowRight className="h-4 w-4" />}
                        </button>
                      </div>

                      <p className="text-center text-sm text-muted-foreground pt-3">
                        {tab === "signin" ? "Don't have an account? " : "Already have one? "}
                        <button
                          type="button"
                          onClick={() => setTab(tab === "signin" ? "signup" : "signin")}
                          className="text-primary font-semibold hover:underline"
                        >
                          {tab === "signin" ? "Sign up" : "Sign in"}
                        </button>
                      </p>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <footer className="pt-6 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 justify-center lg:justify-start">
            <span>© Aurelix</span>
            <span>Terms</span>
            <span>Privacy</span>
            <span>Cookies</span>
          </footer>
        </section>
      </div>
    </div>
  );
};

export default Auth;
