import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db, googleProvider } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Sparkles, ArrowLeft } from "lucide-react";

type Tab = "signin" | "signup";
type AccountKind = "personal" | "organization";
type Step = "landing" | "form";
const ORG_INTENT_KEY = "aurelix:signup_kind";

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

  const [step, setStep] = useState<Step>("landing");
  const [tab, setTab] = useState<Tab>("signin");
  const [kind, setKind] = useState<AccountKind>("personal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const routeForUser = async (uid: string) => {
    if (nextPath) { nav(nextPath, { replace: true }); return; }
    
    // Check Firestore for profile status
    const profSnap = await getDoc(doc(db, "profiles", uid));
    const prof = profSnap.exists() ? profSnap.data() : null;

    const intent = (localStorage.getItem(ORG_INTENT_KEY) as AccountKind | null) || null;
    const wantsOrg = intent === "organization" || prof?.account_type === "organization";

    if (wantsOrg && !prof?.organization_id) {
      if (prof && prof.account_type !== "organization") {
        await setDoc(doc(db, "profiles", uid), { account_type: "organization" }, { merge: true });
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

  const signIn = async () => {
    if (!validEmail() || password.length < 6) { toast.error("Enter a valid email and password"); return; }
    setBusy(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Welcome back");
      if (userCredential.user) await routeForUser(userCredential.user.uid);
    } catch (e: any) {
      console.error("Login error:", e);
      toast.error(e?.message || "Incorrect email or password");
    } finally { setBusy(false); }
  };

  const signUp = async () => {
    if (!validEmail() || password.length < 6) { toast.error("Enter a valid email and a password (6+ chars)"); return; }
    setBusy(true);
    try {
      if (kind === "organization") localStorage.setItem(ORG_INTENT_KEY, "organization");
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Create initial profile in Firestore
      await setDoc(doc(db, "profiles", userCredential.user.uid), {
        user_id: userCredential.user.uid,
        email: email.trim(),
        account_type: kind,
        onboarded_at: null,
        created_at: new Date().toISOString()
      });

      toast.success("Account created successfully");
      await routeForUser(userCredential.user.uid);
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true);
    try {
      if (tab === "signup" && kind === "organization") localStorage.setItem(ORG_INTENT_KEY, "organization");
      const userCredential = await signInWithPopup(auth, googleProvider);
      
      // Check if profile exists, if not create it
      const profSnap = await getDoc(doc(db, "profiles", userCredential.user.uid));
      if (!profSnap.exists()) {
        await setDoc(doc(db, "profiles", userCredential.user.uid), {
          user_id: userCredential.user.uid,
          email: userCredential.user.email,
          account_type: kind,
          onboarded_at: null,
          created_at: new Date().toISOString()
      }
      });
      
      toast.success("Signed in with Google");
      await routeForUser(userCredential.user.uid);
    } catch (e: any) {
      console.error("Google error:", e);
      toast.error(e?.message || "Google sign-in failed");
    } finally { setBusy(false); }
  };

  const openForm = (t: Tab) => { setTab(t); setStep("form"); };

  const inputCls = "w-full bg-transparent border border-border rounded-md px-4 pt-6 pb-2 text-[15px] outline-none focus:border-primary transition-colors peer";
  const labelCls = "absolute left-4 top-4 text-sm text-muted-foreground pointer-events-none transition-all peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px]";

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
      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
        <aside className="hidden lg:flex relative items-center justify-center px-16 overflow-hidden">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.1 }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-[520px] w-[520px] rounded-full bg-gradient-primary opacity-25 blur-3xl" />
          </motion.div>
          <div className="relative">
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}>
              <span className="grid place-items-center h-28 w-28 rounded-[2rem] bg-gradient-primary shadow-glow">
                <Sparkles className="h-14 w-14 text-primary-foreground" strokeWidth={2.2} />
              </span>
            </motion.div>
          </div>
        </aside>
        <section className="flex flex-col justify-between px-6 sm:px-10 lg:px-16 py-8 min-h-screen">
          <div className="lg:hidden flex items-center justify-between">
            <BrandMark />
            {step === "form" && (
              <button onClick={() => setStep("landing")} className="p-2 -mr-2 rounded-full hover:bg-secondary/60">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="flex-1 flex items-center py-10 lg:py-0">
            <div className="w-full max-w-[420px] mx-auto lg:mx-0">
              <AnimatePresence mode="wait">
                {step === "landing" ? (
                  <motion.div key="landing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                    <h1 className="font-display font-black tracking-tight text-5xl sm:text-6xl leading-[0.95]">Happening<br />now.</h1>
                    <p className="mt-8 text-2xl font-bold">Join Aurelix today.</p>
                    <div className="mt-6 space-y-3">
                      <button onClick={google} disabled={busy} className="w-full h-12 rounded-full bg-foreground text-background font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
                        Continue with Google
                      </button>
                      <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <button onClick={() => openForm("signup")} disabled={busy} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-glow">
                        Create account
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h2 className="text-3xl font-bold tracking-tight">{tab === "signin" ? "Sign in to Aurelix" : "Create your account"}</h2>
                    {tab === "signup" && (
                      <div className="flex gap-2 mt-4 p-1 rounded-xl bg-secondary/40">
                        {(["personal", "organization"] as const).map((k) => (
                          <button key={k} onClick={() => setKind(k)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${kind === k ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}>
                            {k.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-6 space-y-4">
                      <div className="relative">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder=" " />
                        <label className={labelCls}>Email address</label>
                      </div>
                      <div className="relative">
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder=" " />
                        <label className={labelCls}>Password</label>
                      </div>
                      <button onClick={tab === "signin" ? signIn : signUp} disabled={busy} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold shadow-glow mt-2">
                        {busy ? "Processing..." : tab === "signin" ? "Sign in" : "Sign up"}
                      </button>
                    </div>
                    <p className="mt-8 text-sm text-muted-foreground">
                      {tab === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                      <button onClick={() => setTab(tab === "signin" ? "signup" : "signin")} className="text-primary font-bold hover:underline">
                        {tab === "signin" ? "Sign up" : "Log in"}
                      </button>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Auth;