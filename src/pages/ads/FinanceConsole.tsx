import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Send, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { statusTone } from "./lib";

type Settings = {
  upi_id: string | null;
  payee_name: string | null;
  coins_per_inr: number;
  min_topup_inr: number;
  instructions: string | null;
};

type Req = {
  id: string;
  account_id: string;
  period_start: string;
  period_end: string;
  status: string;
  sent_to_email: string | null;
  note: string | null;
  created_at: string;
};

export default function FinanceConsole() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    upi_id: "",
    payee_name: "",
    coins_per_inr: 1,
    min_topup_inr: 100,
    instructions: "",
  });
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, r] = await Promise.all([
      supabase.from("ads_payment_settings").select("*").maybeSingle(),
      supabase
        .from("ads_invoice_requests")
        .select("id, account_id, period_start, period_end, status, sent_to_email, note, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (s.data) setSettings(s.data as unknown as Settings);
    setRequests((r.data ?? []) as Req[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("ads_payment_settings").upsert({
      id: true,
      upi_id: settings.upi_id,
      payee_name: settings.payee_name,
      coins_per_inr: Number(settings.coins_per_inr) || 1,
      min_topup_inr: Number(settings.min_topup_inr) || 100,
      instructions: settings.instructions,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Payment settings saved");
  };

  const mark = async (r: Req, status: string) => {
    setBusy(r.id);
    const { error } = await supabase
      .from("ads_invoice_requests")
      .update({
        status,
        handled_by: user?.id ?? null,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      })
      .eq("id", r.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">Ads finance console</h1>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3 p-4">
            <h2 className="text-sm font-semibold">Payment settings</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-upi">UPI ID</Label>
                <Input id="f-upi" value={settings.upi_id ?? ""} onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-payee">Payee name</Label>
                <Input id="f-payee" value={settings.payee_name ?? ""} onChange={(e) => setSettings({ ...settings, payee_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-rate">Coins per ₹1</Label>
                <Input id="f-rate" type="number" min={0.1} step={0.1} value={settings.coins_per_inr} onChange={(e) => setSettings({ ...settings, coins_per_inr: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-min">Minimum top-up (₹)</Label>
                <Input id="f-min" type="number" min={1} value={settings.min_topup_inr} onChange={(e) => setSettings({ ...settings, min_topup_inr: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-note">Instructions shown to advertisers</Label>
              <Textarea id="f-note" rows={3} value={settings.instructions ?? ""} onChange={(e) => setSettings({ ...settings, instructions: e.target.value })} />
            </div>
            <Button size="sm" className="gap-1.5" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Invoice requests</h2>
            {requests.length === 0 ? (
              <p className="text-xs text-muted-foreground">Koi request pending nahi.</p>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium tabular-nums">
                        {r.period_start} → {r.period_end}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Account {r.account_id.slice(0, 8)} · {r.sent_to_email ?? "owner email"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusTone(r.status)}>{r.status}</Badge>
                      {r.status !== "sent" && (
                        <Button size="sm" variant="outline" className="gap-1.5" disabled={busy === r.id} onClick={() => mark(r, "sent")}>
                          <Send className="h-3.5 w-3.5" /> Mark sent
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
