import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (reauthError) { setBusy(false); return toast.error("Current password is incorrect"); }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    nav(-1);
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
