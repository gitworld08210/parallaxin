import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db, googleProvider } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { ArrowLeft, Mail, Phone, User, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Step = "landing" | "email" | "phone" | "username" | "otp" | "password";

const Auth = () => {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  const nextPath = useMemo(() => {
    const raw = params.get("next");
    if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
    return raw;
  }, [params]);

  const [step, setStep] = useState<Step>("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [busy, setBusy] = useState(false);

  const inProgress = useRef(false);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  // --- Core routing and profile logic (unchanged) ---

  const routeForUser = async (uid: string) => {
    if (nextPath) {
      nav(nextPath, { replace: true });
      return;
    }

    let prof: any = null;
    try {
      const profSnap = await getDoc(doc(db, "profiles", uid));
      prof = profSnap.exists() ? profSnap.data() : null;
    } catch (e) {
      console.error("Error fetching profile during routing:", e);
    }

    if (!prof?.display_name && !prof?.username) {
      nav("/profile-creation", { replace: true });
      return;
    }

    nav("/", { replace: true });
  };

  useEffect(() => {
    if (!loading && user && !inProgress.current) routeForUser(user.id);
  }, [user, loading]);

  const buildUsername = (raw: string, fallback: string) => {
    const base = (raw || fallback).toLowerCase().replace(/[^a-z0-9._]/g, "");
    return raw ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const writeProfile = async (uid: string, data: Record<string, any>, usernameVal: string) => {
    await setDoc(doc(db, "profiles", uid), data, { merge: true });
    try {
      await setDoc(
        doc(db, "usernames", usernameVal),
        { user_id: uid, uid, updated_at: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      console.warn("Username index skipped:", e);
    }
  };

  // --- Auth handlers ---

  const handleAuth = async () => {
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || password.length < 6) {
      toast.error("Please enter a valid email and 6+ character password");
      return;
    }
    setBusy(true);
    inProgress.current = true;
    try {
      const res = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      toast.success("Logged in");
      if (res.user) await routeForUser(res.user.uid);
    } catch (e: any) {
      // If sign in fails, try creating the account
      if (e?.code === "auth/user-not-found" || e?.code === "auth/invalid-credential") {
        try {
          const res = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
          const displayName = trimmedEmail.split("@")[0];
          const finalUsername = buildUsername("", displayName);

          await writeProfile(res.user.uid, {
            id: res.user.uid,
            user_id: res.user.uid,
            email: trimmedEmail,
            display_name: displayName,
            username: finalUsername,
            bio: "",
            account_type: "personal",
            onboarded_at: serverTimestamp(),
            created_at: serverTimestamp(),
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
            verified: false,
          }, finalUsername);

          try {
            await supabase.from("profiles").insert({
              id: res.user.uid,
              user_id: res.user.uid,
              username: finalUsername,
              display_name: displayName,
              account_type: "personal",
            } as any);
          } catch (syncErr) {
            console.warn("Supabase sync failed", syncErr);
          }

          toast.success("Account created");
          await routeForUser(res.user.uid);
        } catch (signupErr: any) {
          toast.error(signupErr?.message || "Authentication failed");
        }
      } else {
        toast.error(e?.message || "Authentication failed");
      }
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    inProgress.current = true;
    try {
      const res = await signInWithPopup(auth, googleProvider);

      const profSnap = await getDoc(doc(db, "profiles", res.user.uid));
      if (!profSnap.exists()) {
        const uid = res.user.uid;
        const userEmail = res.user.email;
        const name = res.user.displayName || userEmail?.split("@")[0] || "User";
        const baseUsername = userEmail?.split("@")[0] || uid.slice(0, 8);
        const finalUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;

        await setDoc(doc(db, "profiles", uid), {
          id: uid,
          user_id: uid,
          email: userEmail,
          display_name: name,
          username: finalUsername,
          account_type: "personal",
          avatar_url: res.user.photoURL,
          onboarded_at: serverTimestamp(),
          created_at: serverTimestamp(),
          followers_count: 0,
          following_count: 0,
          posts_count: 0,
          verified: false,
        });

        try {
          await setDoc(
            doc(db, "usernames", finalUsername),
            { user_id: uid, uid, updated_at: serverTimestamp() },
            { merge: true }
          );
        } catch (idxErr) {
          console.warn("Username index skipped:", idxErr);
        }

        try {
          await supabase.from("profiles").insert({
            id: uid,
            user_id: uid,
            username: finalUsername,
            display_name: name,
            account_type: "personal",
            avatar_url: res.user.photoURL,
          } as any);
        } catch (syncErr) {
          console.warn("Supabase sync failed", syncErr);
        }
      }
      toast.success("Signed in with Google");
      await routeForUser(res.user.uid);
    } catch (e: any) {
      toast.error(e?.message || "Google sign-in failed");
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  };

  const handleUsernameLogin = async () => {
    const trimmed = username.trim().replace(/^@/, "");
    if (!trimmed) {
      toast.error("Please enter a username");
      return;
    }
    setBusy(true);
    inProgress.current = true;
    try {
      const usernameSnap = await getDoc(doc(db, "usernames", trimmed));
      if (!usernameSnap.exists()) {
        toast.error("Username not found");
        return;
      }
      const uid = usernameSnap.data()?.uid || usernameSnap.data()?.user_id;
      if (!uid) {
        toast.error("Username not found");
        return;
      }
      // Get the user profile to find their email
      const profSnap = await getDoc(doc(db, "profiles", uid));
      if (!profSnap.exists() || !profSnap.data()?.email) {
        toast.error("No email associated with this username. Try another sign-in method.");
        return;
      }
      // Pre-fill email and go to password step
      setEmail(profSnap.data().email);
      setStep("password");
    } catch (e: any) {
      toast.error(e?.message || "Lookup failed");
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  };

  const initRecaptcha = () => {
    if (recaptchaVerifierRef.current) return;
    if (!recaptchaContainerRef.current) return;
    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
      size: "invisible",
      callback: () => {},
    });
  };

  const handlePhoneSend = async () => {
    const trimmed = phoneNumber.trim().replace(/\s/g, "");
    if (trimmed.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setBusy(true);
    inProgress.current = true;
    try {
      initRecaptcha();
      const fullNumber = trimmed.startsWith("+") ? trimmed : `+91${trimmed}`;
      const confirmation = await signInWithPhoneNumber(
        auth,
        fullNumber,
        recaptchaVerifierRef.current!
      );
      confirmationResultRef.current = confirmation;
      toast.success("OTP sent to your phone");
      setStep("otp");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send OTP");
      // Reset recaptcha on failure
      recaptchaVerifierRef.current = null;
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otpCode.length < 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }
    if (!confirmationResultRef.current) {
      toast.error("Session expired. Please try again.");
      setStep("phone");
      return;
    }
    setBusy(true);
    inProgress.current = true;
    try {
      const res = await confirmationResultRef.current.confirm(otpCode);
      const uid = res.user.uid;

      // Check if profile exists, create if not (same as Google flow)
      const profSnap = await getDoc(doc(db, "profiles", uid));
      if (!profSnap.exists()) {
        const phone = res.user.phoneNumber || phoneNumber;
        const displayName = `User${uid.slice(0, 4)}`;
        const finalUsername = `user${Math.floor(10000 + Math.random() * 90000)}`;

        await writeProfile(uid, {
          id: uid,
          user_id: uid,
          phone,
          display_name: displayName,
          username: finalUsername,
          bio: "",
          account_type: "personal",
          onboarded_at: serverTimestamp(),
          created_at: serverTimestamp(),
          followers_count: 0,
          following_count: 0,
          posts_count: 0,
          verified: false,
        }, finalUsername);

        try {
          await supabase.from("profiles").insert({
            id: uid,
            user_id: uid,
            username: finalUsername,
            display_name: displayName,
            account_type: "personal",
          } as any);
        } catch (syncErr) {
          console.warn("Supabase sync failed", syncErr);
        }
      }

      toast.success("Phone verified");
      await routeForUser(uid);
    } catch (e: any) {
      toast.error(e?.message || "Invalid OTP");
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  };

  // --- Step transition animation ---
  const stepVariants = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  // --- Render steps ---

  const renderLanding = () => (
    <motion.div
      key="landing"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center w-full min-h-screen px-6 py-12"
    >
      {/* Logo and tagline */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <h1 className="text-5xl font-serif italic tracking-tighter text-white select-none mb-4">
          Parallax
        </h1>
        <p className="text-lg text-zinc-400 text-center">See what's happening</p>
      </div>

      {/* Auth options */}
      <div className="w-full max-w-[340px] space-y-3 pb-8">
        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-sm py-3.5 rounded-full hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Email icon button */}
        <button
          onClick={() => setStep("email")}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 border border-white/20 text-white font-semibold text-sm py-3.5 rounded-full hover:bg-white/5 transition-all active:scale-[0.98]"
        >
          <Mail className="h-4 w-4" />
          Continue with Email
        </button>

        {/* OR divider */}
        <div className="flex items-center gap-4 py-2">
          <div className="h-[1px] flex-1 bg-white/10" />
          <span className="text-xs text-zinc-500 font-medium">or</span>
          <div className="h-[1px] flex-1 bg-white/10" />
        </div>

        {/* Phone button */}
        <button
          onClick={() => setStep("phone")}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-sm py-3.5 rounded-full hover:bg-zinc-200 transition-all active:scale-[0.98]"
        >
          <Phone className="h-4 w-4" />
          Continue with Phone
        </button>

        {/* Terms */}
        <p className="text-[10px] text-zinc-600 text-center leading-relaxed pt-3">
          By signing up, you agree to the{" "}
          <span className="text-zinc-400">Terms of Service</span> and{" "}
          <span className="text-zinc-400">Privacy Policy</span>, including{" "}
          <span className="text-zinc-400">Cookie Use</span>.
        </p>

        {/* Username login link */}
        <button
          onClick={() => setStep("username")}
          className="w-full flex items-center justify-center gap-1 text-zinc-400 text-sm pt-4 hover:text-white transition-colors"
        >
          Login with username <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );

  const renderEmail = () => (
    <motion.div
      key="email"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25 }}
      className="flex flex-col w-full min-h-screen px-6 py-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <button onClick={() => setStep("landing")} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <button
          onClick={() => setStep("phone")}
          className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          Use phone
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-2">Enter your email address</h2>
        <p className="text-sm text-zinc-500 mb-8">We'll send you a verification code</p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          autoFocus
          className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3.5 text-white text-base outline-none focus:border-white/50 transition-colors placeholder:text-zinc-600"
        />
      </div>

      {/* Footer */}
      <div className="pb-8 space-y-4">
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          We may use your email address to personalize your experience and send updates. You can change this in your settings at any time.{" "}
          <span className="text-zinc-400">Privacy Policy</span>
        </p>
        <button
          onClick={() => {
            const trimmed = email.trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
              toast.error("Please enter a valid email address");
              return;
            }
            setStep("password");
          }}
          disabled={busy || !email.trim()}
          className="w-full bg-white text-black font-bold text-sm py-3.5 rounded-full hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-30 disabled:hover:bg-white"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );

  const renderPhone = () => (
    <motion.div
      key="phone"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25 }}
      className="flex flex-col w-full min-h-screen px-6 py-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <button onClick={() => setStep("landing")} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <button
          onClick={() => setStep("email")}
          className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          Use email
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-2">Enter your phone number</h2>
        <p className="text-sm text-zinc-500 mb-8">We'll send you a verification code via SMS</p>

        <div className="flex items-center gap-3">
          {/* Country code picker */}
          <div className="flex items-center gap-2 border border-white/20 rounded-lg px-3 py-3.5 text-white text-sm shrink-0">
            <span className="text-lg">🇮🇳</span>
            <span className="text-zinc-300">+91</span>
          </div>
          {/* Phone input */}
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Phone number"
            autoFocus
            className="flex-1 bg-transparent border border-white/20 rounded-lg px-4 py-3.5 text-white text-base outline-none focus:border-white/50 transition-colors placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 space-y-4">
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          We may use your phone number to send a verification code via SMS. Message and data rates may apply.{" "}
          <span className="text-zinc-400">Privacy Policy</span>
        </p>
        <button
          onClick={handlePhoneSend}
          disabled={busy || phoneNumber.trim().length < 10}
          className="w-full bg-white text-black font-bold text-sm py-3.5 rounded-full hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-30 disabled:hover:bg-white"
        >
          {busy ? "Sending..." : "Continue"}
        </button>
      </div>
    </motion.div>
  );

  const renderUsername = () => (
    <motion.div
      key="username"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25 }}
      className="flex flex-col w-full min-h-screen px-6 py-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <button onClick={() => setStep("landing")} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <button
          onClick={() => nav("/forgot-password")}
          className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          Forgot username
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-8">Enter your username</h2>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-base">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
            placeholder="username"
            autoFocus
            className="w-full bg-transparent border border-white/20 rounded-lg pl-9 pr-4 py-3.5 text-white text-base outline-none focus:border-white/50 transition-colors placeholder:text-zinc-600"
          />
        </div>

        {/* Alternative login methods */}
        <div className="mt-8 space-y-3">
          <button
            onClick={handleUsernameLogin}
            disabled={busy || !username.trim()}
            className="w-full bg-white text-black font-bold text-sm py-3.5 rounded-full hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-30 disabled:hover:bg-white"
          >
            {busy ? "Looking up..." : "Continue"}
          </button>

          <div className="flex items-center gap-4 py-3">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span className="text-xs text-zinc-500 font-medium">or</span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 border border-white/20 text-white font-semibold text-sm py-3 rounded-full hover:bg-white/5 transition-all active:scale-[0.98]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => setStep("email")}
            className="w-full flex items-center justify-center gap-3 border border-white/20 text-white font-semibold text-sm py-3 rounded-full hover:bg-white/5 transition-all active:scale-[0.98]"
          >
            <Mail className="h-4 w-4" />
            Continue with Email
          </button>

          <button
            onClick={() => setStep("phone")}
            className="w-full flex items-center justify-center gap-3 border border-white/20 text-white font-semibold text-sm py-3 rounded-full hover:bg-white/5 transition-all active:scale-[0.98]"
          >
            <Phone className="h-4 w-4" />
            Continue with Phone
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderOtp = () => (
    <motion.div
      key="otp"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25 }}
      className="flex flex-col w-full min-h-screen px-6 py-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <button onClick={() => setStep("phone")} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-2">Enter verification code</h2>
        <p className="text-sm text-zinc-500 mb-8">
          We sent a 6-digit code to +91 {phoneNumber}
        </p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="000000"
          autoFocus
          className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3.5 text-white text-center text-2xl tracking-[0.5em] outline-none focus:border-white/50 transition-colors placeholder:text-zinc-700 placeholder:tracking-[0.5em]"
        />

        <button
          onClick={handlePhoneSend}
          disabled={busy}
          className="text-sm text-zinc-400 hover:text-white transition-colors mt-4 self-start"
        >
          Resend code
        </button>
      </div>

      {/* Footer */}
      <div className="pb-8">
        <button
          onClick={handleOtpVerify}
          disabled={busy || otpCode.length < 6}
          className="w-full bg-white text-black font-bold text-sm py-3.5 rounded-full hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-30 disabled:hover:bg-white"
        >
          {busy ? "Verifying..." : "Verify"}
        </button>
      </div>
    </motion.div>
  );

  const renderPassword = () => (
    <motion.div
      key="password"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25 }}
      className="flex flex-col w-full min-h-screen px-6 py-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <button onClick={() => setStep("email")} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-2">Enter your password</h2>
        <p className="text-sm text-zinc-500 mb-8">{email}</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3.5 text-white text-base outline-none focus:border-white/50 transition-colors placeholder:text-zinc-600"
        />

        <button
          onClick={() => nav("/forgot-password")}
          className="text-sm text-zinc-400 hover:text-white transition-colors mt-4 self-start"
        >
          Forgot password?
        </button>
      </div>

      {/* Footer */}
      <div className="pb-8">
        <button
          onClick={handleAuth}
          disabled={busy || password.length < 6}
          className="w-full bg-white text-black font-bold text-sm py-3.5 rounded-full hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-30 disabled:hover:bg-white"
        >
          {busy ? "Signing in..." : "Log in"}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center relative overflow-hidden">
      {/* Recaptcha container for phone auth (invisible) */}
      <div ref={recaptchaContainerRef} id="recaptcha-container" />

      <div className="w-full max-w-[420px]">
        <AnimatePresence mode="wait">
          {step === "landing" && renderLanding()}
          {step === "email" && renderEmail()}
          {step === "phone" && renderPhone()}
          {step === "username" && renderUsername()}
          {step === "otp" && renderOtp()}
          {step === "password" && renderPassword()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
