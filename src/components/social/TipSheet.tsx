import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, QrCode, Copy, Check, ExternalLink, ShieldCheck, Loader2, Clock } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRESETS = [49, 99, 199, 499, 999, 2499];

type Step = "amount" | "pay" | "done";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipientId: string;
  recipientName: string;
  postId?: string;
}

interface PlatformPay {
  upi: string;
  qr: string;
  payee: string;
}

export function TipSheet({ open, onOpenChange, recipientId, recipientName, postId }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<number>(99);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [utr, setUtr] = useState("");
  const [pay, setPay] = useState<PlatformPay | null>(null);
  const [tipId, setTipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const finalAmount = Number(custom) > 0 ? Math.floor(Number(custom)) : amount;
  const cents = finalAmount * 100;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("platform_payment_config" as any).select("*").maybeSingle();
      if (cancelled || error || !data) return;
      const row: any = Array.isArray(data) ? data[0] : data;
      setPay({
        upi: row?.upi_id || "",
        qr: row?.qr_url || "",
        payee: row?.payee_name || "Aurelix",
      });
    })();
    return () => { cancelled = true; };
  }, [open]);

  const upiLink = pay?.upi
    ? `upi://pay?pa=${encodeURIComponent(pay.upi)}&pn=${encodeURIComponent(pay.payee)}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(`Tip-${recipientName.slice(0,12)}`)}`
    : null;

  const startPay = async () => {
    if (!user) return toast.error("Sign in to tip");
    if (cents < 4900) return toast.error("Minimum tip is ₹49");
    if (!pay?.upi && !pay?.qr) return toast.error("Payments are not configured yet. Try again later.");
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("init_tip_payment", {
        _recipient_id: recipientId,
        _amount_cents: cents,
        _post_id: postId ?? null,
        _message: message.trim() || null
      });
      setTipId(String(data));
      setStep("pay");
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally {
      setLoading(false);
    }
  };

  const submitUtr = async () => {
    if (!tipId) return;
    const cleaned = utr.trim().replace(/\s+/g, "");
    if (!/^[0-9]{12}$/.test(cleaned)) return toast.error("Enter your 12-digit UPI UTR");
    setLoading(true);
    const { data, error } = await supabase.rpc("submit_tip_utr", {
      _tip_id: tipId,
      _utr: cleaned,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    const s = (data as any)?.status;
    if (s === "pending_review" || s === "verified") setStep("done");
    else toast.error("Could not submit — please try again");
  };

  const copyUpi = async () => {
    if (!pay?.upi) return;
    await navigator.clipboard.writeText(pay.upi);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const reset = () => {
    setStep("amount"); setAmount(99); setCustom(""); setMessage("");
    setUtr(""); setTipId(null); setCopied(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === "done" ? "Submitted for review" : `Send Aura to @${recipientName}`}
          </SheetTitle>
        </SheetHeader>

        {step === "amount" && (
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setAmount(p); setCustom(""); }}
                  className={`rounded-xl border py-3 text-sm font-semibold transition ${
                    finalAmount === p && !custom
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card"
                  }`}
                >
                  ₹{p}
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Custom amount (₹)</label>
              <Input
                type="number" inputMode="numeric" min={49} value={custom}
                onChange={(e) => setCustom(e.target.value)} placeholder="49 or more" className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Message (optional)</label>
              <Textarea
                maxLength={280} value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something nice…" className="mt-1 resize-none" rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Creator receives</span>
              <span className="font-semibold">₹{Math.floor(finalAmount * 0.85)}</span>
            </div>

            <Button onClick={startPay} disabled={loading || cents < 4900} className="w-full" size="lg">
              {loading ? "Preparing…" : `Continue · ₹${finalAmount}`}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Aurelix collects via UPI. Our team manually confirms each payment before crediting @{recipientName}'s wallet.
            </p>
          </div>
        )}

        {step === "pay" && pay && (
          <div className="space-y-5 py-4">
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5 text-center space-y-2 border border-primary/20">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pay exactly</p>
              <p className="font-display text-4xl font-bold">₹{finalAmount}</p>
              <p className="text-xs text-muted-foreground">to {pay.payee}</p>
            </div>

            {pay.qr ? (
              <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-soft">
                <img src={pay.qr} alt="UPI QR" className="h-56 w-56 object-contain" />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                <QrCode className="h-8 w-8" />
                Use the UPI ID below in any UPI app
              </div>
            )}

            {pay.upi && (
              <button
                onClick={copyUpi}
                className="w-full flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">UPI ID</span>
                <span className="font-semibold flex items-center gap-2">
                  {pay.upi}
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </span>
              </button>
            )}

            {upiLink && (
              <a
                href={upiLink}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold shadow-glow"
              >
                Open UPI app <ExternalLink className="h-4 w-4" />
              </a>
            )}

            <div className="pt-2 space-y-2">
              <label className="text-xs text-muted-foreground">Enter your 12-digit UPI UTR (transaction ID)</label>
              <Input
                value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="412334567890" inputMode="numeric" maxLength={12}
                className="font-mono tracking-wider text-center text-lg"
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Open your UPI app → tap the transaction → copy the UTR. Each UTR works once.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("amount")} className="flex-1">Back</Button>
              <Button onClick={submitUtr} disabled={loading || utr.length !== 12} className="flex-1">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Submit for review"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/20 grid place-items-center">
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
            <p className="font-semibold">₹{finalAmount} submitted for verification</p>
            <p className="text-sm text-muted-foreground px-4">
              Our team is confirming your UPI payment. @{recipientName} will be credited ₹{Math.floor(finalAmount * 0.85)} once approved — usually within a few hours.
            </p>
            <Button onClick={() => handleClose(false)} className="w-full" size="lg">Done</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
