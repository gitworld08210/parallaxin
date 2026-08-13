import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { ChevronLeft, Shield, Copy } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function TwoFactorSetup() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<"loading" | "enrolled" | "active" | "verify">("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.find((f: any) => f.status === "verified");
    if (totp) { setFactorId(totp.id); setPhase("active"); return; }
    setPhase("enrolled");
  })(); }, []);

  const begin = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error) return toast.error(error.message);
    setFactorId(data.id);
    setSecret(data.totp.secret);
    const png = await QRCode.toDataURL(data.totp.uri, { color: { dark: "#C9A24C", light: "#06070B" }, margin: 1, width: 240 });
    setQr(png);
    setPhase("verify");
  };

  const verify = async () => {
    setBusy(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) { setBusy(false); return toast.error(challenge.error.message); }
    const verifyRes = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
    setBusy(false);
    if (verifyRes.error) return toast.error(verifyRes.error.message);
    setPhase("active");
    toast.success("Aura Shield engaged");
  };

  const disable = async () => {
    if (!confirm("Disable two-factor authentication?")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Two-factor disabled");
    setPhase("enrolled");
  };


  return (
    <div>
      <TopBar title="Aura Shield" subtitle="Two-factor authentication"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>} />

      <div className="px-5 pb-24 max-w-md mx-auto space-y-6">
        <div className="rounded-3xl border border-aurum/20 bg-gradient-to-b from-aurum/5 to-transparent p-6 text-center">
          <div className="h-14 w-14 mx-auto rounded-full bg-aurum/10 grid place-items-center text-aurum mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <p className="font-serif text-xl">{phase === "active" ? "Shield engaged" : "A silent guardian"}</p>
          <p className="text-xs text-muted-foreground mt-1">A 6-digit aura, refreshed every 30 seconds, woven from your private key.</p>
        </div>

        {phase === "enrolled" && (
          <button disabled={busy} onClick={begin} className="w-full rounded-2xl bg-aurum text-[#06070B] py-3.5 font-semibold disabled:opacity-50">
            Engage shield
          </button>
        )}

        {phase === "verify" && qr && (
          <div className="space-y-4">
            {/* Step A — Install an authenticator app */}
            <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
              <p className="text-[11px] font-bold tracking-[0.2em] text-aurum">STEP 1</p>
              <p className="mt-1 text-sm font-semibold">Install an authenticator app on your phone</p>
              <p className="mt-1 text-xs text-muted-foreground">
                If you don't have one yet, install any of these free apps:
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" rel="noreferrer"
                  className="rounded-xl border border-border/40 px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/20">
                  <span>Google Authenticator</span><span className="text-aurum">iOS ↗</span>
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noreferrer"
                  className="rounded-xl border border-border/40 px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/20">
                  <span>Google Authenticator</span><span className="text-aurum">Android ↗</span>
                </a>
                <a href="https://authy.com/download/" target="_blank" rel="noreferrer"
                  className="rounded-xl border border-border/40 px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/20">
                  <span>Authy</span><span className="text-aurum">iOS / Android ↗</span>
                </a>
                <a href="https://1password.com/downloads" target="_blank" rel="noreferrer"
                  className="rounded-xl border border-border/40 px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/20">
                  <span>1Password</span><span className="text-aurum">All platforms ↗</span>
                </a>
              </div>
            </div>

            {/* Step B — Scan the QR */}
            <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
              <p className="text-[11px] font-bold tracking-[0.2em] text-aurum">STEP 2</p>
              <p className="mt-1 text-sm font-semibold">Scan this QR with the app</p>
              <ol className="mt-2 space-y-1 text-xs text-muted-foreground list-decimal list-inside">
                <li>Open the authenticator app on your phone.</li>
                <li>Tap the <span className="text-foreground font-medium">"+"</span> or <span className="text-foreground font-medium">"Add account"</span> button.</li>
                <li>Choose <span className="text-foreground font-medium">"Scan a QR code"</span> and point your camera at the code below.</li>
                <li>The app will add "Aurelix" and start showing a 6-digit code that changes every 30 seconds.</li>
              </ol>

              <div className="mt-4 rounded-2xl border border-aurum/30 p-4 flex flex-col items-center gap-3 bg-[#06070B]">
                <img src={qr} alt="QR" className="rounded-xl" />
                <p className="text-[11px] text-muted-foreground">Scan with your authenticator app</p>
              </div>

              <div className="mt-3 rounded-xl border border-border/40 bg-background/40 p-3">
                <p className="text-[11px] text-muted-foreground">
                  Can't scan? Type this secret manually into the app instead:
                </p>
                <p className="mt-1 font-mono text-xs break-all text-foreground">{secret}</p>
                <button onClick={() => { navigator.clipboard.writeText(secret); toast.success("Secret copied"); }}
                  className="mt-2 text-xs flex items-center gap-1.5 text-aurum">
                  <Copy className="h-3 w-3" /> Copy secret
                </button>
              </div>
            </div>

            {/* Step C — Enter the code */}
            <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
              <p className="text-[11px] font-bold tracking-[0.2em] text-aurum">STEP 3</p>
              <p className="mt-1 text-sm font-semibold">Enter the 6-digit code from the app</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Open the app, find the "Aurelix" entry, and type the current 6-digit code below to finish setup.
              </p>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0,6))}
                placeholder="000000" inputMode="numeric"
                className="mt-3 w-full rounded-2xl bg-background/40 border border-border/40 px-4 py-3.5 text-center text-2xl tracking-[0.5em] font-mono" />
              <button disabled={busy || code.length !== 6} onClick={verify} className="mt-3 w-full rounded-2xl bg-aurum text-[#06070B] py-3.5 font-semibold disabled:opacity-50">
                Verify & activate
              </button>
            </div>
          </div>
        )}

        {phase === "active" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
              Two-factor authentication is active on this account.
            </div>
            <div className="rounded-2xl border border-border/40 bg-card/40 p-4 text-xs text-muted-foreground">
              Lost access to your authenticator app? Contact support to recover your account — recovery codes are not available.
            </div>

            <button disabled={busy} onClick={disable} className="w-full rounded-2xl border border-[hsl(15_55%_40%_/_0.4)] text-[hsl(15_55%_60%)] py-3.5 font-medium">
              Disable shield
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
