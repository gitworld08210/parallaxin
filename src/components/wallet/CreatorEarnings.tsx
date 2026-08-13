import { useEffect, useState, useCallback } from "react";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Banknote, ShieldCheck, Upload, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const rupees = (c: number) => `₹${(c / 100).toLocaleString("en-IN")}`;

interface Balance { available_cents: number; pending_cents: number; lifetime_earned_cents: number; }
interface Kyc { id: string; status: "pending" | "approved" | "rejected"; review_note: string | null; }

export function CreatorEarnings() {
  const { user } = useAuth();
  const [bal, setBal] = useState<Balance>({ available_cents: 0, pending_cents: 0, lifetime_earned_cents: 0 });
  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [loading, setLoading] = useState(true);
  const [showKyc, setShowKyc] = useState(false);
  const [showPayout, setShowPayout] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [b, k] = await Promise.all([
      supabase.from("creator_balances").select("available_cents, pending_cents, lifetime_earned_cents").eq("user_id", user.id).maybeSingle(),
      supabase.from("creator_kyc").select("id, status, review_note").eq("user_id", user.id).maybeSingle(),
    ]);
    if (b.data) setBal(b.data as any);
    setKyc((k.data as any) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  const kycApproved = kyc?.status === "approved";

  return (
    <div className="space-y-4">
      <div className="rounded-3xl p-5 border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/10">
        <div className="flex items-center gap-2 mb-1">
          <Banknote className="h-4 w-4 text-primary" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Creator earnings</p>
        </div>
        <p className="font-display text-4xl font-bold">{loading ? "…" : rupees(bal.available_cents)}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-muted-foreground">Pending payout</p>
            <p className="font-semibold mt-1">{rupees(bal.pending_cents)}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-muted-foreground">Lifetime earned</p>
            <p className="font-semibold mt-1">{rupees(bal.lifetime_earned_cents)}</p>
          </div>
        </div>
      </div>

      {/* KYC status */}
      <div className="rounded-2xl p-4 border border-border bg-card/40">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <ShieldCheck className={`h-5 w-5 mt-0.5 ${kycApproved ? "text-emerald-400" : kyc?.status === "rejected" ? "text-destructive" : "text-muted-foreground"}`} />
            <div className="min-w-0">
              <p className="font-semibold text-sm">KYC verification</p>
              <p className="text-xs text-muted-foreground">
                {!kyc && "Submit your bank & ID details to enable withdrawals."}
                {kyc?.status === "pending" && "Under review by our team."}
                {kyc?.status === "approved" && "Approved — you can request payouts."}
                {kyc?.status === "rejected" && (kyc.review_note ? `Rejected: ${kyc.review_note}` : "Rejected — please re-submit.")}
              </p>
            </div>
          </div>
          {(!kyc || kyc.status === "rejected") && (
            <Button size="sm" onClick={() => setShowKyc(true)}>{kyc?.status === "rejected" ? "Re-submit" : "Start KYC"}</Button>
          )}
          {kyc?.status === "pending" && <Clock className="h-5 w-5 text-amber-400" />}
        </div>
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={!kycApproved || bal.available_cents < 50000}
        onClick={() => setShowPayout(true)}
      >
        Request withdrawal{!kycApproved ? " (KYC required)" : bal.available_cents < 50000 ? " (min ₹500)" : ""}
      </Button>

      {showKyc && <KycModal onClose={() => { setShowKyc(false); load(); }} />}
      {showPayout && <PayoutModal available={bal.available_cents} onClose={() => { setShowPayout(false); load(); }} />}
    </div>
  );
}

function KycModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [pan, setPan] = useState("");
  const [acct, setAcct] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [pbFile, setPbFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!fullName.trim()) return toast.error("Enter your full name");
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.trim().toUpperCase())) return toast.error("Invalid PAN");
    if (!/^[0-9]{6,18}$/.test(acct)) return toast.error("Invalid account number");
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase())) return toast.error("Invalid IFSC");
    if (!idFile || !pbFile) return toast.error("Upload both ID and passbook photos");
    setSaving(true);
    try {
      const upload = async (f: File, label: string) => {
        const ext = f.name.split(".").pop() || "jpg";
        const path = `${user.id}/${label}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("creator-kyc").upload(path, f);
        if (error) throw error;
        return path;
      };
      const [idPath, pbPath] = await Promise.all([upload(idFile, "id"), upload(pbFile, "passbook")]);
      const { error } = await supabase.from("creator_kyc").insert({
        user_id: user.uid,
        full_name: fullName.trim(),
        pan_number: pan.trim().toUpperCase(),
        bank_account_number: acct.trim(),
        bank_ifsc: ifsc.trim().toUpperCase(),
        bank_name: bankName.trim() || null,
        id_photo_url: idPath,
        passbook_photo_url: pbPath,
      });
      // Routing to ver_applications is handled by DB trigger (Phase 1).
      toast.success("KYC submitted — we'll review shortly");
      onClose();
    } catch (e: any) { toast.error(e.message || "Action failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-end sm:place-items-center p-4" onClick={onClose}>
      <div className="bg-card rounded-3xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-3 border border-border" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold">KYC verification</h2>
        <p className="text-xs text-muted-foreground">All details are private and used only to process your payouts.</p>
        <div className="space-y-2">
          <Input placeholder="Full name (as per bank)" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input placeholder="PAN (ABCDE1234F)" value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} maxLength={10} />
          <Input placeholder="Bank account number" value={acct} onChange={(e) => setAcct(e.target.value.replace(/\D/g, ""))} />
          <Input placeholder="IFSC code" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} maxLength={11} />
          <Input placeholder="Bank name (optional)" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          <FileSlot label="Govt ID (Aadhaar / Passport / DL)" file={idFile} onChange={setIdFile} />
          <FileSlot label="Bank passbook / cancelled cheque" file={pbFile} onChange={setPbFile} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Submit</Button>
        </div>
      </div>
    </div>
  );
}

function FileSlot({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File) => void }) {
  return (
    <label className="block rounded-xl border border-dashed border-border p-3 cursor-pointer hover:border-primary/50 transition">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1 text-primary font-semibold">
          <Upload className="h-3.5 w-3.5" /> {file ? "Replace" : "Upload"}
        </span>
      </div>
      {file && <p className="text-[10px] text-muted-foreground mt-1 truncate">{file.name}</p>}
      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />
    </label>
  );
}

function PayoutModal({ available, onClose }: { available: number; onClose: () => void }) {
  const [method, setMethod] = useState<"upi" | "bank">("upi");
  const [upi, setUpi] = useState("");
  const [acct, setAcct] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(Math.floor(available / 100));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const cents = Math.floor(amount * 100);
    if (cents < 50000) return toast.error("Minimum withdrawal is ₹500");
    if (cents > available) return toast.error("Exceeds available balance");
    let detail: any;
    if (method === "upi") {
      if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi.trim())) return toast.error("Invalid UPI ID");
      detail = { upi: upi.trim() };
    } else {
      if (!/^[0-9]{6,18}$/.test(acct)) return toast.error("Invalid account number");
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase())) return toast.error("Invalid IFSC");
      if (!name.trim()) return toast.error("Account holder name required");
      detail = { account_number: acct.trim(), ifsc: ifsc.trim().toUpperCase(), name: name.trim() };
    }
    setSaving(true);
    const { error } = await supabase.from("creator_payout_requests").insert({
      amount_cents: cents,
      method,
      detail,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Withdrawal requested — we'll process within 1–3 business days");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-end sm:place-items-center p-4" onClick={onClose}>
      <div className="bg-card rounded-3xl p-5 max-w-md w-full space-y-3 border border-border" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold">Request withdrawal</h2>
        <p className="text-xs text-muted-foreground">Available: {rupees(available)}</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setMethod("upi")} className={`rounded-xl py-3 text-sm font-semibold border ${method === "upi" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>UPI</button>
          <button onClick={() => setMethod("bank")} className={`rounded-xl py-3 text-sm font-semibold border ${method === "bank" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>Bank transfer</button>
        </div>
        <Input type="number" placeholder="Amount in ₹" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
        {method === "upi" ? (
          <Input placeholder="UPI ID (you@bank)" value={upi} onChange={(e) => setUpi(e.target.value)} />
        ) : (
          <>
            <Input placeholder="Account number" value={acct} onChange={(e) => setAcct(e.target.value.replace(/\D/g, ""))} />
            <Input placeholder="IFSC" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} maxLength={11} />
            <Input placeholder="Account holder name" value={name} onChange={(e) => setName(e.target.value)} />
          </>
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Request</Button>
        </div>
      </div>
    </div>
  );
}
