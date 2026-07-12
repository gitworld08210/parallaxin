import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Plus, ShoppingCart, Loader2 } from "lucide-react";
import { useFinPurchaseOrders, useCreateFinPO, useUpdateFinPO, useFinVendors } from "@/hooks/admin-os/useFinance";

const fmt = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n || 0);

const ProcurementCenter = () => {
  const { data, isLoading } = useFinPurchaseOrders();
  const { data: vendors } = useFinVendors();
  const create = useCreateFinPO();
  const update = useUpdateFinPO();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    vendor_id: "", title: "", description: "", amount: "", currency: "USD", status: "draft",
  });

  const submit = async () => {
    if (!form.title || !form.amount) return;
    const payload: any = { ...form, amount: Number(form.amount) };
    if (!payload.vendor_id) delete payload.vendor_id;
    await create.mutateAsync(payload);
    setOpen(false);
    setForm({ vendor_id: "", title: "", description: "", amount: "", currency: "USD", status: "draft" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Procurement — Purchase Orders</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New PO</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create purchase order</DialogTitle></DialogHeader>
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
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
              </div>
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
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><ShoppingCart className="mx-auto mb-3 h-8 w-8 opacity-50" />No purchase orders.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((p: any) => {
            const vendor = (vendors ?? []).find((v: any) => v.id === p.vendor_id);
            return (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-muted-foreground">{p.po_id}</p>
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{fmt(Number(p.amount), p.currency)} · {vendor?.name ?? "—"}</p>
                  </div>
                  <Select value={p.status} onValueChange={(v) => update.mutate({ id: p.id, status: v, ...(v === "approved" ? { approved_at: new Date().toISOString() } : {}) })}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge>{p.status}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProcurementCenter;
