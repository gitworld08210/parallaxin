import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, Mail, Phone, KeyRound } from "lucide-react";

type Tab = "signin" | "signup";
type Identifier = "email" | "phone";
type Stage = "identify" | "otp" | "password";

const OTP_LEN = 6;
const RESEND_SECONDS = 30;

const Auth = () => {
  const nav = useNavigate();
  const { user, loading } = useAuth();

  const [tab, setTab] = useState<Tab>("signin");
  const [idKind, setIdKind] = useState<Identifier>("email");
  const [stage, setStage] = useState<Stage>("identify");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // E.164 e.g. +14155551234
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const routeForUser = async (uid: string) => {
    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (role) { nav("/admin", { replace: true }); return; }
    const { data: prof } = await supabase
      .from("profiles").select("onboarded_at").eq("user_id", uid).maybeSingle();
    nav(prof?.onboarded_at ? "/" : "/onboarding", { replace: true });
  };

  useEffect(() => { if (!loading && user) routeForUser(user.id); /* eslint-disable-next-line */ }, [user, loading]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const identifier = idKind === "email" ? email.trim().toLowerCase() : phone.trim();

  const validIdentifier = () => {
    if (idKind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return /^\+[1-9]\d{6,14}$/.test(phone.trim());
  };

  const sendOtp = async (forSignup: boolean) => {
    if (!validIdentifier()) {
      toast.error(idKind === "email" ? "Enter a valid email" : "Enter phone in E.164 format (+countrycode…)");
      return;
    }
    setBusy(true);
    try {
      const params: any = idKind === "email"
        ? { email, options: { shouldCreateUser: forSignup, emailRedirectTo: `${window.location.origin}/` } }
        : { phone, options: { shouldCreateUser: forSignup, channel: "sms" } };
      const { error } = await supabase.auth.signInWithOtp(params);
      if (error) throw error;
      toast.success(`Code sent to your ${idKind}`);
      setStage("otp");
      setResendIn(RESEND_SECONDS);
    } catch (e: any) {
      const msg = e?.message || "Could not send code";
      if (/sms|phone|provider/i.test(msg) && idKind === "phone") {
        toast.error("Phone sign-in isn't configured yet. Use email or password.");
      } else {
        toast.error(msg);
      }
    } finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    if (code.length !== OTP_LEN) return;
    setBusy(true);
    try {
      const params: any = idKind === "email"
        ? { email, token: code, type: "email" }
        : { phone, token: code, type: "sms" };
      const { data, error } = await supabase.auth.verifyOtp(params);
      if (error) throw error;
      toast.success("Verified ✦");
      if (data.user) await routeForUser(data.user.id);
    } catch (e: any) {
      toast.error(e?.message || "Invalid or expired code");
    } finally { setBusy(false); }
  };

  const passwordSignIn = async () => {
    if (idKind !== "email") { toast.error("Password login uses email"); return; }
    if (!validIdentifier() || password.length < 6) { toast.error("Enter email and password"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back ✦");
      if (data.user) await routeForUser(data.user.id);
    } catch (e: any) {
      toast.error(e?.message || "Sign-in failed");
    } finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Google sign-in failed"); setBusy(false); }
  };
  const apple = async () => {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Apple sign-in failed"); setBusy(false); }
  };

  const inputCls =
    "w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60 transition-colors";

  const reset = () => { setStage("identify"); setCode(""); setPassword(""); };

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
              onClick={() => { setTab(t); reset(); if (t === "signup") setStage("identify"); else setStage("password"); }}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${tab===t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {t === "signin" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ===== IDENTIFY (Sign up + Sign in via OTP) ===== */}
          {stage === "identify" && (
            <motion.div key="identify" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-3">
              {/* identifier kind switcher */}
              <div className="flex gap-2 mb-1">
                <button onClick={() => setIdKind("email")}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${idKind==="email" ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border"}`}>
                  <Mail className="h-3.5 w-3.5" /> Email
                </button>
                <button onClick={() => setIdKind("phone")}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${idKind==="phone" ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border"}`}>
                  <Phone className="h-3.5 w-3.5" /> Phone
                </button>
              </div>

              {idKind === "email" ? (
                <input className={inputCls} type="email" placeholder="you@aurelix.app" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" />
              ) : (
                <input className={inputCls} type="tel" placeholder="+1 415 555 1234" value={phone} onChange={(e)=>setPhone(e.target.value)} autoComplete="tel" inputMode="tel" />
              )}

              <button disabled={busy} onClick={() => sendOtp(tab === "signup")}
                className="w-full py-3.5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60 active:scale-[0.98] transition-transform">
                {busy ? "Sending…" : "Send verification code"}
              </button>

              {tab === "signin" && idKind === "email" && (
                <button onClick={() => setStage("password")} className="w-full text-xs text-muted-foreground hover:text-foreground py-2 inline-flex items-center justify-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" /> Use password instead
                </button>
              )}

              <p className="text-[11px] text-muted-foreground text-center pt-1">
                {tab === "signup"
                  ? "We'll send a 6-digit code to verify it's you."
                  : "We'll send a 6-digit code to sign you in."}
              </p>
            </motion.div>
          )}

          {/* ===== OTP ===== */}
          {stage === "otp" && (
            <motion.div key="otp" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
              <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Change {idKind}
              </button>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to</p>
                <p className="text-sm font-semibold mt-0.5 break-all">{identifier}</p>
              </div>
              <input
                inputMode="numeric" pattern="\d*" maxLength={OTP_LEN} autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LEN))}
                placeholder="••••••"
                className={`${inputCls} text-center text-2xl tracking-[0.6em] font-mono`}
              />
              <button disabled={busy || code.length !== OTP_LEN} onClick={verifyOtp}
                className="w-full py-3.5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60 active:scale-[0.98] transition-transform">
                {busy ? "Verifying…" : "Verify & continue"}
              </button>
              <button
                disabled={resendIn > 0 || busy}
                onClick={() => sendOtp(tab === "signup")}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 disabled:opacity-50">
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
              <p className="text-[11px] text-muted-foreground text-center">Code expires in 5 minutes. Max 5 attempts.</p>
            </motion.div>
          )}

          {/* ===== PASSWORD (Log in fallback) ===== */}
          {stage === "password" && (
            <motion.form key="password" onSubmit={(e)=>{e.preventDefault();passwordSignIn();}}
              initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-3">
              <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" required />
              <input className={inputCls} type="password" placeholder="Password" minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" required />
              <div className="flex justify-end">
                <Link to="/reset-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</Link>
              </div>
              <button disabled={busy} className="w-full py-3.5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60 active:scale-[0.98] transition-transform">
                {busy ? "…" : "Log in"}
              </button>
              <button type="button" onClick={() => setStage("identify")} className="w-full text-xs text-muted-foreground hover:text-foreground py-2 inline-flex items-center justify-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Use a one-time code instead
              </button>
            </motion.form>
          )}
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
          By continuing you agree to our Terms & Privacy. <br/>OTP codes expire in 5 minutes.
        </p>
      </div>
    </div>
  );
};

export default Auth;
