import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Phone } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";

import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ChangePhoneScreen() {
  const nav = useNavigate();
  const { user } = useAuth();
  const current = user?.phone ? `+${user.phone}` : "";

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const p = phone.trim();
    if (!/^\+[1-9]\d{6,14}$/.test(p)) {
      return toast.error("Enter phone in E.164 format, e.g. +14155551234");
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("send-phone-code", {
      body: { phone: p },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      return toast.error((data as any)?.error || error?.message || "Failed to send code");
    }
    setSent(true);
    toast.success("Code sent");
  };

  const verify = async () => {
    if (!/^\d{4,8}$/.test(otp)) return toast.error("Enter the code");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("verify-phone-code", {
      body: { phone: phone.trim(), code: otp },
    });

    setBusy(false);
    if (error || (data as any)?.error) {
      return toast.error((data as any)?.error || error?.message || "Verification failed");
    }
    toast.success("Phone number updated ✦");
    nav(-1);
  };

  return (
    <div>
      <TopBar
        title="Phone number"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>}
      />
      <div className="px-5 pb-24 max-w-md mx-auto space-y-4">
        <div className="rounded-2xl bg-card/40 border border-border/40 p-4 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3 w-3" /> Current number
          </p>
          <p className="font-mono text-sm text-foreground">{current || "Not set"}</p>
        </div>

        <input
          className="w-full rounded-2xl bg-card/40 border border-border/40 px-4 py-3.5 text-sm"
          type="tel"
          placeholder="+14155551234"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={sent}
        />

        {sent && (
          <input
            className="w-full rounded-2xl bg-card/40 border border-border/40 px-4 py-3.5 text-sm"
            type="text"
            inputMode="numeric"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
            autoFocus
          />
        )}

        <p className="text-xs text-muted-foreground px-1">
          We'll text a verification code. Your number changes only after you enter the code.
        </p>

        <button
          disabled={busy}
          onClick={sent ? verify : send}
          className="w-full rounded-2xl bg-aurum text-[#06070B] py-3.5 font-semibold disabled:opacity-50"
        >
          {busy ? "…" : sent ? "Verify & update" : "Send code"}
        </button>

        {sent && (
          <button
            type="button"
            onClick={() => { setSent(false); setOtp(""); }}
            className="w-full text-xs text-muted-foreground py-2"
          >
            Change number
          </button>
        )}
      </div>
    </div>
  );
}
