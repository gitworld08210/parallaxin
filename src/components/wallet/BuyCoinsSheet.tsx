import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Copy, Check, ExternalLink, Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { collection, query, limit, getDocs, addDoc, doc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Pack { coins: number; inr: number; badge?: string }
const PACKS: Pack[] = [
  { coins: 100, inr: 49 },
  { coins: 500, inr: 199, badge: "Popular" },
  { coins: 1500, inr: 499, badge: "Best value" },
  { coins: 5000, inr: 1499 },
];

interface Props { open: boolean; onOpenChange: (v: boolean) => void }
type Step = "pick" | "pay" | "processing" | "done";
type PurchaseMode = "razorpay" | "manual";

interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayCheckout { open: () => void }

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckout;
  }
}

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Checkout is only available in a browser"));
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    const script = existing || document.createElement("script");
    let settled = false;

    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
    const onLoad = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (window.Razorpay) resolve();
      else reject(new Error("Razorpay Checkout loaded without its API"));
    };
    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Could not load Razorpay Checkout"));
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    if (!existing) {
      script.async = true;
      script.src = RAZORPAY_SCRIPT_URL;
      document.body.appendChild(script);
    }
  }).catch((error) => {
    razorpayScriptPromise = null;
    throw error;
  });

  return razorpayScriptPromise;
}

interface RazorpayOrderResponse {
  ok: true;
  topup_id: string;
  order_id: string;
  amount: number;
  currency: string;
  coins: number;
  key_id: string;
}

