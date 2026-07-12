import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Plus, PiggyBank, Loader2, CheckCircle2 } from "lucide-react";
import { useFinBudgets, useCreateFinBudget, useApproveFinBudget } from "@/hooks/admin-os/useFinance";

const fmt = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n || 0);

const BudgetCenter = () => {
  const { data, isLoading } = useFinBudgets();
  const create = useCreateFinBudget();
  const approve = useApproveFinBudget();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    name: "", period: "monthly", fiscal_year: new Date().getFullYear(),
    allocated_amount: "", currency: "USD", status: "draft", notes: "",
  });

  const submit = async () => {
    if (!form.name || !form.allocated_amount) return;
    await create.mutateAsync({ ...form, allocated_amount: Number(form.allocated_amount), fiscal_year: Number(form.fiscal_year) });
    setOpen(false);
    setForm({ name: "", period: "monthly", fiscal_year: new Date().getFullYear(), allocated_amount: "", currency: "USD", status: "draft", notes: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Budget Center</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Budget</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create budget</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Period</Label>
                  <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Fiscal Year</Label><Input type="number" value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Allocated</Label><Input type="number" value={form.allocated_amount} onChange={(e) => setForm({ ...form, allocated_amount: e.target.value })} /></div>
                <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
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
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><PiggyBank className="mx-auto mb-3 h-8 w-8 opacity-50" />No budgets yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((b: any) => {
            const usage = b.allocated_amount ? Math.min(100, (b.spent_amount / b.allocated_amount) * 100) : 0;
            return (
              <Card key={b.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.period} · FY {b.fiscal_year}</p>
                    </div>
                    <Badge variant={b.status === "approved" ? "default" : "outline"}>{b.status}</Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs">
                      <span>{fmt(b.spent_amount, b.currency)}</span>
                      <span>{fmt(b.allocated_amount, b.currency)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded bg-muted overflow-hidden">
                      <div className={usage > 90 ? "bg-destructive h-full" : "bg-primary h-full"} style={{ width: `${usage}%` }} />
                    </div>
                  </div>
                  {b.status !== "approved" && (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => approve.mutate(b.id)}>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BudgetCenter;
