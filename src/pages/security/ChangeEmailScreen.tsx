import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Mail } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { verifyBeforeUpdateEmail } from "firebase/auth";

export default function ChangeEmailScreen() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return toast.error("Enter a valid email");
    }
    setBusy(true);
    try {
      await auth.authStateReady();
      if (!auth.currentUser) throw new Error("Not authenticated");
      await verifyBeforeUpdateEmail(auth.currentUser, email.trim(), {
        url: `${window.location.origin}/`,
      });
      toast.success("Verification link sent to your new address");
      setEmail("");
    } catch (error: any) {
      toast.error(error.message || "Could not update email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <TopBar title="Change email"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>} />
      <div className="px-5 pb-24 max-w-md mx-auto space-y-4">
        <div className="rounded-2xl bg-card/40 border border-border/40 p-4 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Current email</p>
          <p className="font-mono text-sm text-foreground break-all">{user?.email}</p>
        </div>

        <div className="rounded-2xl bg-primary/10 border border-primary/30 p-4 space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-primary flex items-center gap-1.5"><Mail className="h-3 w-3" /> Verified change</p>
          <p className="text-xs text-muted-foreground">
            Firebase will send a confirmation link to the new address. Your sign-in email changes only after that link is confirmed.
          </p>
        </div>

        <input
          type="email"
          placeholder="New email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl bg-card/40 border border-border/40 px-4 py-3.5 text-sm"
        />
        <p className="text-xs text-muted-foreground px-1">
          We'll send a verification link to the new address. The change takes effect only after you click it.
        </p>
        <button disabled={busy || !email} onClick={save} className="w-full rounded-2xl bg-aurum text-[#06070B] py-3.5 font-semibold disabled:opacity-50">
          {busy ? "Sending…" : "Send verification link"}
        </button>
      </div>
    </div>
  );
}