export function BuyCoinsSheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("pick");
  const [pack, setPack] = useState<Pack>(PACKS[1]);
  const [pay, setPay] = useState<{ upi: string; qr: string; payee: string } | null>(null);
  const [topupId, setTopupId] = useState<string | null>(null);
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode | null>(null);
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "payment_settings"), limit(1)));
        if (!snap.empty) {
          const row: any = snap.docs[0].data();
          setPay({ upi: row?.upi_id || "", qr: row?.qr_url || "", payee: row?.payee_name || "Aurelix" });
        }
      } catch (e) {
        console.warn("Failed to load manual payment settings", e);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!topupId || step !== "processing") return;

    const unsubscribe = onSnapshot(doc(db, "coin_topups", topupId), (snapshot) => {
      const status = snapshot.data()?.status;
      if (status === "approved") {
        setLoading(false);
        setStep("done");
        toast.success("Payment confirmed and coins added");
      }
    }, (error) => {
      console.warn("Unable to watch payment status", error);
    });

    return unsubscribe;
  }, [step, topupId]);

  const reset = () => {
    setStep("pick");
    setPack(PACKS[1]);
    setTopupId(null);
    setPurchaseMode(null);
    setUtr("");
    setLoading(false);
    setCopied(false);
  };
  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const startRazorpayPayment = async () => {
    if (!user) return toast.error("Sign in first");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<RazorpayOrderResponse>("razorpay-create-order", {
        body: { coins: pack.coins },
      });
      if (error) throw new Error(error.message || "Could not start payment");
      if (!data?.ok || !data.topup_id || !data.order_id || !data.key_id || !data.amount || !data.currency) {
        throw new Error("Payment service returned an incomplete order");
      }

      await loadRazorpayScript();
      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error("Razorpay Checkout is unavailable");

      const checkout = new Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "Aurelix",
        description: `${data.coins.toLocaleString("en-IN")} Aurelix Coins`,
        order_id: data.order_id,
        prefill: {
          name: user.user_metadata?.display_name,
          email: user.email,
          contact: user.phone,
        },
        theme: { color: "#8b5cf6" },
        handler: () => {
          // Checkout callbacks are not trusted for crediting. The signed
          // webhook updates coin_topups, and the snapshot below observes it.
          toast.info("Payment received. Waiting for secure confirmation…");
        },
        modal: {
          ondismiss: () => {
            toast.info("Checkout closed. If you paid, this screen will update after confirmation.");
          },
        },
      });

      setTopupId(data.topup_id);
      setPurchaseMode("razorpay");
      setStep("processing");
      checkout.open();
    } catch (e: any) {
      setTopupId(null);
      setPurchaseMode(null);
      setStep("pick");
      toast.error(e.message || "Could not start payment");
    } finally {
      setLoading(false);
    }
  };

  const startManualPay = async () => {
    if (!user) return toast.error("Sign in first");
    if (!pay?.upi && !pay?.qr) return toast.error("Manual payments are not configured");
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "coin_topups"), {
        user_id: user.id,
        coins: pack.coins,
        amount_inr: pack.inr,
        status: "pending",
        created_at: serverTimestamp(),
      });
      setTopupId(docRef.id);
      setPurchaseMode("manual");
      setStep("pay");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const submitUtr = async () => {
    if (!topupId) return;
    const cleaned = utr.trim().replace(/\s+/g, "");
    if (!/^[0-9]{12}$/.test(cleaned)) return toast.error("Enter your 12-digit UPI UTR");
    setLoading(true);
    try {
      await updateDoc(doc(db, "coin_topups", topupId), {
        utr: cleaned,
        status: "submitted",
        updated_at: serverTimestamp(),
      });
      setStep("done");
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const upiLink = pay?.upi
    ? `upi://pay?pa=${encodeURIComponent(pay.upi)}&pn=${encodeURIComponent(pay.payee)}&am=${pack.inr}&cu=INR&tn=${encodeURIComponent(`Coins-${pack.coins}`)}`
    : null;

  const copyUpi = async () => {
    if (!pay?.upi) return;
    await navigator.clipboard.writeText(pay.upi);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            {step === "done" ? (purchaseMode === "razorpay" ? "Coins added" : "Top-up submitted") : step === "processing" ? "Confirming your payment" : "Buy Aurelix Coins"}
          </SheetTitle>
        </SheetHeader>

        {step === "pick" && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              {PACKS.map((p) => {
                const active = pack.coins === p.coins;
                return (
                  <button key={p.coins} onClick={() => setPack(p)}
                    className={`relative rounded-2xl border p-4 text-left transition ${active ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                    {p.badge && <span className="absolute -top-2 right-3 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-semibold">{p.badge}</span>}
                    <div className="flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-aura" />
                      <span className="font-display text-2xl font-bold">{p.coins.toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">₹{p.inr}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Secure Razorpay checkout · coins credited after provider confirmation
            </p>
            <Button onClick={startRazorpayPayment} disabled={loading} className="w-full" size="lg">
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {loading ? "Preparing secure checkout…" : `Pay securely · ₹${pack.inr}`}
            </Button>
            {pay && (pay.upi || pay.qr) && (
              <div className="space-y-2 text-center">
                <Button onClick={startManualPay} disabled={loading} variant="outline" className="w-full">
                  Use manual UPI fallback
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Manual UPI payments are reconciled by support and may take a few hours.
                </p>
              </div>
            )}
          </div>
        )}

        {step === "pay" && pay && (
          <div className="space-y-4 py-4">
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5 text-center border border-primary/20">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pay exactly</p>
              <p className="font-display text-4xl font-bold">₹{pack.inr}</p>
              <p className="text-xs text-muted-foreground">to {pay.payee} for {pack.coins.toLocaleString("en-IN")} coins</p>
            </div>

            {pay.qr && <img src={pay.qr} alt="UPI QR" className="mx-auto h-48 w-48 rounded-2xl border border-border" />}

            {pay.upi && (
              <div className="rounded-xl border border-border p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase text-muted-foreground">UPI ID</p>
                  <p className="text-sm font-semibold truncate">{pay.upi}</p>
                </div>
                <Button size="sm" variant="outline" onClick={copyUpi}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {upiLink && (
              <a href={upiLink} className="w-full">
                <Button variant="outline" className="w-full"><ExternalLink className="h-4 w-4 mr-2" />Open UPI app</Button>
              </a>
            )}

            <div className="pt-2">
              <label className="text-xs text-muted-foreground">After paying, enter your 12-digit UTR</label>
              <Input value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, ""))} maxLength={12} placeholder="123456789012" className="mt-1 tracking-widest" />
            </div>
            <Button onClick={submitUtr} disabled={loading || utr.length !== 12} className="w-full" size="lg">
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Submit for verification
            </Button>
          </div>
        )}

        {step === "processing" && (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/15 grid place-items-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div>
              <p className="font-display text-xl font-bold">Waiting for confirmation</p>
              <p className="text-xs text-muted-foreground mt-1">
                Razorpay is confirming this payment securely. Coins are added only after our signed server notification arrives.
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">You can close this window safely; your payment status will continue updating.</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/15 grid place-items-center">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-display text-xl font-bold">{purchaseMode === "razorpay" ? "Payment confirmed" : "Submitted for review"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {purchaseMode === "razorpay"
                  ? `${pack.coins.toLocaleString("en-IN")} coins were added to your wallet.`
                  : `Our team will verify your payment and credit ${pack.coins.toLocaleString("en-IN")} coins usually within a few hours.`}
              </p>
            </div>
            <Button onClick={() => handleClose(false)} className="w-full">Done</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
