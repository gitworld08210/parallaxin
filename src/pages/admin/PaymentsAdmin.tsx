import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Upload, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";

const KEYS = ["platform_upi_id", "platform_qr_url", "platform_payee_name"] as const;

const PaymentsAdmin = () => {
  const { user } = useAuth();
  const [upi, setUpi] = useState("");
  const [qr, setQr] = useState("");
  const [payee, setPayee] = useState("Aurelix");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_config").select("key, value").in("key", KEYS as any);
      const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value])) as Record<string, string>;
      setUpi((map.platform_upi_id || "").toString());
      setQr((map.platform_qr_url || "").toString());
      setPayee((map.platform_payee_name || "Aurelix").toString());
      setLoading(false);
    })();
  }, []);

  const uploadQr = async (file: File) => {
    if (!user) return;
    setSaving(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `platform/upi-qr-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setQr(data.publicUrl);
      toast.success("QR uploaded — remember to save");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const save = async () => {
    const cleanUpi = upi.trim();
    if (cleanUpi && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(cleanUpi)) {
      return toast.error("UPI ID looks invalid (example: name@paytm)");
    }
    setSaving(true);
    const rows = [
      { key: "platform_upi_id", value: cleanUpi },
      { key: "platform_qr_url", value: qr.trim() },
      { key: "platform_payee_name", value: payee.trim() || "Aurelix" },
    ];
    const { error } = await supabase.from("app_config").upsert(rows as any, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Payment settings saved");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <QrCode className="h-6 w-6 text-primary" /> Platform UPI / QR
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          All tip payments are collected at this QR. Verified UTRs auto-credit creators' wallets (minus 15% platform fee).
        </p>
      </header>

      <section className="glass rounded-2xl p-5 space-y-4 border border-primary/20">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Payee name</label>
          <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Aurelix" className="mt-1" />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">UPI ID</label>
          <Input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="yourbiz@paytm" className="mt-1" />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">UPI QR image</label>
          <div className="mt-2 flex items-center gap-4">
            {qr ? (
              <img src={qr} alt="Platform QR" className="h-32 w-32 rounded-xl object-contain bg-white p-2" />
            ) : (
              <div className="h-32 w-32 rounded-xl border border-dashed border-border grid place-items-center text-xs text-muted-foreground text-center px-2">
                No QR uploaded
              </div>
            )}
            <div className="flex-1 flex flex-col gap-2">
              <label className="glass-strong rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer w-fit">
                <Upload className="h-4 w-4" /> {qr ? "Replace QR" : "Upload QR"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])} />
              </label>
              {qr && (
                <button onClick={() => setQr("")} className="text-[11px] text-muted-foreground hover:text-foreground text-left">
                  Remove QR
                </button>
              )}
              <p className="text-[10px] text-muted-foreground">PNG or JPG. Use the QR exported from your Paytm Business app.</p>
            </div>
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full" size="lg">
          {saving ? "Saving…" : <><Check className="h-4 w-4 mr-2" /> Save settings</>}
        </Button>
      </section>

      <section className="glass rounded-2xl p-5 space-y-2 border border-border">
        <p className="text-sm font-semibold">How verification works</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          <li>Fan pays your UPI / QR for the exact amount.</li>
          <li>Fan enters the 12-digit UTR from their UPI app.</li>
          <li>System validates format + uniqueness, marks tip verified, credits creator's wallet instantly.</li>
          <li>Creators withdraw via existing payout requests in Creator Hub.</li>
        </ul>
      </section>
    </div>
  );
};

export default PaymentsAdmin;
