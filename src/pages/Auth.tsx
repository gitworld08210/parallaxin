import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

type Mode = "signin" | "signup";

const Auth = () => {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav("/", { replace: true });
  }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { username, display_name: username },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account ✦");
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

  const google = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { toast.error("Google sign-in failed"); setBusy(false); }
  };

  const apple = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
    if (res.error) { toast.error("Apple sign-in failed"); setBusy(false); }
  };

  const inputCls =
    "w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60 transition-colors";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="relative mx-auto max-w-md px-6 py-10 flex flex-col min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mt-10 mb-8"
        >
          <span className="inline-flex h-16 w-16 rounded-2xl bg-gradient-primary items-center justify-center shadow-glow mb-4">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </span>
          <h1 className="font-display text-5xl tracking-wide font-black text-primary">AURELIX</h1>
          <p className="text-sm text-muted-foreground mt-1">Creator Universe</p>
        </motion.div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
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
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email or Phone"
            className={inputCls}
          />
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={inputCls}
          />

          {mode === "signin" && (
            <div className="flex justify-end">
              <Link to="/reset-password" className="text-xs text-muted-foreground hover:text-foreground">
                Forgot password?
              </Link>
            </div>
          )}

          <button
            disabled={busy}
            className="w-full py-3.5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60 active:scale-[0.98] transition-transform"
          >
            {busy ? "…" : mode === "signin" ? "Log in" : "Create account"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground">or continue with</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={google}
            disabled={busy}
            className="h-12 w-12 rounded-full bg-secondary/60 border border-border grid place-items-center hover:border-primary/60 transition-colors disabled:opacity-50"
            aria-label="Continue with Google"
          >
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-5.9-5c-2 1.4-4.4 2.2-7 2.2-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C8.9 38.6 16 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l5.9 5c2.9-2.7 4.6-7 4.6-12.7 0-1.2-.1-2.4-.4-3.5z"/></svg>
          </button>
          <button
            onClick={apple}
            disabled={busy}
            className="h-12 w-12 rounded-full bg-secondary/60 border border-border grid place-items-center hover:border-primary/60 transition-colors disabled:opacity-50"
            aria-label="Continue with Apple"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-foreground"><path d="M16.365 12.86c-.026-2.62 2.14-3.88 2.236-3.94-1.218-1.78-3.114-2.022-3.79-2.05-1.614-.164-3.152.95-3.972.95-.82 0-2.084-.926-3.428-.9-1.764.026-3.39 1.026-4.296 2.6-1.832 3.176-.468 7.878 1.314 10.46.87 1.262 1.906 2.68 3.264 2.628 1.31-.052 1.806-.85 3.39-.85 1.582 0 2.03.85 3.414.824 1.41-.026 2.302-1.286 3.166-2.554 1-1.464 1.412-2.886 1.436-2.96-.032-.014-2.756-1.058-2.784-4.208zM13.86 4.7c.722-.876 1.21-2.094 1.078-3.3-1.04.042-2.302.692-3.05 1.566-.67.776-1.256 2.02-1.1 3.208 1.16.09 2.348-.59 3.072-1.474z"/></svg>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          {mode === "signin" ? "New to Aurelix? " : "Already have an account? "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-primary font-semibold hover:underline"
          >
            {mode === "signin" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
