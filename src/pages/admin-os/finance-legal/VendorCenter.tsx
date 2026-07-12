import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Plus, Building2, Loader2 } from "lucide-react";
import { useFinVendors, useCreateFinVendor } from "@/hooks/admin-os/useFinance";

const riskTone: Record<string, string> = {
  low: "bg-green-500/10 text-green-600",
  medium: "bg-amber-500/10 text-amber-600",
  high: "bg-destructive/10 text-destructive",
};

const VendorCenter = () => {
  const { data, isLoading } = useFinVendors();
  const create = useCreateFinVendor();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    name: "", category: "", contact_email: "", contact_phone: "", tax_id: "",
    status: "active", risk_level: "low", notes: "",
  });

  const submit = async () => {
    if (!form.name) return;
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ name: "", category: "", contact_email: "", contact_phone: "", tax_id: "", status: "active", risk_level: "low", notes: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vendor Center</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Vendor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add vendor</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="SaaS, Legal, ..." /></div>
                <div><Label>Tax ID</Label><Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
              </div>
              <div>
                <Label>Risk level</Label>
                <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><Building2 className="mx-auto mb-3 h-8 w-8 opacity-50" />No vendors yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((v: any) => (
            <Card key={v.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">{v.vendor_id}</p>
                    <p className="font-semibold">{v.name}</p>
                    {v.category && <p className="text-xs text-muted-foreground">{v.category}</p>}
                  </div>
                  <Badge className={riskTone[v.risk_level] ?? ""}>risk: {v.risk_level}</Badge>
                </div>
                {v.contact_email && <p className="text-xs text-muted-foreground truncate">{v.contact_email}</p>}
                <div className="flex gap-2">
                  <Badge variant="outline">{v.status}</Badge>
                  {v.performance_rating && <Badge variant="secondary">★ {v.performance_rating}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorCenter;
