import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Plus, FileCheck, Loader2 } from "lucide-react";
import { useFinContracts, useCreateFinContract, useUpdateFinContract } from "@/hooks/admin-os/useFinance";

const STAGES = ["draft", "legal_review", "executive_review", "approved", "signed", "active", "expired", "archived"];

const ContractCenter = () => {
  const { data, isLoading } = useFinContracts();
  const create = useCreateFinContract();
  const update = useUpdateFinContract();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    title: "", counterparty: "", contract_type: "general", status: "draft", value: "", currency: "USD",
    start_date: "", end_date: "", notes: "",
  });

  const submit = async () => {
    if (!form.title || !form.counterparty) return;
    const payload: any = { ...form };
    if (payload.value) payload.value = Number(payload.value); else delete payload.value;
    if (!payload.start_date) delete payload.start_date;
    if (!payload.end_date) delete payload.end_date;
    await create.mutateAsync(payload);
    setOpen(false);
    setForm({ title: "", counterparty: "", contract_type: "general", status: "draft", value: "", currency: "USD", start_date: "", end_date: "", notes: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contract Center</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Contract</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Draft contract</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Counterparty</Label><Input value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="msa">MSA</SelectItem>
                      <SelectItem value="nda">NDA</SelectItem>
                      <SelectItem value="sow">SOW</SelectItem>
                      <SelectItem value="employment">Employment</SelectItem>
                      <SelectItem value="license">License</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Value</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
                <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Draft</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><FileCheck className="mx-auto mb-3 h-8 w-8 opacity-50" />No contracts yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{c.contract_id}</span>
                      <Badge variant="outline" className="text-[10px]">{c.contract_type}</Badge>
                      <Badge variant="secondary" className="text-[10px]">v{c.current_version}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.counterparty} · {c.start_date ?? "?"} → {c.end_date ?? "?"}</p>
                  </div>
                  <Select value={c.status} onValueChange={(v) => update.mutate({ id: c.id, status: v, ...(v === "signed" ? { signed_at: new Date().toISOString() } : {}) })}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContractCenter;
