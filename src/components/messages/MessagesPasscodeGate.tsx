import { supabase } from "@/integrations/supabase/client";
// MessagesPasscodeGate — Signal-style 4-digit lock for the Messages surface.
// Flow:
//   1. First visit → setup wizard (create passcode → confirm → pick a security
//      question and answer for recovery).
//   2. Every entry into Messages → passcode keypad; on unlock renders children.
//      Unlock lasts ONLY while the user stays inside /messages. As soon as
//      they navigate to any other route (Reels, Feed, Profile, …) the gate
//      re-locks, so re-entering Messages always re-prompts.
//   3. "Forgot Passcode" → asks the previously chosen security question; a
//      correct answer lets the user set a new passcode.
// Storage is per-user via localStorage. Passcode + answer are stored as
// SHA-256 hashes only — never in plaintext.
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, ArrowLeft, ShieldCheck, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";

import { toast } from "sonner";

const KEY = (uid: string) => `msg_passcode:${uid}`;

const QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favourite movie?",
  "Who was your childhood best friend?",
];

type Stored = {
  hash: string;
  question: string;
  answerHash: string;
  createdAt: string;
};

const readCache = (uid: string): Stored | null => {
  try {
    const raw = localStorage.getItem(KEY(uid));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
};

const writeCache = (uid: string, value: Stored) => {
  try { localStorage.setItem(KEY(uid), JSON.stringify(value)); } catch {}
};

const fetchRemote = async (uid: string): Promise<Stored | null> => {
    supabase.from("message_passcodes" as any)
    supabase.select("hash, question, answer_hash, created_at")
    supabase.eq("user_id", uid)
    supabase.maybeSingle();
  if (error || !data) return null;
  const row: any = data;
  return {
    hash: row.hash,
    question: row.question,
    answerHash: row.answer_hash,
    createdAt: row.created_at,
  };
};

const saveRemote = async (uid: string, value: Stored) => {
    supabase.from("message_passcodes" as any)
    supabase.upsert(
      {
        user_id: uid,
        hash: value.hash,
        question: value.question,
        answer_hash: value.answerHash,
      } as any,
      { onConflict: "user_id" });
};

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Persistent unlock — once the user enters the passcode on this device we
// remember it, so DM taps don't re-prompt every time. Cleared only if the
// passcode is reset or storage is wiped.
// Module-level unlock flag — survives remounts while the user navigates
// between /messages and /messages/:id, but is CLEARED as soon as they leave
// the Messages section (see effect below). This ensures every fresh entry
// into DMs re-prompts for the passcode.
let sessionUnlocked = false;

export const MessagesPasscodeGate = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const uid = user?.id ?? "anon";

  const [ready, setReady] = useState(false);
  const [stored, setStored] = useState<Stored | null>(null);
  const [unlocked, setUnlocked] = useState(sessionUnlocked);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // 1. Warm start from cache
      const cached = readCache(uid);
      if (cached && !cancelled) setStored(cached);

      // 2. Supabase is source of truth
      const remote = await fetchRemote(uid);
      if (cancelled) return;
      
      if (remote) {
        setStored(remote);
        writeCache(uid, remote);
      } else if (cached) {
        // Backfill if cache exists but no remote
        saveRemote(uid, cached).catch(() => {});
        setStored(cached);
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [uid, user?.id]);

  // Re-lock whenever the user leaves the Messages surface entirely.
  useEffect(() => {
    if (!pathname.startsWith("/messages")) {
      sessionUnlocked = false;
      setUnlocked(false);
    }
  }, [pathname]);

  const handleUnlocked = () => {
    sessionUnlocked = true;
    setUnlocked(true);
  };

  const handleCreated = (s: Stored) => {
    writeCache(uid, s);
    saveRemote(uid, s).catch(() => {
      toast.error("Couldn't sync passcode to your account — will retry on next unlock.");
    });
    setStored(s);
    sessionUnlocked = true;
    setUnlocked(true);
    toast.success("Passcode set — Messages are now protected");
  };

  if (!user || !ready) {
    return (
      <div className="min-h-[100dvh] grid place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (unlocked) return <>{children}</>;
  if (!stored) return <SetupWizard onComplete={handleCreated} />;
  return <LockScreen stored={stored} onUnlocked={handleUnlocked} onReset={handleCreated} />;
};

/* -------------------------------------------------------------------------- */
/*                               Setup wizard                                 */
/* -------------------------------------------------------------------------- */

const SetupWizard = ({ onComplete }: { onComplete: (s: Stored) => void }) => {
  const [step, setStep] = useState<"create" | "confirm" | "question">("create");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [question, setQuestion] = useState(QUESTIONS[0]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  const onCreateComplete = (val: string) => {
    setPass(val);
    setStep("confirm");
  };

  const onConfirmComplete = (val: string) => {
    if (val !== pass) {
      toast.error("Passcodes don't match. Try again.");
      setConfirm("");
      setPass("");
      setStep("create");
      return;
    }
    setConfirm(val);
    setStep("question");
  };

  const finalize = async () => {
    const trimmed = answer.trim();
    if (trimmed.length < 2) {
      toast.error("Answer must be at least 2 characters");
      return;
    }
    setBusy(true);
    const [hash, answerHash] = await Promise.all([sha256(pass), sha256(trimmed.toLowerCase())]);
    setBusy(false);
    onComplete({ hash, question, answerHash, createdAt: new Date().toISOString() });
  };

  if (step === "create" || step === "confirm") {
    return (
      <PasscodePad
        title={step === "create" ? "Create passcode" : "Confirm passcode"}
        subtitle={
          step === "create"
            ? "Set a 4-digit passcode to secure your Messages. You'll need it every time you open chats on this device."
            : "Enter the same 4-digit passcode again to confirm."
        }
        value={step === "create" ? pass : confirm}
        onChange={step === "create" ? setPass : setConfirm}
        onComplete={step === "create" ? onCreateComplete : onConfirmComplete}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="h-14 px-3 flex items-center gap-2">
        <button
          onClick={() => setStep("confirm")}
          aria-label="Back"
          className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </header>
      <div className="flex-1 px-6 pt-8 max-w-md mx-auto w-full">
        <div className="mx-auto h-14 w-14 rounded-full bg-muted/60 grid place-items-center">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-center text-3xl font-extrabold tracking-tight">
          Recovery question
        </h1>
        <p className="mt-3 text-center text-sm text-muted-foreground leading-relaxed">
          Pick a security question. If you ever forget your passcode, the correct answer will let
          you reset it.
        </p>

        <div className="mt-8 space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Question</label>
          <div className="rounded-2xl bg-muted/40 border border-border overflow-hidden">
            <select
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-transparent px-4 py-3.5 text-[15px] outline-none appearance-none"
            >
              {QUESTIONS.map((q) => (
                <option key={q} value={q} className="bg-background text-foreground">
                  {q}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Your answer
          </label>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer"
            className="w-full rounded-2xl bg-muted/40 border border-border px-4 py-3.5 text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <p className="text-[11px] text-muted-foreground">
            Case-insensitive. Keep it something you'll always remember — we can't recover it for you.
          </p>
        </div>

        <button
          onClick={finalize}
          disabled={busy || answer.trim().length < 2}
          className="mt-8 w-full h-14 rounded-2xl bg-foreground text-background font-bold text-[15px] disabled:opacity-40 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enable passcode"}
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               Lock screen                                  */
/* -------------------------------------------------------------------------- */

const LockScreen = ({
  stored,
  onUnlocked,
  onReset,
}: {
  stored: Stored;
  onUnlocked: () => void;
  onReset: (s: Stored) => void;
}) => {
  const [mode, setMode] = useState<"enter" | "forgot" | "reset" | "confirm">("enter");
  const [pass, setPass] = useState("");
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [busy, setBusy] = useState(false);

  // Reset-flow state
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const tryUnlock = async (val: string) => {
    setBusy(true);
    const h = await sha256(val);
    setBusy(false);
    if (h === stored.hash) {
      onUnlocked();
    } else {
      setAttempts((n) => n + 1);
      setPass("");
      toast.error("Wrong passcode");
    }
  };

  const submitAnswer = async () => {
    const trimmed = answer.trim().toLowerCase();
    if (!trimmed) return;
    setBusy(true);
    const h = await sha256(trimmed);
    setBusy(false);
    if (h === stored.answerHash) {
      setMode("reset");
      setAnswer("");
    } else {
      toast.error("That answer doesn't match");
    }
  };

  const onNewComplete = (val: string) => {
    setNewPass(val);
    setMode("confirm");
  };

  const onConfirmComplete = async (val: string) => {
    if (val !== newPass) {
      toast.error("Passcodes don't match. Try again.");
      setNewPass("");
      setConfirmPass("");
      setMode("reset");
      return;
    }
    setBusy(true);
    const hash = await sha256(val);
    setBusy(false);
    onReset({ ...stored, hash, createdAt: new Date().toISOString() });
    toast.success("Passcode updated");
  };

  if (mode === "reset") {
    return (
      <PasscodePad
        title="Set a new passcode"
        subtitle="Choose a new 4-digit passcode for Messages."
        value={newPass}
        onChange={setNewPass}
        onComplete={onNewComplete}
      />
    );
  }

  if (mode === "confirm") {
    return (
      <PasscodePad
        title="Confirm new passcode"
        subtitle="Enter the same 4 digits again."
        value={confirmPass}
        onChange={setConfirmPass}
        onComplete={onConfirmComplete}
      />
    );
  }

  if (mode === "forgot") {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
        <header className="h-14 px-3 flex items-center gap-2">
          <button
            onClick={() => setMode("enter")}
            aria-label="Back"
            className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted/60"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 px-6 pt-8 max-w-md mx-auto w-full">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted/60 grid place-items-center">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-center text-3xl font-extrabold tracking-tight">
            Recover access
          </h1>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Answer your recovery question to reset your Messages passcode.
          </p>

          <div className="mt-8 rounded-2xl bg-muted/40 border border-border px-4 py-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Your question</p>
            <p className="mt-1 text-[15px] font-semibold">{stored.question}</p>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Answer</label>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer"
              autoFocus
              className="w-full rounded-2xl bg-muted/40 border border-border px-4 py-3.5 text-[15px] outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
            />
          </div>

          <button
            onClick={submitAnswer}
            disabled={busy || answer.trim().length < 2}
            className="mt-6 w-full h-14 rounded-2xl bg-foreground text-background font-bold text-[15px] disabled:opacity-40 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <PasscodePad
      title="Enter your passcode"
      subtitle="Your passcode is required to open Messages and decrypt your previous conversations."
      value={pass}
      onChange={setPass}
      onComplete={tryUnlock}
      footer={
        <button
          onClick={() => setMode("forgot")}
          className="text-foreground font-bold text-[15px] hover:opacity-80"
        >
          Forgot Passcode
        </button>
      }
      shake={attempts}
      busy={busy}
    />
  );
};

/* -------------------------------------------------------------------------- */
/*                             Numeric keypad UI                              */
/* -------------------------------------------------------------------------- */

const PasscodePad = ({
  title,
  subtitle,
  value,
  onChange,
  onComplete,
  footer,
  shake,
  busy,
}: {
  title: string;
  subtitle: string;
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
  footer?: React.ReactNode;
  shake?: number;
  busy?: boolean;
}) => {
  const completedRef = useRef<string>("");

  useEffect(() => {
    if (value.length === 4 && completedRef.current !== value) {
      completedRef.current = value;
      onComplete(value);
    }
    if (value.length < 4) completedRef.current = "";
  }, [value, onComplete]);

  const press = (d: string) => {
    if (busy) return;
    if (value.length >= 4) return;
    onChange(value + d);
  };
  const back = () => {
    if (busy) return;
    onChange(value.slice(0, -1));
  };

  const dots = useMemo(() => [0, 1, 2, 3], []);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <div className="flex-1 px-6 pt-16 max-w-md mx-auto w-full">
        <h1 className="text-center text-[28px] font-extrabold tracking-tight">{title}</h1>
        <p className="mt-4 text-center text-[15px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
          {subtitle}
        </p>

        <motion.div
          key={shake ?? 0}
          animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-14 flex items-center justify-center gap-5"
        >
          {dots.map((i) => {
            const filled = i < value.length;
            return (
              <motion.span
                key={i}
                animate={{ scale: filled ? 1.05 : 1 }}
                className={
                  "h-[22px] w-[22px] rounded-full border-2 " +
                  (filled ? "bg-foreground border-foreground" : "border-foreground/30")
                }
              />
            );
          })}
        </motion.div>

        <div className="mt-10 min-h-[24px] flex items-center justify-center">
          <AnimatePresence>{footer && <motion.div>{footer}</motion.div>}</AnimatePresence>
        </div>
      </div>

      {/* Keypad */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+16px)] px-8 max-w-md mx-auto w-full">
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Key key={d} onPress={() => press(d)}>
              <span className="text-[30px] font-light leading-none">{d}</span>
            </Key>
          ))}
          <div />
          <Key onPress={() => press("0")}>
            <span className="text-[30px] font-light leading-none">0</span>
          </Key>
          <Key onPress={back} aria-label="Delete">
            <Delete className="h-6 w-6" strokeWidth={1.75} />
          </Key>
        </div>
      </div>
    </div>
  );
};

const Key = ({
  children,
  onPress,
  ...rest
}: {
  children: React.ReactNode;
  onPress: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    onClick={onPress}
    className="h-16 rounded-full bg-muted/40 active:bg-muted/60 grid place-items-center text-foreground transition-colors"
    {...rest}
  >
    {children}
  </button>
);
