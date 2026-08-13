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
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
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

    localStorage.removeItem(ORG_INTENT_KEY);

    // Profile is created during signup — only fall back if it's genuinely missing
    if (!prof?.display_name && !prof?.username) {
      nav("/profile-creation", { replace: true });
      return;
    }

    nav("/", { replace: true });
  };

  useEffect(() => { 
    if (!loading && user) routeForUser(user.id); 
  }, [user, loading]);

  const validEmail = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const buildUsername = (raw: string, fallback: string) => {
    const base = (raw || fallback).toLowerCase().replace(/[^a-z0-9._]/g, "");
    return raw ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const writeProfile = async (uid: string, data: Record<string, any>, username: string) => {
    await setDoc(doc(db, "profiles", uid), data, { merge: true });
    try {
      await setDoc(doc(db, "usernames", username), {
        user_id: uid, uid, updated_at: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn("Username index skipped:", e);
    }
  };

  const handleAuth = async () => {
    if (!validEmail() || password.length < 6) { 
      toast.error("Please enter a valid email and 6+ character password"); 
      return; 
    }
    if (tab === "signup" && !name.trim()) {
      toast.error("Please enter your name");
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

        const displayName = name.trim();
        const username = buildUsername(
          handle.trim(),
          displayName || email.trim().split("@")[0]
        );

        // Profile is fully created as part of signup
        await writeProfile(res.user.uid, {
          id: res.user.uid,
          user_id: res.user.uid,
          email: email.trim(),
          display_name: displayName,
          username,
          bio: "",
          account_type: kind,
          onboarded_at: serverTimestamp(),
          created_at: serverTimestamp(),
          followers_count: 0,
          following_count: 0,
          posts_count: 0,
          verified: false,
        }, username);

        try {
          await supabase.from("profiles").insert({
            id: res.user.uid,
            user_id: res.user.uid,
            username,
            display_name: displayName,
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
        const baseUsername = email?.split('@')[0] || uid.slice(0, 8);
        const finalUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
        
        await setDoc(doc(db, "profiles", uid), {
          id: uid,
          user_id: uid,
          email,
          display_name: name,
          username: finalUsername,
          account_type: kind,
          avatar_url: res.user.photoURL,
          onboarded_at: serverTimestamp(),
          created_at: serverTimestamp(),
          followers_count: 0,
          following_count: 0,
          posts_count: 0,
          verified: false
        });

        try {
          await setDoc(doc(db, "usernames", finalUsername), {
            user_id: uid,
            uid,
            updated_at: serverTimestamp()
          }, { merge: true });
        } catch (idxErr) {
          console.warn("Username index skipped:", idxErr);
        }

        try {
          await supabase.from("profiles").insert({
            id: uid,
            user_id: uid,
            username: finalUsername,
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-[360px] flex flex-col items-center z-10">
        <div className="mb-12 text-center">
          <span className="text-5xl font-serif italic tracking-tighter text-white drop-shadow-sm select-none">Parallax</span>
        </div>

        <div className="w-full bg-black sm:border sm:border-white/10 sm:rounded-[2rem] sm:p-8 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div 
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full space-y-4"
            >
              {tab === "signup" && (
                <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5 mb-2">
                  <button 
                    onClick={() => setKind("personal")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${kind === "personal" ? "bg-white text-black" : "text-zinc-500"}`}
                  >
                    Personal
                  </button>
                  <button 
                    onClick={() => setKind("organization")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${kind === "organization" ? "bg-white text-black" : "text-zinc-500"}`}
                  >
                    Business
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Phone number, username or email"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-zinc-600"
                />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-zinc-600"
                />
                {tab === "signup" && (
                  <>
                    <input 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Full name"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-zinc-600"
                    />
                    <input 
                      value={handle}
                      onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                      placeholder="Username (optional)"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-zinc-600"
                    />
                    <p className="text-[10px] text-zinc-600 px-1">
                      Only your name is required. Photo and bio can be added later.
                    </p>
                  </>
                )}
              </div>

              <button 
                onClick={handleAuth}
                disabled={busy}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 text-sm shadow-lg shadow-primary/20"
              >
                {busy ? "Signing in..." : tab === "signin" ? "Log in" : "Sign up"}
              </button>

              <div className="flex items-center gap-4 py-2">
                <div className="h-[1px] flex-1 bg-white/5" />
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">OR</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <button 
                onClick={handleGoogle}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold text-sm py-3 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              {tab === "signin" && (
                <div className="text-center pt-2">
                  <button 
                    onClick={() => nav("/forgot-password")}
                    className="text-[11px] font-bold text-zinc-500 hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-full mt-8 pt-8 border-t border-white/5">
          <p className="text-[13px] text-center text-zinc-400">
            {tab === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button 
              onClick={() => setTab(tab === "signin" ? "signup" : "signin")}
              className="text-primary font-black hover:brightness-110"
            >
              {tab === "signin" ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-[10px] font-bold text-zinc-800 tracking-tighter uppercase select-none">
        © 2026 Parallax Universe • All Rights Reserved
      </div>
    </div>
  );
};

export default Auth;