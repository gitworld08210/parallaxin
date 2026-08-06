import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Ban, Coins, Download, FileText, Loader2, Mail, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type CoinTopup = {
  id: string;
  user_id: string;
  coins: number;
  amount_inr_cents: number;
  status: string;
  utr: string | null;
  submitted_at: string | null;
};

type CreditApplication = {
  id: string;
  advertiser_id: string;
  requested_limit: number;
  requested_cycle: string;
  currency: string;
  reason: string | null;
  status: string;
  created_at: string;
};

type Advertiser = { id: string; display_name: string; legal_name: string | null };
type Invoice = {
  id: string;
  advertiser_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  issued_at: string | null;
  due_at: string | null;
};

export default function PaymentOperations() {
  const [topups, setTopups] = useState<CoinTopup[]>([]);
  const [applications, setApplications] = useState<CreditApplication[]>([]);
  const [advertisers, setAdvertisers] = useState<Record<string, Advertiser>>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [limits, setLimits] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [topupRes, creditRes, invoiceRes] = await Promise.all([
      supabase
        .from("coin_topup_requests")
        .select("id,user_id,coins,amount_inr_cents,status,utr,submitted_at")
        .order("submitted_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("aap_credit_applications")
        .select("id,advertiser_id,requested_limit,requested_cycle,currency,reason,status,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("aap_invoices")
        .select("id,advertiser_id,invoice_number,period_start,period_end,subtotal,tax,total,currency,status,issued_at,due_at")
        .order("created_at", { ascending: false }),
    ]);

    if (topupRes.error || creditRes.error || invoiceRes.error) {
      toast.error(topupRes.error?.message || creditRes.error?.message || invoiceRes.error?.message || "Finance queues load nahi hui");
      setLoading(false);
      return;
    }

    const creditRows = (creditRes.data ?? []) as CreditApplication[];
    const invoiceRows = (invoiceRes.data ?? []) as Invoice[];
    const advertiserIds = [...new Set([...creditRows.map((row) => row.advertiser_id), ...invoiceRows.map((row) => row.advertiser_id)])];
    let advertiserMap: Record<string, Advertiser> = {};
    if (advertiserIds.length > 0) {
      const { data } = await supabase
        .from("aap_advertisers")
        .select("id,display_name,legal_name")
        .in("id", advertiserIds);
      advertiserMap = Object.fromEntries(((data ?? []) as Advertiser[]).map((row) => [row.id, row]));
    }

    setTopups((topupRes.data ?? []) as CoinTopup[]);
    setApplications(creditRows);
    setInvoices(invoiceRows);
    setAdvertisers(advertiserMap);
    setLimits(Object.fromEntries(creditRows.map((row) => [row.id, String(row.requested_limit)])));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const reviewTopup = async (id: string, decision: "approved" | "rejected") => {
    setBusy(id);
    try {
      const { error } = await supabase.rpc("finance_review_coin_topup", {
        _topup_id: id,
        _decision: decision,
        _note: notes[id]?.trim() || null,
      });
      if (error) throw error;
      toast.success(decision === "approved" ? "Coins credit kar diye gaye" : "Top-up reject ho gaya");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Top-up review nahi hua");
    } finally {
      setBusy(null);
    }
  };

  const reviewCredit = async (row: CreditApplication, decision: "approved" | "rejected") => {
    setBusy(row.id);
    const approvedLimit = Number(limits[row.id] ?? row.requested_limit);
    const { error } = decision === "approved"
      ? await supabase.rpc("aap_finance_approve_credit", {
          _application_id: row.id,
          _approved_limit: approvedLimit,
          _approved_cycle: row.requested_cycle,
          _risk_level: "medium",
          _security_deposit: 0,
          _payment_method: "bank_transfer",
          _autopay: false,
          _notes: notes[row.id]?.trim() || "Approved by Finance",
        })
      : await supabase.rpc("aap_finance_reject_credit", {
          _application_id: row.id,
          _notes: notes[row.id]?.trim() || "Rejected by Finance",
        });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Credit application ${decision}`);
    load();
  };

  const generateInvoice = async (advertiserId: string) => {
    setBusy(`invoice-${advertiserId}`);
    const { data, error } = await supabase.functions.invoke("aap-generate-invoices", {
      body: { advertiser_id: advertiserId, force: true },
    });
    setBusy(null);
    if (error || data?.error) return toast.error(error?.message || data?.error || "Invoice generate nahi hua");
    toast.success(data?.invoice_number ? `Invoice ${data.invoice_number} generated` : "Invoice generated");
    load();
  };

  const sendInvoice = async (invoice: Invoice) => {
    setBusy(`send-${invoice.id}`);
    const { data, error } = await supabase.functions.invoke("aap-generate-invoices", { body: { invoice_id: invoice.id } });
    setBusy(null);
    if (error || data?.error || data?.emailed === false) return toast.error(error?.message || data?.error || "Invoice email nahi hua");
    toast.success(`Invoice ${invoice.invoice_number} ${data?.recipient ? `sent to ${data.recipient}` : "sent"}`);
  };

  const downloadInvoice = async (invoice: Invoice) => {
    setBusy(`download-${invoice.id}`);
    const { data: lines, error } = await supabase
      .from("aap_invoice_lines")
      .select("description,quantity,unit_price,amount")
      .eq("invoice_id", invoice.id)
      .order("created_at");
    setBusy(null);
    if (error) return toast.error(error.message);
    const advertiser = advertisers[invoice.advertiser_id];
    const money = (value: number) => `${invoice.currency} ${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const rows = (lines ?? []).map((line) => `<tr><td>${escapeHtml(line.description)}</td><td>${Number(line.quantity)}</td><td>${money(Number(line.unit_price))}</td><td>${money(Number(line.amount))}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(invoice.invoice_number)}</title><style>body{font-family:Arial,sans-serif;color:#172033;padding:40px;max-width:900px;margin:auto}header{display:flex;justify-content:space-between;border-bottom:3px solid #172033;padding-bottom:20px}h1{margin:0;font-size:30px}small{color:#667085}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{padding:11px;border-bottom:1px solid #d0d5dd;text-align:left}th{background:#f2f4f7}.summary{margin:28px 0 0 auto;width:320px}.summary p{display:flex;justify-content:space-between}.total{font-size:20px;font-weight:700;border-top:2px solid #172033;padding-top:12px}@media print{button{display:none}body{padding:0}}</style></head><body><header><div><h1>AURELIX ADS</h1><small>Tax Invoice</small></div><div><strong>${escapeHtml(invoice.invoice_number)}</strong><br><small>Issued ${invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString("en-IN") : "—"}</small></div></header><h2>Bill to</h2><p>${escapeHtml(advertiser?.legal_name || advertiser?.display_name || "Advertiser")}</p><p><small>Billing period: ${invoice.period_start} – ${invoice.period_end}</small></p><table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No line items</td></tr>'}</tbody></table><div class="summary"><p><span>Subtotal</span><span>${money(invoice.subtotal)}</span></p><p><span>GST</span><span>${money(invoice.tax)}</span></p><p class="total"><span>Total</span><span>${money(invoice.total)}</span></p></div><p><small>This is a computer-generated invoice.</small></p><button onclick="window.print()">Download / Print PDF</button><script>window.onload=()=>window.print()</script></body></html>`;
    const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const popup = window.open(blobUrl, "_blank", "noopener,noreferrer");
    if (!popup) toast.error("Popup blocked—browser me popups allow karke dobara try karein");
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  const pendingTopups = topups.filter((row) => row.status === "pending_review");
  const pendingCredits = applications.filter((row) => ["pending", "under_review"].includes(row.status));
  const approvedCredits = applications.filter((row) => row.status === "approved");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Payment Operations</h2>
          <p className="text-sm text-muted-foreground">Coin verification, postpaid credit aur advertiser invoices.</p>
        </div>
        <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh queues">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Tabs defaultValue="coins">
        <TabsList className="w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="coins">Coin top-ups ({pendingTopups.length})</TabsTrigger>
          <TabsTrigger value="credit">Postpaid credit ({pendingCredits.length})</TabsTrigger>
          <TabsTrigger value="invoices">Advertiser invoices ({approvedCredits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="coins" className="space-y-3 pt-2">
          {loading ? <Loading /> : pendingTopups.length === 0 ? <Empty text="No coin top-ups awaiting review." /> : pendingTopups.map((row) => (
            <Card key={row.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base"><Coins className="h-4 w-4 text-primary" />{row.coins.toLocaleString("en-IN")} coins</CardTitle>
                  <Badge variant="secondary">₹{(row.amount_inr_cents / 100).toLocaleString("en-IN")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="text-muted-foreground">UTR:</span> <span className="font-mono font-semibold">{row.utr}</span></p>
                  <p><span className="text-muted-foreground">Submitted:</span> {row.submitted_at ? new Date(row.submitted_at).toLocaleString("en-IN") : "—"}</p>
                </div>
                <Textarea placeholder="Finance note (optional)" value={notes[row.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))} />
                <div className="flex gap-2">
                  <Button onClick={() => reviewTopup(row.id, "approved")} disabled={busy === row.id}><BadgeCheck className="mr-2 h-4 w-4" />Verify & credit</Button>
                  <Button variant="destructive" onClick={() => reviewTopup(row.id, "rejected")} disabled={busy === row.id}><Ban className="mr-2 h-4 w-4" />Reject</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="credit" className="space-y-3 pt-2">
          {loading ? <Loading /> : pendingCredits.length === 0 ? <Empty text="No postpaid applications awaiting review." /> : pendingCredits.map((row) => {
            const advertiser = advertisers[row.advertiser_id];
            return (
              <Card key={row.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{advertiser?.legal_name || advertiser?.display_name || "Advertiser"}</CardTitle>
                    <Badge variant="secondary">{row.requested_cycle} cycle</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{row.reason || "No reason provided"}</p>
                  <div className="space-y-1.5">
                    <Label htmlFor={`limit-${row.id}`}>Approved limit ({row.currency})</Label>
                    <Input id={`limit-${row.id}`} type="number" min="0" value={limits[row.id] ?? ""} onChange={(event) => setLimits((current) => ({ ...current, [row.id]: event.target.value }))} />
                  </div>
                  <Textarea placeholder="Review note" value={notes[row.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))} />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => reviewCredit(row, "approved")} disabled={busy === row.id || Number(limits[row.id]) <= 0}><BadgeCheck className="mr-2 h-4 w-4" />Approve credit</Button>
                    <Button variant="destructive" onClick={() => reviewCredit(row, "rejected")} disabled={busy === row.id}><Ban className="mr-2 h-4 w-4" />Reject</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-3 pt-2">
          {loading ? <Loading /> : approvedCredits.length === 0 ? <Empty text="Approve a postpaid account before generating its invoice." /> : approvedCredits.map((row) => {
            const advertiser = advertisers[row.advertiser_id];
            return (
              <Card key={row.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{advertiser?.legal_name || advertiser?.display_name || "Advertiser"}</p>
                    <p className="text-sm text-muted-foreground">Approved limit: {row.currency} {Number(row.requested_limit).toLocaleString("en-IN")}</p>
                  </div>
                  <Button variant="outline" onClick={() => generateInvoice(row.advertiser_id)} disabled={busy === `invoice-${row.advertiser_id}`}>
                    {busy === `invoice-${row.advertiser_id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Generate & email invoice
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {invoices.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold">Generated invoices</h3>
              {invoices.map((invoice) => {
                const advertiser = advertisers[invoice.advertiser_id];
                return (
                  <Card key={invoice.id}>
                    <CardContent className="space-y-3 p-4 sm:flex sm:items-center sm:justify-between sm:space-y-0">
                      <div>
                        <p className="font-semibold">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">{advertiser?.legal_name || advertiser?.display_name || "Advertiser"} · {invoice.currency} {Number(invoice.total).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-muted-foreground">{invoice.period_start} – {invoice.period_end}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => downloadInvoice(invoice)} disabled={busy === `download-${invoice.id}`}>
                          {busy === `download-${invoice.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download PDF
                        </Button>
                        <Button size="sm" onClick={() => sendInvoice(invoice)} disabled={busy === `send-${invoice.id}`}>
                          {busy === `send-${invoice.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Send email
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function Loading() {
  return <div className="grid place-items-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
}

function Empty({ text }: { text: string }) {
  return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{text}</CardContent></Card>;
}