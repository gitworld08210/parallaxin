import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Plus, Receipt, Loader2 } from "lucide-react";
import {
  useFinExpenses, useCreateFinExpense, useApproveExpenseManager, useApproveExpenseFinance,
} from "@/hooks/admin-os/useFinance";

const fmt = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n || 0);

const ExpenseCenter = () => {
  const { data, isLoading } = useFinExpenses();
  const create = useCreateFinExpense();
  const mgrApprove = useApproveExpenseManager();
  const finApprove = useApproveExpenseFinance();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    title: "", description: "", category: "travel", amount: "", currency: "USD", incurred_on: "",
  });

  const filtered = (data ?? []).filter((e: any) => filter === "all" ? true : e.status === filter);

  const submit = async () => {
    if (!form.title || !form.amount) return;
    const payload: any = { ...form, amount: Number(form.amount) };
    if (!payload.incurred_on) delete payload.incurred_on;
    await create.mutateAsync(payload);
    setOpen(false);
    setForm({ title: "", description: "", category: "travel", amount: "", currency: "USD", incurred_on: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Expense Center</h2>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="manager_approved">Manager approved</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Submit Expense</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit an expense</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="meals">Meals</SelectItem>
                        <SelectItem value="software">Software</SelectItem>
                        <SelectItem value="office">Office</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
                </div>
                <div><Label>Incurred on</Label><Input type="date" value={form.incurred_on} onChange={(e) => setForm({ ...form, incurred_on: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Submit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><Receipt className="mx-auto mb-3 h-8 w-8 opacity-50" />No expenses match.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((e: any) => (
            <Card key={e.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{e.expense_id}</span>
                      <Badge variant="outline" className="text-[10px]">{e.category}</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{fmt(Number(e.amount), e.currency)}</p>
                  </div>
                  <Badge>{e.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={e.manager_approved ? "default" : "outline"} className="text-[10px]">Manager {e.manager_approved ? "✓" : "…"}</Badge>
                  <Badge variant={e.finance_approved ? "default" : "outline"} className="text-[10px]">Finance {e.finance_approved ? "✓" : "…"}</Badge>
                  <div className="ml-auto flex gap-2">
                    {!e.manager_approved && <Button size="sm" variant="outline" onClick={() => mgrApprove.mutate(e.id)}>Manager approve</Button>}
                    {e.manager_approved && !e.finance_approved && <Button size="sm" variant="outline" onClick={() => finApprove.mutate(e.id)}>Finance approve</Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseCenter;
