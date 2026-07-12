import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Loader2, CheckCircle2 } from "lucide-react";
import {
  useFinInvoices, useCreateFinInvoice, useMarkInvoicePaid, useFinVendors,
} from "@/hooks/admin-os/useFinance";

const fmt = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n || 0);

const InvoiceCenter = () => {
  const { data, isLoading } = useFinInvoices();
  const { data: vendors } = useFinVendors();
  const create = useCreateFinInvoice();
  const markPaid = useMarkInvoicePaid();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    vendor_id: "", external_invoice_number: "", amount: "", currency: "USD", issued_on: "", due_on: "", status: "pending", notes: "",
  });

  const submit = async () => {
    if (!form.amount) return;
    const payload: any = { ...form, amount: Number(form.amount) };
    if (!payload.vendor_id) delete payload.vendor_id;
    if (!payload.issued_on) delete payload.issued_on;
    if (!payload.due_on) delete payload.due_on;
    await create.mutateAsync(payload);
    setOpen(false);
    setForm({ vendor_id: "", external_invoice_number: "", amount: "", currency: "USD", issued_on: "", due_on: "", status: "pending", notes: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Invoice Center</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Invoice</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create invoice</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Vendor</Label>
                <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose vendor" /></SelectTrigger>
                  <SelectContent>
                    {(vendors ?? []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>External invoice #</Label><Input value={form.external_invoice_number} onChange={(e) => setForm({ ...form, external_invoice_number: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Issued</Label><Input type="date" value={form.issued_on} onChange={(e) => setForm({ ...form, issued_on: e.target.value })} /></div>
                <div><Label>Due</Label><Input type="date" value={form.due_on} onChange={(e) => setForm({ ...form, due_on: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><FileText className="mx-auto mb-3 h-8 w-8 opacity-50" />No invoices yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((i: any) => {
            const vendor = (vendors ?? []).find((v: any) => v.id === i.vendor_id);
            return (
              <Card key={i.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{i.invoice_id}</span>
                      {i.external_invoice_number && <span className="text-xs text-muted-foreground">#{i.external_invoice_number}</span>}
                    </div>
                    <p className="mt-1 text-sm font-medium">{fmt(Number(i.amount), i.currency)} — {vendor?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Due {i.due_on ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={i.status === "paid" ? "default" : i.status === "overdue" ? "destructive" : "secondary"}>{i.status}</Badge>
                    {i.status !== "paid" && (
                      <Button size="sm" variant="outline" onClick={() => markPaid.mutate(i.id)}>
                        <CheckCircle2 className="mr-1 h-3 w-3" />Paid
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InvoiceCenter;
