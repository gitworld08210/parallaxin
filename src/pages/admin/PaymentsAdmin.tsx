import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Upload, Check, X, RotateCcw, FileText, Banknote, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";

const KEYS = ["platform_upi_id", "platform_qr_url", "platform_payee_name"] as const;

const rupees = (c: number) => `₹${(c / 100).toLocaleString("en-IN")}`;
const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const SettingsTab = () => {
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
    <div className="space-y-4">
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
              <p className="text-[10px] text-muted-foreground">PNG or JPG from your Paytm Business app.</p>
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
          <li>Fan enters the 12-digit UTR from their UPI app — tip enters review.</li>
          <li>You confirm the payment landed in Paytm Business and Approve the tip — creator wallet is then credited.</li>
          <li>If the UTR is fake or amount mismatches, Reject (or Revoke if already approved).</li>
        </ul>
      </section>
    </div>
  );
};

interface TipRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount_cents: number;
  net_cents: number;
  utr: string | null;
  status: string;
  submitted_at: string | null;
  verified_at: string | null;
  created_at: string;
  sender?: { username: string | null } | null;
  recipient?: { username: string | null } | null;
}

const TipsTab = ({ statusList, title, empty, action }: { statusList: string[]; title: string; empty: string; action: "approve" | "revoke"; }) => {
  const [rows, setRows] = useState<TipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tips")
      .select("id, sender_id, recipient_id, amount_cents, net_cents, utr, status, submitted_at, verified_at, created_at, sender:profiles!tips_sender_id_fkey(username), recipient:profiles!tips_recipient_id_fkey(username)")
      .in("status", statusList)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }, [statusList]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, kind: "approve" | "reject" | "revoke") => {
    let reason: string | null = null;
    if (kind !== "approve") {
      reason = prompt(kind === "reject" ? "Why are you rejecting this tip?" : "Why are you revoking this verified tip?");
      if (!reason) return;
    }
    setBusy(id);
    const fn = kind === "approve" ? "admin_approve_tip" : kind === "reject" ? "admin_reject_tip" : "admin_revoke_tip";
    const args: any = kind === "approve" ? { _tip_id: id } : { _tip_id: id, _reason: reason };
    const { error } = await supabase.rpc(fn as any, args);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(kind === "approve" ? "Tip approved & creator credited" : kind === "reject" ? "Tip rejected" : "Tip revoked");
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button size="sm" variant="ghost" onClick={load}><RotateCcw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
      </div>
      {loading ? (
        <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{empty}</p>
      ) : rows.map((r) => (
        <div key={r.id} className="glass rounded-2xl p-4 border border-border space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-semibold">@{r.sender?.username ?? "—"}</span>
                <span className="text-muted-foreground"> → </span>
                <span className="font-semibold">@{r.recipient?.username ?? "—"}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Submitted {r.submitted_at ? ago(r.submitted_at) : ago(r.created_at)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-bold">{rupees(r.amount_cents)}</p>
              <p className="text-[10px] text-muted-foreground">Creator: {rupees(r.net_cents)}</p>
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs flex items-center justify-between">
            <span className="text-muted-foreground">UTR</span>
            <span className="font-semibold tracking-widest">{r.utr ?? "—"}</span>
          </div>
          <div className="flex gap-2">
            {action === "approve" && (
              <>
                <Button size="sm" variant="outline" disabled={busy === r.id} className="flex-1" onClick={() => act(r.id, "reject")}>
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button size="sm" disabled={busy === r.id} className="flex-1" onClick={() => act(r.id, "approve")}>
                  {busy === r.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Approve
                </Button>
              </>
            )}
            {action === "revoke" && (
              <Button size="sm" variant="destructive" disabled={busy === r.id} className="w-full" onClick={() => act(r.id, "revoke")}>
                {busy === r.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <X className="h-4 w-4 mr-1" />} Revoke & claw back
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

interface KycRow {
  id: string; user_id: string; full_name: string; pan_number: string | null;
  bank_account_number: string; bank_ifsc: string; bank_name: string | null;
  id_photo_url: string; passbook_photo_url: string;
  status: string; review_note: string | null; created_at: string;
  profile?: { username: string | null } | null;
}

const useSignedUrl = (path: string | null) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let cancel = false;
    (async () => {
      const { data } = await supabase.storage.from("kyc-docs").createSignedUrl(path, 600);
      if (!cancel) setUrl(data?.signedUrl ?? null);
    })();
    return () => { cancel = true; };
  }, [path]);
  return url;
};

const KycCard = ({ row, onChange }: { row: KycRow; onChange: () => void }) => {
  const [busy, setBusy] = useState(false);
  const idUrl = useSignedUrl(row.id_photo_url);
  const pbUrl = useSignedUrl(row.passbook_photo_url);
  const act = async (kind: "approve" | "reject") => {
    let reason: string | null = null;
    if (kind === "reject") {
      reason = prompt("Reason (sent to user)");
      if (!reason) return;
    }
    setBusy(true);
    const fn = kind === "approve" ? "admin_approve_kyc" : "admin_reject_kyc";
    const args: any = kind === "approve" ? { _kyc_id: row.id } : { _kyc_id: row.id, _reason: reason };
    const { error } = await supabase.rpc(fn as any, args);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`KYC ${kind === "approve" ? "approved" : "rejected"}`);
    onChange();
  };
  return (
    <div className="glass rounded-2xl p-4 border border-border space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{row.full_name} <span className="text-muted-foreground text-xs">@{row.profile?.username ?? "—"}</span></p>
          <p className="text-[11px] text-muted-foreground">Submitted {ago(row.created_at)} · Status: {row.status}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div><p className="text-muted-foreground">PAN</p><p className="font-mono">{row.pan_number ?? "—"}</p></div>
        <div><p className="text-muted-foreground">Bank</p><p>{row.bank_name ?? "—"}</p></div>
        <div><p className="text-muted-foreground">Account</p><p className="font-mono">{row.bank_account_number}</p></div>
        <div><p className="text-muted-foreground">IFSC</p><p className="font-mono">{row.bank_ifsc}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a href={idUrl ?? "#"} target="_blank" rel="noreferrer" className="block">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">ID photo</p>
          {idUrl ? <img src={idUrl} alt="ID" className="rounded-lg w-full h-32 object-cover bg-muted" /> : <div className="h-32 bg-muted rounded-lg animate-pulse" />}
        </a>
        <a href={pbUrl ?? "#"} target="_blank" rel="noreferrer" className="block">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Passbook</p>
          {pbUrl ? <img src={pbUrl} alt="Passbook" className="rounded-lg w-full h-32 object-cover bg-muted" /> : <div className="h-32 bg-muted rounded-lg animate-pulse" />}
        </a>
      </div>
      {row.status === "pending" && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy} className="flex-1" onClick={() => act("reject")}><X className="h-4 w-4 mr-1" />Reject</Button>
          <Button size="sm" disabled={busy} className="flex-1" onClick={() => act("approve")}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}Approve</Button>
        </div>
      )}
      {row.review_note && <p className="text-[11px] text-muted-foreground">Note: {row.review_note}</p>}
    </div>
  );
};

const KycTab = () => {
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kyc_submissions")
      .select("*, profile:profiles!kyc_submissions_user_id_fkey(username)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!rows.length) return <p className="text-sm text-muted-foreground py-8 text-center">No KYC submissions yet.</p>;
  return <div className="space-y-3">{rows.map((r) => <KycCard key={r.id} row={r} onChange={load} />)}</div>;
};

interface PayoutRow {
  id: string; user_id: string; amount_cents: number; method: string; payout_detail: any;
  status: string; admin_note: string | null; created_at: string;
  profile?: { username: string | null } | null;
}

const PayoutsTab = () => {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payout_requests")
      .select("*, profile:profiles!payout_requests_user_id_fkey(username)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const act = async (id: string, kind: "approve" | "reject") => {
    let note: string | null = null;
    if (kind === "reject") {
      note = prompt("Reason (sent to user)");
      if (!note) return;
    } else {
      note = prompt("Optional reference / note") || null;
    }
    setBusy(id);
    const fn = kind === "approve" ? "admin_approve_payout" : "admin_reject_payout";
    const args: any = kind === "approve" ? { _payout_id: id, _note: note } : { _payout_id: id, _reason: note };
    const { error } = await supabase.rpc(fn as any, args);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Payout ${kind === "approve" ? "marked paid" : "rejected"}`);
    load();
  };
  if (loading) return <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!rows.length) return <p className="text-sm text-muted-foreground py-8 text-center">No payout requests yet.</p>;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="glass rounded-2xl p-4 border border-border space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">@{r.profile?.username ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground">{r.method.toUpperCase()} · {ago(r.created_at)} · {r.status}</p>
            </div>
            <p className="font-display text-lg font-bold">{rupees(r.amount_cents)}</p>
          </div>
          <pre className="text-[11px] bg-muted/40 rounded-lg p-2 overflow-x-auto">{JSON.stringify(r.payout_detail, null, 2)}</pre>
          {r.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={busy === r.id} className="flex-1" onClick={() => act(r.id, "reject")}><X className="h-4 w-4 mr-1" />Reject</Button>
              <Button size="sm" disabled={busy === r.id} className="flex-1" onClick={() => act(r.id, "approve")}>{busy === r.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}Mark paid</Button>
            </div>
          )}
          {r.admin_note && <p className="text-[11px] text-muted-foreground">Note: {r.admin_note}</p>}
        </div>
      ))}
    </div>
  );
};

const PaymentsAdmin = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <QrCode className="h-6 w-6 text-primary" /> Payments
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage platform QR, review fan tips, KYC, and payouts.</p>
      </header>

      <Tabs defaultValue="pending">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="pending"><Clock className="h-3.5 w-3.5 mr-1" />Pending</TabsTrigger>
          <TabsTrigger value="verified"><Check className="h-3.5 w-3.5 mr-1" />Verified</TabsTrigger>
          <TabsTrigger value="kyc"><FileText className="h-3.5 w-3.5 mr-1" />KYC</TabsTrigger>
          <TabsTrigger value="payouts"><Banknote className="h-3.5 w-3.5 mr-1" />Payouts</TabsTrigger>
          <TabsTrigger value="settings"><QrCode className="h-3.5 w-3.5 mr-1" />QR</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <TipsTab statusList={["pending_review", "submitted"]} title="Pending tips" empty="No tips waiting for review." action="approve" />
        </TabsContent>
        <TabsContent value="verified" className="mt-4">
          <TipsTab statusList={["verified"]} title="Recently verified" empty="No verified tips yet." action="revoke" />
        </TabsContent>
        <TabsContent value="kyc" className="mt-4"><KycTab /></TabsContent>
        <TabsContent value="payouts" className="mt-4"><PayoutsTab /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentsAdmin;
