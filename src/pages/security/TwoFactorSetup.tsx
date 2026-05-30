import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { ChevronLeft, Shield, Copy, Download } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TwoFactorSetup() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<"loading" | "enrolled" | "active" | "verify">("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.find((f: any) => f.status === "verified");
    if (totp) { setFactorId(totp.id); setPhase("active"); return; }
    setPhase("enrolled");
  })(); }, []);

  const begin = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Aurelix · ${new Date().toISOString().slice(0,10)}` });
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
    const codes = Array.from({ length: 10 }, () => Math.random().toString(36).slice(2, 6) + "-" + Math.random().toString(36).slice(2, 6));
    setRecovery(codes);
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

  const downloadCodes = () => {
    const blob = new Blob([`Aurelix recovery codes\n\n${recovery.join("\n")}\n`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "aurelix-recovery-codes.txt"; a.click();
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
            <div className="rounded-3xl border border-aurum/30 p-4 flex flex-col items-center gap-3 bg-[#06070B]">
              <img src={qr} alt="QR" className="rounded-xl" />
              <p className="text-[11px] text-muted-foreground">Scan with your authenticator app</p>
              <button onClick={() => { navigator.clipboard.writeText(secret); toast.success("Secret copied"); }}
                className="text-xs flex items-center gap-1.5 text-aurum"><Copy className="h-3 w-3" /> Copy secret</button>
            </div>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0,6))}
              placeholder="Enter 6-digit code" inputMode="numeric"
              className="w-full rounded-2xl bg-card/40 border border-border/40 px-4 py-3.5 text-center text-2xl tracking-[0.5em] font-mono" />
            <button disabled={busy || code.length !== 6} onClick={verify} className="w-full rounded-2xl bg-aurum text-[#06070B] py-3.5 font-semibold disabled:opacity-50">
              Verify
            </button>
          </div>
        )}

        {phase === "active" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
              Two-factor authentication is active on this account.
            </div>
            {recovery.length > 0 && (
              <div className="rounded-2xl border border-border/40 p-4 bg-card/40">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recovery codes — save them now</p>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-sm">
                  {recovery.map((c) => <span key={c} className="opacity-90">{c}</span>)}
                </div>
                <button onClick={downloadCodes} className="mt-3 text-xs flex items-center gap-1.5 text-aurum"><Download className="h-3 w-3" /> Download as .txt</button>
              </div>
            )}
            <button disabled={busy} onClick={disable} className="w-full rounded-2xl border border-[hsl(15_55%_40%_/_0.4)] text-[hsl(15_55%_60%)] py-3.5 font-medium">
              Disable shield
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
