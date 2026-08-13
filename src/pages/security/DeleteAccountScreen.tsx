import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Trash2 } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";

import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { toast } from "sonner";

export default function DeleteAccountScreen() {
  const nav = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [confirmUsername, setConfirmUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const erase = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const credential = EmailAuthProvider.credential(user.email || "", password);
      const { error: reauth } = await reauthenticateWithCredential(user as any, credential).then(
        () => ({ error: null }),
        (e: any) => ({ error: e }),
      );
      if (reauth) throw reauth;
      const { error } = await supabase.rpc("schedule_account_deletion" as never, {
        _reason: reason || null,
      } as never);
      if (error) throw error;
      toast.success("Your account is scheduled for erasure. You have 7 days to undo by signing back in.");
      await signOut();
      nav("/auth");
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally { setBusy(false); }
  };

  return (
    <div>
      <TopBar title="Delete account"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>} />

      <div className="px-5 pb-24 max-w-md mx-auto space-y-5">
        <div className="rounded-3xl border border-[hsl(15_55%_40%_/_0.3)] bg-[hsl(15_55%_30%_/_0.06)] p-6 text-center">
          <div className="h-14 w-14 mx-auto rounded-full bg-[hsl(15_55%_40%_/_0.12)] grid place-items-center text-[hsl(15_55%_60%)] mb-3"><Trash2 className="h-6 w-6" /></div>
          <p className="font-serif text-xl">A final passage</p>
          <p className="text-xs text-muted-foreground mt-2">Your archive is dimmed for 7 days. Signing back in within that time restores everything. After, your presence dissolves.</p>
        </div>

        {step === 1 && (
          <>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500}
              placeholder="(Optional) What's drawing you away?" rows={4}
              className="w-full rounded-2xl bg-card/40 border border-border/40 px-4 py-3 text-sm" />
            <button onClick={() => setStep(2)} className="w-full rounded-2xl border border-border/60 py-3.5 text-sm font-medium">Continue</button>
          </>
        )}
        {step === 2 && (
          <>
            <p className="text-xs text-muted-foreground">Type your username <span className="text-foreground font-mono">{profile?.username}</span> to confirm</p>
            <input value={confirmUsername} onChange={(e) => setConfirmUsername(e.target.value)}
              className="w-full rounded-2xl bg-card/40 border border-border/40 px-4 py-3.5 text-sm font-mono" />
            <button disabled={confirmUsername !== profile?.username} onClick={() => setStep(3)}
              className="w-full rounded-2xl border border-border/60 py-3.5 text-sm font-medium disabled:opacity-40">Continue</button>
          </>
        )}
        {step === 3 && (
          <>
            <p className="text-xs text-muted-foreground">Confirm your password</p>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-card/40 border border-border/40 px-4 py-3.5 text-sm" />
            <button disabled={busy || !password} onClick={erase}
              className="w-full rounded-2xl bg-[hsl(15_55%_45%)] text-white py-3.5 font-semibold disabled:opacity-50">
              {busy ? "Dissolving…" : "Delete my account"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
