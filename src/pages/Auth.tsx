import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Sparkles, ArrowLeft } from "lucide-react";

type Mode = "signin" | "signup";
type Channel = "email" | "phone";
type Step = "details" | "otp";

const Auth = () => {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [channel, setChannel] = useState<Channel>("email");
  const [step, setStep] = useState<Step>("details");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!loading && user) nav("/", { replace: true });
  }, [user, loading, nav]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const reset = () => {
    setStep("details");
    setOtp("");
  };

  useEffect(() => {
    reset();
  }, [mode, channel]);

  const sendOtp = async () => {
    if (channel === "email") {
      // Signup with password; Supabase sends a confirm email containing a 6-digit OTP.
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { username, display_name: username },
        },
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { data: { username, display_name: username } },
      });
      if (error) throw error;
    }
    setStep("otp");
    setResendIn(45);
    toast.success(`Code sent to your ${channel === "email" ? "email" : "phone"}`);
  };

  const verifyOtp = async () => {
    if (channel === "email") {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "signup",
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });
      if (error) throw error;
    }
    toast.success("Verified ✦ welcome to Aurelix");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (step === "details") await sendOtp();
        else await verifyOtp();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back ✦");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setBusy(true);
    try {
      if (channel === "email") {
        const { error } = await supabase.auth.resend({ type: "signup", email });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
      }
      setResendIn(45);
      toast.success("Code resent");
    } catch (err: any) {
      toast.error(err.message || "Could not resend");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      toast.error("Google sign-in failed");
      setBusy(false);
    }
  };

  const inputCls =
    "w-full glass rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground";

  return (
    <div className="min-h-screen mx-auto max-w-md px-5 py-10 flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mt-8 mb-10"
      >
        <span className="inline-flex h-12 w-12 rounded-full bg-gradient-primary grid place-items-center shadow-glow mb-4">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </span>
        <h1 className="font-display text-4xl">Aurelix</h1>
        <p className="text-sm text-muted-foreground mt-1">A cinematic creator universe</p>
      </motion.div>

      <div className="glass-strong rounded-3xl p-6 shadow-elevated">
        <div className="flex glass rounded-full p-1 mb-6">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all ${
                mode === m ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
              }`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {mode === "signup" && step === "details" && (
          <div className="flex glass rounded-full p-1 mb-4">
            {(["email", "phone"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-full transition-all ${
                  channel === c ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                {c === "email" ? "Email" : "Phone"}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && step === "otp" && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground -mt-1 mb-1"
            >
              <ArrowLeft className="h-3 w-3" /> Edit details
            </button>
          )}

          {mode === "signup" && step === "details" && (
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="username"
              minLength={3}
              maxLength={24}
              className={inputCls}
            />
          )}

          {(mode === "signin" || (mode === "signup" && step === "details" && channel === "email")) && (
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className={inputCls}
            />
          )}

          {mode === "signup" && step === "details" && channel === "phone" && (
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className={inputCls}
            />
          )}

          {(mode === "signin" || (mode === "signup" && step === "details" && channel === "email")) && (
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={inputCls}
            />
          )}

          {mode === "signup" && step === "otp" && (
            <>
              <p className="text-xs text-muted-foreground text-center pb-1">
                Enter the 6-digit code sent to{" "}
                <span className="text-foreground">{channel === "email" ? email : phone}</span>
              </p>
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className={`${inputCls} text-center tracking-[0.6em] text-lg font-semibold`}
              />
              <button
                type="button"
                onClick={resend}
                disabled={busy || resendIn > 0}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </>
          )}

          <button
            disabled={busy}
            className="w-full py-3 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60"
          >
            {busy
              ? "…"
              : mode === "signin"
              ? "Sign in"
              : step === "details"
              ? "Send code"
              : "Verify & continue"}
          </button>
        </form>

        {!(mode === "signup" && step === "otp") && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={google}
              disabled={busy}
              className="w-full py-3 rounded-2xl glass-strong font-semibold text-sm flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-5.9-5c-2 1.4-4.4 2.2-7 2.2-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C8.9 38.6 16 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l5.9 5c2.9-2.7 4.6-7 4.6-12.7 0-1.2-.1-2.4-.4-3.5z"/></svg>
              Continue with Google
            </button>
          </>
        )}

        {mode === "signin" && (
          <Link to="/reset-password" className="block text-center mt-4 text-xs text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
        )}
      </div>
    </div>
  );
};

export default Auth;
