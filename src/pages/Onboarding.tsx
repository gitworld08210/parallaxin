import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Check, ArrowRight, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fadeUp, easeOutExpo } from "@/lib/motion";

const INTERESTS = [
  "Photography", "Design", "AI", "Startups", "Music", "Travel",
  "Film", "Fitness", "Food", "Books", "Crypto", "Gaming",
  "Fashion", "Coding", "Art", "Wellness",
];

const Onboarding = () => {
  const { user, profile, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);
  const [founders, setFounders] = useState<{ user_id: string; username: string; display_name: string; avatar_url: string | null }[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .eq("is_founder", true)
        .limit(6);
      setFounders(data ?? []);
    })();
  }, []);

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 8 ? [...prev, tag] : prev,
    );
  };
  const toggleFollow = (uid: string) => {
    setFollowed((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const today = new Date();
  const maxDob = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate()).toISOString().slice(0, 10);

  const canAdvance = useMemo(() => {
    if (step === 1) return !!dob;
    if (step === 2) return interests.length >= 3;
    return true;
  }, [step, interests, dob]);

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // 1. Update Firestore (Primary)
      const { doc, setDoc } = await import("firebase/firestore");
      const { db: firestoreDb } = await import("@/lib/firebase");
      
      await setDoc(doc(firestoreDb, "profiles", user.id), {
        interests,
        onboarded_at: new Date().toISOString(),
      }, { merge: true });

      // 2. Update Supabase (Secondary/Admin OS)
      try {
        await supabase
          .from("profiles")
          .update({
            interests,
            onboarded_at: new Date().toISOString(),
          } as any)
          .eq("user_id", user.id);
      } catch (e) {
        console.warn("Supabase profile sync failed, non-critical for social", e);
      }

      if (dob || gender) {
        try {
          await supabase.rpc("upsert_profile_private" as any, {
            _dob: dob || null,
            _gender: gender || null,
          });
        } catch (e) {
          console.warn("Supabase private profile sync failed", e);
        }
        
        // Also save to Firestore private if needed (implementation varies)
      }

      if (followed.size > 0) {
        try {
          const rows = Array.from(followed).map((following_id) => ({ follower_id: user.id, following_id }));
          await supabase.from("follows").insert(rows);
        } catch (e) {
          console.warn("Supabase follow sync failed", e);
        }
      }

      if ("Notification" in window && Notification.permission === "default") {
        try { await Notification.requestPermission(); } catch {}
      }

      await refreshProfile();
      toast.success("Welcome to Aurelix");
      nav("/", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const LAST = 4;
  const next = () => (step < LAST ? setStep((s) => s + 1) : finish());

  const GENDERS = [
    { v: "female", l: "Female" },
    { v: "male", l: "Male" },
    { v: "nonbinary", l: "Non-binary" },
    { v: "other", l: "Other" },
    { v: "prefer_not", l: "Prefer not to say" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 pt-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              i === step ? "w-8 bg-foreground" : i < step ? "w-4 bg-foreground/60" : "w-4 bg-border",
            )}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col px-6 pt-8 pb-24">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" {...fadeUp} className="text-center mt-8 relative">
              <div className="absolute inset-0 -top-10 bg-radial-glow pointer-events-none" />
              <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow mb-6 relative">
                <Sparkles className="h-9 w-9 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-black tracking-tight relative">A New Universe<br />for Creators.</h1>
              <p className="text-sm text-muted-foreground mt-4 max-w-xs mx-auto relative">Create. Connect. Earn. Grow.</p>
              <p className="text-xs text-muted-foreground/70 mt-10 relative">Hi {profile?.display_name || profile?.username || "there"} 👋</p>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="about" {...fadeUp}>
              <h2 className="text-2xl font-semibold tracking-tight">A little about you</h2>
              <p className="text-sm text-muted-foreground mt-1.5">Used to personalize your experience. You must be 13+.</p>

              <label className="block mt-6 text-xs font-medium text-muted-foreground">Date of birth</label>
              <input
                type="date" value={dob} max={maxDob} onChange={(e) => setDob(e.target.value)}
                className="mt-2 w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-primary/60"
              />

              <label className="block mt-5 text-xs font-medium text-muted-foreground">Gender <span className="opacity-60">(optional)</span></label>
              <div className="mt-2 flex flex-wrap gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g.v}
                    onClick={() => setGender(gender === g.v ? "" : g.v)}
                    className={cn(
                      "px-3.5 py-2 rounded-full text-sm font-medium border transition-all active:scale-95",
                      gender === g.v ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border hover:border-foreground/40",
                    )}
                  >
                    {g.l}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="interests" {...fadeUp}>
              <h2 className="text-2xl font-semibold tracking-tight">What do you love?</h2>
              <p className="text-sm text-muted-foreground mt-1.5">Pick at least 3. We'll tune your feed.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {INTERESTS.map((tag) => {
                  const active = interests.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleInterest(tag)}
                      className={cn(
                        "px-3.5 py-2 rounded-full text-sm font-medium border transition-all active:scale-95",
                        active ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border hover:border-foreground/40",
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4">{interests.length}/8 selected</p>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="founders" {...fadeUp}>
              <h2 className="text-2xl font-semibold tracking-tight">Follow a few founders</h2>
              <p className="text-sm text-muted-foreground mt-1.5">The people who built this place.</p>
              <div className="mt-6 space-y-2">
                {founders.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No founders yet. Skip ahead.</p>
                )}
                {founders.map((f, i) => {
                  const isFollowed = followed.has(f.user_id);
                  return (
                    <motion.div
                      key={f.user_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04, ease: easeOutExpo } }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                    >
                      {f.avatar_url ? (
                        <img src={f.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted grid place-items-center text-xs font-semibold">
                          {(f.display_name || f.username).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{f.display_name || f.username}</p>
                        <p className="text-xs text-muted-foreground truncate">@{f.username}</p>
                      </div>
                      <button
                        onClick={() => toggleFollow(f.user_id)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-sm font-semibold transition-colors active:scale-95",
                          isFollowed ? "bg-muted text-foreground" : "bg-primary text-primary-foreground",
                        )}
                      >
                        {isFollowed ? <Check className="h-4 w-4" /> : "Follow"}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="notify" {...fadeUp} className="text-center mt-12">
              <div className="mx-auto h-16 w-16 grid place-items-center rounded-full bg-muted mb-5">
                <Bell className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Stay in the loop</h2>
              <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto">
                We'll only ping you when something matters — DMs, mentions, and new followers.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-8">You can change this anytime in Settings.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 inset-x-0 mx-auto max-w-md p-4 bg-background/95 backdrop-blur-sm border-t border-border flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className="px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground">
            Back
          </button>
        )}
        <button
          onClick={next}
          disabled={!canAdvance || saving}
          className={cn(
            "flex-1 py-3 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
            "bg-primary text-primary-foreground disabled:opacity-40",
          )}
        >
          {saving ? "Setting up…" : step === LAST ? "Enter Aurelix" : "Continue"}
          {!saving && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;

