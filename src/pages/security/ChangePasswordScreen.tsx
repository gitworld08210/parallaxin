import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

export default function ChangePasswordScreen() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!user?.email) return;
    if (next.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    try {
      await auth.authStateReady();
      const firebaseUser = auth.currentUser;
      if (!firebaseUser?.email) throw new Error("Password sign-in is not available for this account");

      const credential = EmailAuthProvider.credential(firebaseUser.email, current);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, next);
      toast.success("Password updated");
      nav(-1);
    } catch (error: any) {
      const message = error?.code === "auth/invalid-credential"
        ? "Current password is incorrect"
        : error?.message || "Could not update password";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <TopBar title="Change password"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>} />
      <div className="px-5 pb-24 max-w-md mx-auto space-y-3">
        <input type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)}
          className="w-full rounded-2xl bg-card/40 border border-border/40 px-4 py-3.5 text-sm" />
        <input type="password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)}
          className="w-full rounded-2xl bg-card/40 border border-border/40 px-4 py-3.5 text-sm" />
        <button disabled={busy} onClick={save} className="w-full rounded-2xl bg-aurum text-[#06070B] py-3.5 font-semibold disabled:opacity-50">
          {busy ? "Saving…" : "Update password"}
        </button>
      </div>
    </div>
  );
}
