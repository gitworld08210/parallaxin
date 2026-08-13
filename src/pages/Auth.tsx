import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db, googleProvider } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, Mail, Lock, User, Briefcase, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tab = "signin" | "signup";
type AccountKind = "personal" | "organization";
const ORG_INTENT_KEY = "aurelix:signup_kind";

const Auth = () => {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  const nextPath = useMemo(() => {
    const raw = params.get("next");
    if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
    return raw;
  }, [params]);

  const [tab, setTab] = useState<Tab>("signin");
  const [kind, setKind] = useState<AccountKind>("personal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const routeForUser = async (uid: string) => {
    if (nextPath) { nav(nextPath, { replace: true }); return; }
    
    let prof: any = null;
    try {
      const profSnap = await getDoc(doc(db, "profiles", uid));
      prof = profSnap.exists() ? profSnap.data() : null;
    } catch (e) {
      console.error("Error fetching profile during routing:", e);
    }

    const intent = (localStorage.getItem(ORG_INTENT_KEY) as AccountKind | null) || null;
    const wantsOrg = intent === "organization" || prof?.account_type === "organization";

    if (wantsOrg && !prof?.organization_id) {
      if (prof && prof.account_type !== "organization") {
        try {
          await setDoc(doc(db, "profiles", uid), { account_type: "organization" }, { merge: true });
        } catch (e) {
          console.error("Error updating profile to organization:", e);
        }
      }
      localStorage.removeItem(ORG_INTENT_KEY);
      nav("/", { replace: true });
      return;
    }
    localStorage.removeItem(ORG_INTENT_KEY);
    nav("/", { replace: true });
  };

  useEffect(() => { 
    if (!loading && user) routeForUser(user.id); 
  }, [user, loading]);

  const validEmail = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleAuth = async () => {
    if (!validEmail() || password.length < 6) { 
      toast.error("Please enter a valid email and 6+ character password"); 
      return; 
    }
    setBusy(true);
    try {
      if (tab === "signin") {
        const res = await signInWithEmailAndPassword(auth, email.trim(), password);
        toast.success("Logged in");
        if (res.user) await routeForUser(res.user.uid);
      } else {
        if (kind === "organization") localStorage.setItem(ORG_INTENT_KEY, "organization");
        const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
        
        const initialProfile = {
          id: res.user.uid,
          user_id: res.user.uid,
          email: email.trim(),
          account_type: kind,
          onboarded_at: null,
          created_at: serverTimestamp()
        };

        // Try Firestore write first
        try {
          await setDoc(doc(db, "profiles", res.user.uid), initialProfile);
        } catch (e: any) {
          console.error("Firestore initial profile write failed:", e);
          // If Firestore fails due to permissions, the toast will show it below
          throw e; 
        }

        try {
          await supabase.from("profiles").insert({
            id: res.user.uid,
            user_id: res.user.uid,
            username: email.trim().split('@')[0],
            display_name: email.trim().split('@')[0],
            account_type: kind
          } as any);
        } catch (e) {
          console.warn("Supabase sync failed", e);
        }

        toast.success("Account created");
        await routeForUser(res.user.uid);
      }
    } catch (e: any) {
      toast.error(e?.message || "Authentication failed");
    } finally { setBusy(false); }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      if (tab === "signup" && kind === "organization") localStorage.setItem(ORG_INTENT_KEY, "organization");
      const res = await signInWithPopup(auth, googleProvider);
      
      const profSnap = await getDoc(doc(db, "profiles", res.user.uid));
      if (!profSnap.exists()) {
        const uid = res.user.uid;
        const email = res.user.email;
        const name = res.user.displayName || email?.split('@')[0] || "User";
        
        await setDoc(doc(db, "profiles", uid), {
          id: uid,
          user_id: uid,
          email,
          account_type: kind,
          avatar_url: res.user.photoURL,
          onboarded_at: null,
          created_at: serverTimestamp()
        });

        try {
          await supabase.from("profiles").insert({
            id: uid,
            user_id: uid,
            username: email?.split('@')[0] || uid.slice(0, 8),
            display_name: name,
            account_type: kind,
            avatar_url: res.user.photoURL
          } as any);
        } catch (e) {
          console.warn("Supabase sync failed", e);
        }
      }
      toast.success("Signed in with Google");
      await routeForUser(res.user.uid);
    } catch (e: any) {
      toast.error(e?.message || "Google sign-in failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center sm:p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-[400px] min-h-screen sm:min-h-0 sm:aspect-[9/19.5] relative z-10 bg-black sm:border sm:border-white/10 sm:rounded-[3rem] sm:shadow-2xl flex flex-col items-center pt-24 px-10 pb-10">
        <div className="text-center mb-12 w-full">
          <div className="flex justify-center mb-12">
            <span className="text-6xl font-serif italic tracking-tighter">Parallax</span>
          </div>
          <h1 className="sr-only">
            {tab === "signin" ? "Log in" : "Sign up"}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={tab}
            initial={{ opacity: 0, x: tab === 'signin' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === 'signin' ? 10 : -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 w-full flex-1"
          >
          {tab === "signup" && (
            <div className="grid grid-cols-2 gap-3 p-1 bg-[#111] border border-white/5 rounded-2xl">
              <button 
                onClick={() => setKind("personal")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${kind === "personal" ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-white"}`}
              >
                <User className="h-4 w-4" /> Personal
              </button>
              <button 
                onClick={() => setKind("organization")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${kind === "organization" ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-white"}`}
              >
                <Briefcase className="h-4 w-4" /> Business
              </button>
            </div>
          )}

          <div className="space-y-2">
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Phone number, username, or email"
                className="w-full bg-[#121212] border border-white/10 rounded-md pl-4 pr-4 py-3 text-[14px] outline-none focus:border-white/20 transition-all placeholder:text-zinc-500"
              />
            </div>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-[#121212] border border-white/10 rounded-md pl-4 pr-4 py-3 text-[14px] outline-none focus:border-white/20 transition-all placeholder:text-zinc-500"
              />
            </div>
          </div>

          <button 
            onClick={handleAuth}
            disabled={busy}
            className="w-full bg-[#0095F6] hover:bg-[#1877F2] text-white font-semibold py-2 rounded-lg transition-all active:opacity-70 disabled:opacity-50 text-sm mt-2"
          >
            {busy ? "Please wait..." : tab === "signin" ? "Log in" : "Sign up"}
          </button>

          <div className="flex items-center gap-4 py-4">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span className="text-[13px] font-semibold text-zinc-500 uppercase">or</span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>

          <button 
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold text-sm hover:opacity-80"
          >
            <div className="bg-white p-0.5 rounded-sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            Log in with Google
          </button>

          <div className="text-center pt-4">
            {tab === "signin" && (
              <button 
                onClick={() => nav("/forgot-password")}
                className="text-xs text-muted-foreground hover:text-white transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>
        </motion.div>
        </AnimatePresence>

        <div className="w-full mt-auto pt-6 border-t border-white/10">
          <p className="text-[14px] text-center text-white">
            {tab === "signin" ? "Don't have an account?" : "Have an account?"}{" "}
            <button 
              onClick={() => setTab(tab === "signin" ? "signup" : "signin")}
              className="text-[#0095F6] font-semibold hover:text-[#1877F2]"
            >
              {tab === "signin" ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;