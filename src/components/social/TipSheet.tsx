import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Coins, Sparkles } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";

const PRESETS = [49, 99, 199, 499, 999, 2499]; // INR rupees (display) → ×100 cents

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipientId: string;
  recipientName: string;
  postId?: string;
}

export function TipSheet({ open, onOpenChange, recipientId, recipientName, postId }: Props) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(99);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const finalAmount = Number(custom) > 0 ? Math.floor(Number(custom)) : amount;
  const cents = finalAmount * 100;

  const startCheckout = async () => {
    if (!user) return toast.error("Sign in to tip");
    if (cents < 4900) return toast.error("Minimum tip is ₹49");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-tip-checkout", {
        body: {
          recipientId,
          postId: postId ?? null,
          amountCents: cents,
          message: message.trim() || undefined,
          currency: "inr",
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        },
      });
      if (error || !data?.clientSecret) throw new Error(error?.message || "Failed to start checkout");
      setClientSecret(data.clientSecret);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) { setClientSecret(null); setMessage(""); setCustom(""); setAmount(99); }
    onOpenChange(v);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Send Aura to @{recipientName}
          </SheetTitle>
        </SheetHeader>

        {clientSecret ? (
          <div className="mt-4">
            <StripeEmbeddedCheckout
              priceId="__tip__"
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          </div>
        ) : (
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
                type="number"
                inputMode="numeric"
                min={49}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="49 or more"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Message (optional)</label>
              <Textarea
                maxLength={280}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something nice…"
                className="mt-1 resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3 text-sm">
              <span className="text-muted-foreground">You'll send</span>
              <span className="font-semibold flex items-center gap-1">
                <Coins className="h-4 w-4 text-primary" /> ₹{finalAmount}
              </span>
            </div>

            <Button onClick={startCheckout} disabled={loading || cents < 4900} className="w-full" size="lg">
              {loading ? "Preparing…" : `Send ₹${finalAmount}`}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Platform fee 15% supports Aurelix. Creator receives ₹{(finalAmount * 0.85).toFixed(0)}.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
