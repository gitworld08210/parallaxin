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
      nav("/onboarding/organization", { replace: true });
      return;
    }
    localStorage.removeItem(ORG_INTENT_KEY);
    nav(prof?.username ? "/" : "/profile-creation", { replace: true });
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
      
      <div className="w-full max-w-[390px] min-h-screen sm:min-h-0 sm:aspect-[9/19.5] relative z-10 bg-black sm:border sm:border-white/10 sm:rounded-[3rem] sm:shadow-2xl flex flex-col items-center pt-20 px-8 pb-10">
        <div className="text-center mb-12 w-full">
          <div className="flex justify-center mb-10">
            <span className="text-5xl font-serif italic tracking-tighter">Parallax</span>
          </div>
          <h1 className="sr-only">
            {tab === "signin" ? "Log in" : "Sign up"}
          </h1>
        </div>

        <div className="space-y-6 w-full flex-1">
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

          <div className="space-y-4">
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Phone number, username, or email"
                className="w-full bg-[#111] border border-white/5 rounded-lg pl-4 pr-4 py-3.5 text-[14px] outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-600"
              />
            </div>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-[#111] border border-white/5 rounded-lg pl-4 pr-4 py-3.5 text-[14px] outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-600"
              />
            </div>
          </div>

          <button 
            onClick={handleAuth}
            disabled={busy}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 text-sm shadow-lg shadow-primary/20"
          >
            {busy ? "Please wait..." : tab === "signin" ? "Log in" : "Sign up"}
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">or</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <button 
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 text-[#385185] font-bold text-sm hover:underline"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            </svg>
            Continue with Google
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
        </div>

        <div className="w-full mt-auto pt-10 border-t border-white/5">
          <p className="text-sm text-center text-muted-foreground">
            {tab === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button 
              onClick={() => setTab(tab === "signin" ? "signup" : "signin")}
              className="text-primary font-bold hover:underline"
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