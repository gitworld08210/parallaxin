import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Coins, FileText, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BuyCoinsSheet } from "@/components/wallet/BuyCoinsSheet";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { useAdsStats } from "@/hooks/ads/useAdsEntities";
import { dateStr, fmtCoins, rangeFor, statusTone } from "@/features/ads/lib";

type InvoiceRequest = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  sent_to_email: string | null;
  note: string | null;
  created_at: string;
};

export default function Billing() {
  const { accountId } = useParams();
  const { user } = useAuth();
  const { balance } = useCoinBalance();
  const [buyOpen, setBuyOpen] = useState(false);
  const range = rangeFor("30d");
  const { totals } = useAdsStats(accountId, range.from, range.to);

  const [requests, setRequests] = useState<InvoiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(dateStr(new Date()));
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!accountId) return;
    setLoading(true);
    const { data } = await supabase
      .from("ads_invoice_requests")
      .select("id, period_start, period_end, status, sent_to_email, note, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    setRequests((data ?? []) as InvoiceRequest[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [accountId]);

  const request = async () => {
    if (!accountId || !user) return;
    setSaving(true);
    const { error } = await supabase.from("ads_invoice_requests").insert({
      account_id: accountId,
      period_start: from,
      period_end: to,
      requested_by: user.id,
      sent_to_email: email || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Invoice request Finance team ko chala gaya");
    setEmail("");
    load();
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Billing</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Wallet balance</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{fmtCoins(balance)}</p>
          <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setBuyOpen(true)}>
            <Coins className="h-3.5 w-3.5" /> Add coins
          </Button>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Spend · last 30 days</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{fmtCoins(totals?.spend_coins ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Impressions · last 30 days</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{(totals?.impressions ?? 0).toLocaleString("en-IN")}</p>
        </Card>
      </div>

      <Card className="mt-4 space-y-3 p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Request a GST tax invoice</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="b-from">From</Label>
            <Input id="b-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-to">To</Label>
            <Input id="b-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="b-email">Send invoice to (optional)</Label>
            <Input id="b-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="accounts@company.com" />
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={request} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Request invoice
        </Button>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">Invoice history</h2>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : requests.length === 0 ? (
          <p className="text-xs text-muted-foreground">No invoice requests found.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium tabular-nums">
                    {r.period_start} → {r.period_end}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{r.sent_to_email ?? "Account owner email"}</p>
                </div>
                <Badge variant="outline" className={statusTone(r.status)}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <BuyCoinsSheet open={buyOpen} onOpenChange={setBuyOpen} />
    </div>
  );
}
