import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";

export default function ChangeEmailScreen() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your new inbox to confirm");
    nav(-1);
  };

  return (
    <div>
      <TopBar title="Change email"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>} />
      <div className="px-5 pb-24 max-w-md mx-auto space-y-3">
        <p className="text-xs text-muted-foreground">Currently <span className="font-mono text-foreground">{user?.email}</span></p>
        <input type="email" placeholder="New email address" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl bg-card/40 border border-border/40 px-4 py-3.5 text-sm" />
        <button disabled={busy || !email} onClick={save} className="w-full rounded-2xl bg-aurum text-[#06070B] py-3.5 font-semibold disabled:opacity-50">
          {busy ? "Sending…" : "Send verification"}
        </button>
      </div>
    </div>
  );
}
