import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Plus, ShieldCheck, Loader2 } from "lucide-react";
import { useFinCompliance, useCreateFinCompliance, useUpdateFinCompliance } from "@/hooks/admin-os/useFinance";

const sevTone: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-orange-500/10 text-orange-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-slate-500/10 text-slate-600",
};

const ComplianceDashboard = () => {
  const { data, isLoading } = useFinCompliance();
  const create = useCreateFinCompliance();
  const update = useUpdateFinCompliance();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    title: "", framework: "", description: "", severity: "medium", status: "pending", due_on: "",
  });

  const submit = async () => {
    if (!form.title) return;
    const payload: any = { ...form };
    if (!payload.due_on) delete payload.due_on;
    await create.mutateAsync(payload);
    setOpen(false);
    setForm({ title: "", framework: "", description: "", severity: "medium", status: "pending", due_on: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Compliance Dashboard</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Record</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Compliance record</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Framework</Label><Input value={form.framework} onChange={(e) => setForm({ ...form, framework: e.target.value })} placeholder="SOC 2, GDPR..." /></div>
                <div><Label>Due</Label><Input type="date" value={form.due_on} onChange={(e) => setForm({ ...form, due_on: e.target.value })} /></div>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><ShieldCheck className="mx-auto mb-3 h-8 w-8 opacity-50" />No compliance records.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((c: any) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{c.compliance_id}</span>
                    {c.framework && <Badge variant="outline" className="text-[10px]">{c.framework}</Badge>}
                    <Badge className={sevTone[c.severity] ?? ""}>{c.severity}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium truncate">{c.title}</p>
                  {c.due_on && <p className="text-xs text-muted-foreground">Due {c.due_on}</p>}
                </div>
                <Select value={c.status} onValueChange={(v) => update.mutate({ id: c.id, status: v, ...(v === "completed" ? { completed_at: new Date().toISOString() } : {}) })}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComplianceDashboard;
