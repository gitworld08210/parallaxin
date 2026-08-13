import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Copy, Check, ExternalLink, Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { collection, query, limit, getDocs, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

interface Pack { coins: number; inr: number; badge?: string }
const PACKS: Pack[] = [
  { coins: 100, inr: 49 },
  { coins: 500, inr: 199, badge: "Popular" },
  { coins: 1500, inr: 499, badge: "Best value" },
  { coins: 5000, inr: 1499 },
];

interface Props { open: boolean; onOpenChange: (v: boolean) => void }
type Step = "pick" | "pay" | "done";

export function BuyCoinsSheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("pick");
  const [pack, setPack] = useState<Pack>(PACKS[1]);
  const [pay, setPay] = useState<{ upi: string; qr: string; payee: string } | null>(null);
  const [topupId, setTopupId] = useState<string | null>(null);
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
        console.warn("Failed to load payment settings", e);
      }
    })();
  }, [open]);

  const reset = () => { setStep("pick"); setPack(PACKS[1]); setTopupId(null); setUtr(""); };
  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const startPay = async () => {
    if (!user) return toast.error("Sign in first");
    if (!pay?.upi && !pay?.qr) return toast.error("Payments not configured yet");
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "coin_topups"), {
        user_id: user.id,
        coins: pack.coins,
        amount_inr: pack.inr,
        status: "pending",
        created_at: serverTimestamp()
      });
      setTopupId(docRef.id);
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
        updated_at: serverTimestamp()
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

  const copyUpi = async () => { if (!pay?.upi) return; await navigator.clipboard.writeText(pay.upi); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            {step === "done" ? "Top-up submitted" : "Buy Aurelix Coins"}
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
              <ShieldCheck className="h-3 w-3" /> Manual UPI verification · coins credited after review
            </p>
            <Button onClick={startPay} disabled={loading} className="w-full" size="lg">
              {loading ? "Preparing…" : `Continue · ₹${pack.inr}`}
            </Button>
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

        {step === "done" && (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/15 grid place-items-center">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-display text-xl font-bold">Submitted for review</p>
              <p className="text-xs text-muted-foreground mt-1">Our team will verify your payment and credit {pack.coins.toLocaleString("en-IN")} coins usually within a few hours.</p>
            </div>
            <Button onClick={() => handleClose(false)} className="w-full">Done</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
