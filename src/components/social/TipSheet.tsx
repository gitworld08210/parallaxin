import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, QrCode, Copy, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { useEffect } from "react";

const PRESETS = [49, 99, 199, 499, 999, 2499];

type Step = "amount" | "pay" | "done";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipientId: string;
  recipientName: string;
  postId?: string;
}

interface RecipientPayInfo {
  upi_id: string | null;
  payment_qr_url: string | null;
  display_name: string | null;
}

export function TipSheet({ open, onOpenChange, recipientId, recipientName, postId }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<number>(99);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [utr, setUtr] = useState("");
  const [info, setInfo] = useState<RecipientPayInfo | null>(null);
  const [tipId, setTipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const finalAmount = Number(custom) > 0 ? Math.floor(Number(custom)) : amount;
  const cents = finalAmount * 100;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("upi_id, payment_qr_url, display_name")
        .eq("user_id", recipientId)
        .maybeSingle();
      if (!cancelled) setInfo(data as RecipientPayInfo | null);
    })();
    return () => { cancelled = true; };
  }, [open, recipientId]);

  const upiLink = info?.upi_id
    ? `upi://pay?pa=${encodeURIComponent(info.upi_id)}&pn=${encodeURIComponent(info.display_name || recipientName)}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent("Aura tip from @" + (user?.email?.split("@")[0] || "fan"))}`
    : null;

  const startPay = async () => {
    if (!user) return toast.error("Sign in to tip");
    if (cents < 4900) return toast.error("Minimum tip is ₹49");
    if (!info?.upi_id && !info?.payment_qr_url) return toast.error("This creator hasn't added a UPI QR yet");
    setLoading(true);
    try {
      const { data, error } = await supabase.from("tips").insert({
        sender_id: user.id,
        recipient_id: recipientId,
        post_id: postId ?? null,
        amount_cents: cents,
        platform_fee_cents: 0,
        net_cents: cents,
        currency: "inr",
        environment: "live",
        message: message.trim() || null,
        status: "pending",
      }).select("id").single();
      if (error || !data) throw new Error(error?.message || "Failed");
      setTipId(data.id);
      setStep("pay");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const submitUtr = async () => {
    if (!tipId) return;
    const cleaned = utr.trim().replace(/\s+/g, "");
    if (cleaned.length < 6) return toast.error("Enter the 12-digit UTR / transaction ref");
    setLoading(true);
    const { error } = await supabase
      .from("tips")
      .update({ utr: cleaned, status: "submitted" })
      .eq("id", tipId);
    setLoading(false);
    if (error) return toast.error(error.message);
    setStep("done");
  };

  const copyUpi = async () => {
    if (!info?.upi_id) return;
    await navigator.clipboard.writeText(info.upi_id);
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
            {step === "done" ? "Tip submitted" : `Send Aura to @${recipientName}`}
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

            {info && !info.upi_id && !info.payment_qr_url && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-200">
                @{recipientName} hasn't added a UPI QR yet. Ask them to set one up in Edit Profile.
              </div>
            )}

            <Button onClick={startPay} disabled={loading || cents < 4900 || (!info?.upi_id && !info?.payment_qr_url)} className="w-full" size="lg">
              {loading ? "Preparing…" : `Continue · ₹${finalAmount}`}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              You'll pay @{recipientName} directly via UPI. Aurelix takes no cut.
            </p>
          </div>
        )}

        {step === "pay" && info && (
          <div className="space-y-5 py-4">
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5 text-center space-y-3 border border-primary/20">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Paying</p>
              <p className="font-display text-4xl font-bold">₹{finalAmount}</p>
              <p className="text-xs text-muted-foreground">to @{recipientName}</p>
            </div>

            {info.payment_qr_url ? (
              <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-soft">
                <img src={info.payment_qr_url} alt="UPI QR" className="h-56 w-56 object-contain" />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                <QrCode className="h-8 w-8" />
                Use the UPI ID below in any UPI app
              </div>
            )}

            {info.upi_id && (
              <button
                onClick={copyUpi}
                className="w-full flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">UPI ID</span>
                <span className="font-semibold flex items-center gap-2">
                  {info.upi_id}
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
              <label className="text-xs text-muted-foreground">After paying, enter your 12-digit UTR / Transaction ID</label>
              <Input
                value={utr} onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. 412334567890" inputMode="numeric" maxLength={32}
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Find this in your UPI app under transaction details.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("amount")} className="flex-1">Back</Button>
              <Button onClick={submitUtr} disabled={loading || utr.trim().length < 6} className="flex-1">
                {loading ? "Submitting…" : "I've paid"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 grid place-items-center">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="font-semibold">Sent ₹{finalAmount} to @{recipientName}</p>
            <p className="text-sm text-muted-foreground px-4">
              They'll verify the UTR and your tip will appear on their profile shortly.
            </p>
            <Button onClick={() => handleClose(false)} className="w-full" size="lg">Done</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
