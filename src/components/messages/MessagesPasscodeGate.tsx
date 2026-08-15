import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, AlertTriangle, Loader2 } from "lucide-react";
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
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(value));
  } catch {}
};

const fetchRemote = async (uid: string): Promise<Stored | null> => {
  try {
    const { data, error } = await supabase
      .from("message_passcodes" as any)
      .select("hash, question, answer_hash, created_at")
      .eq("user_id", uid)
      .maybeSingle();
    if (error || !data) return null;
    const row: any = data;
    return {
      hash: row.hash,
      question: row.question,
      answerHash: row.answer_hash,
      createdAt: row.created_at,
    };
  } catch {
    return null;
  }
};

const saveRemote = async (uid: string, value: Stored) => {
  try {
    await supabase.from("message_passcodes" as any).upsert({
      user_id: uid,
      hash: value.hash,
      question: value.question,
      answer_hash: value.answerHash,
    } as any);
  } catch (e) {
    console.error("Failed to save remote passcode:", e);
  }
};

const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
};

type Screen = "passcode" | "forgot" | "setup";

export default function MessagesPasscodeGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  const [locked, setLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState(false);
  const [screen, setScreen] = useState<Screen>("passcode");
  const [input, setInput] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const cached = readCache(user.uid);
      if (cached) {
        setSetup(true);
        setLoading(false);
        return;
      }
      const remote = await fetchRemote(user.uid);
      if (remote) {
        writeCache(user.uid, remote);
        setSetup(true);
      } else {
        setSetup(false);
        setScreen("setup");
      }
      setLoading(false);
    })();
  }, [user?.uid]);

  // Auto-verify when 4 digits entered
  useEffect(() => {
    if (input.length === 4 && setup && user) {
      const cached = readCache(user.uid);
      if (cached && simpleHash(input) === cached.hash) {
        setLocked(false);
      } else if (input.length === 4) {
        toast.error("Incorrect passcode");
        setInput("");
      }
    }
  }, [input, setup, user]);

  // Auto-save new passcode during setup
  const handleSetupComplete = async () => {
    if (!user || input.length < 4) return;
    const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const stored: Stored = {
      hash: simpleHash(input),
      question,
      answerHash: "",
      createdAt: new Date().toISOString(),
    };
    writeCache(user.uid, stored);
    await saveRemote(user.uid, stored);
    setSetup(true);
    setLocked(false);
    toast.success("Passcode created");
  };

  const handleReset = async () => {
    if (!user) return;
    try {
      localStorage.removeItem(KEY(user.uid));
      await supabase.from("message_passcodes" as any).delete().eq("user_id", user.uid);
    } catch {}
    setSetup(false);
    setInput("");
    setScreen("setup");
    toast.success("Chat reset. Set a new passcode.");
  };

  const appendDigit = (digit: string) => {
    if (input.length >= 4) return;
    setInput(prev => prev + digit);
  };

  const deleteDigit = () => {
    setInput(prev => prev.slice(0, -1));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (!locked) return <>{children}</>;

  // Forgot passcode screen
  if (screen === "forgot") {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          {/* Warning icon */}
          <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">Forgot Passcode</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-8">
            If you reset your passcode, all your encrypted messages will be permanently deleted. 
            This action cannot be undone. You will need to set a new passcode to continue using messages.
          </p>

          {/* Red Reset Chat button */}
          <button
            onClick={handleReset}
            className="w-full max-w-xs h-12 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors active:scale-[0.98]"
          >
            Reset Chat
          </button>

          {/* Go Back button */}
          <button
            onClick={() => { setScreen("passcode"); setInput(""); }}
            className="mt-4 text-sm text-zinc-400 hover:text-white transition-colors font-medium"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  // Passcode entry / setup screen (X-style)
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center w-full max-w-sm"
      >
        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-3 text-center">
          {setup ? "Enter your passcode" : "Set up a passcode"}
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-zinc-500 text-center leading-relaxed mb-10 max-w-[280px]">
          {setup
            ? "Your passcode is required to recover your encryption keys so we can decrypt your previous messages"
            : "Create a 4-digit passcode to encrypt and protect your messages"
          }
        </p>

        {/* 4 circle OTP dots */}
        <div className="flex items-center gap-4 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                input.length > i
                  ? "bg-white border-white scale-110"
                  : "bg-transparent border-zinc-600"
              }`}
            />
          ))}
        </div>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[260px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => appendDigit(String(n))}
              className="h-16 w-16 mx-auto rounded-full border border-zinc-800 flex items-center justify-center text-xl font-medium text-white hover:bg-zinc-900 active:bg-zinc-800 active:scale-95 transition-all"
            >
              {n}
            </button>
          ))}
          {/* Empty spacer */}
          <div className="h-16 w-16 mx-auto" />
          {/* Zero */}
          <button
            onClick={() => appendDigit("0")}
            className="h-16 w-16 mx-auto rounded-full border border-zinc-800 flex items-center justify-center text-xl font-medium text-white hover:bg-zinc-900 active:bg-zinc-800 active:scale-95 transition-all"
          >
            0
          </button>
          {/* Delete */}
          <button
            onClick={deleteDigit}
            className="h-16 w-16 mx-auto rounded-full flex items-center justify-center text-white hover:bg-zinc-900 active:scale-95 transition-all"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Setup: confirm button when 4 digits entered */}
        {!setup && input.length === 4 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleSetupComplete}
            className="mt-8 w-full max-w-[260px] h-12 bg-white text-black font-bold text-sm rounded-full hover:bg-zinc-200 active:scale-[0.98] transition-all"
          >
            Set Passcode
          </motion.button>
        )}

        {/* Forgot Passcode link (only when passcode already set) */}
        {setup && (
          <button
            onClick={() => setScreen("forgot")}
            className="mt-8 text-sm text-zinc-500 hover:text-white transition-colors font-medium"
          >
            Forgot Passcode
          </button>
        )}
      </motion.div>
    </div>
  );
}
