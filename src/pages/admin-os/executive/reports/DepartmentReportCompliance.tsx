import { usePeriodicReports, useReportCompliance, useSubmitPeriodicReport, useReopenPeriodicReport, useSavePeriodicReport } from "@/hooks/admin-os/useExecutiveReports";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Send, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const cadences = ["weekly","monthly","quarterly","annual","custom"];

const useDepartments = () =>
  useQuery({
    queryKey: ["admin-departments-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_departments").select("id,name,code");
      if (error) throw error;
      return data ?? [];
    },
  });

const DepartmentReportCompliance = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: reports } = usePeriodicReports({ status: statusFilter && statusFilter !== "all" ? statusFilter : undefined });
  const { data: compliance } = useReportCompliance();
  const { data: depts } = useDepartments();
  const save = useSavePeriodicReport();
  const submit = useSubmitPeriodicReport();
  const reopen = useReopenPeriodicReport();

  const [open, setOpen] = useState(false);
  const [reopenId, setReopenId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [form, setForm] = useState<any>({
    department_id: "",
    cadence: "weekly",
    title: "",
    period_start: new Date().toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    summary: "",
  });

  const submitNew = async () => {
    if (!form.department_id || !form.title) return toast.error("Department and title required");
    await save.mutateAsync(form);
    toast.success("Report drafted");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="font-semibold mb-3">Compliance overview</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(compliance ?? []).map((c: any) => (
            <div key={c.department_id} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.department}</span>
                <Badge variant={c.compliance >= 80 ? "default" : c.compliance >= 50 ? "secondary" : "destructive"}>{c.compliance}%</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {c.submitted}/{c.total} submitted · {c.overdue} overdue · {c.pending} pending
              </p>
              <div className="mt-2 h-1.5 rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${c.compliance}%` }} />
              </div>
            </div>
          ))}
          {!compliance?.length && <p className="text-sm text-muted-foreground">No periodic reports tracked yet.</p>}
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="reopened">Reopened</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New periodic report</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New periodic report</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Department</Label>
                <Select value={form.department_id} onValueChange={(v) => setForm({...form, department_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Choose department…" /></SelectTrigger>
                  <SelectContent>{(depts ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cadence</Label>
                  <Select value={form.cadence} onValueChange={(v) => setForm({...form, cadence: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{cadences.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Period start</Label><Input type="date" value={form.period_start} onChange={(e) => setForm({...form, period_start: e.target.value})} /></div>
                <div><Label>Period end</Label><Input type="date" value={form.period_end} onChange={(e) => setForm({...form, period_end: e.target.value})} /></div>
                <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({...form, due_date: e.target.value})} /></div>
              </div>
              <div><Label>Summary</Label><Textarea value={form.summary} onChange={(e) => setForm({...form, summary: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={submitNew} disabled={save.isPending}>Save draft</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-5">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left">
            <tr className="border-b border-border/60">
              <th className="py-2">Department</th><th>Title</th><th>Cadence</th><th>Period</th><th>Due</th><th>Status</th><th>Rev</th><th></th>
            </tr>
          </thead>
          <tbody>
            {(reports ?? []).map((r: any) => {
              const overdue = r.status !== "submitted" && new Date(r.due_date) < new Date();
              return (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 font-medium">{r.department?.name ?? "—"}</td>
                  <td>{r.title}</td>
                  <td className="capitalize">{r.cadence}</td>
                  <td className="text-xs text-muted-foreground">{r.period_start} → {r.period_end}</td>
                  <td className="text-xs">{r.due_date}</td>
                  <td>
                    <Badge variant={
                      r.status === "submitted" ? "default"
                      : overdue ? "destructive"
                      : r.status === "reopened" ? "secondary" : "outline"
                    }>{overdue && r.status !== "submitted" ? "overdue" : r.status}</Badge>
                  </td>
                  <td className="text-xs text-muted-foreground">{r.revision}</td>
                  <td className="text-right space-x-1">
                    {r.status !== "submitted" ? (
                      <Button size="sm" variant="outline" onClick={async () => { await submit.mutateAsync(r.id); toast.success("Submitted"); }}>
                        <Send className="h-3 w-3 mr-1" /> Submit
                      </Button>
                    ) : (
                      <Dialog open={reopenId === r.id} onOpenChange={(v) => { if (!v) { setReopenId(null); setReopenReason(""); } }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => setReopenId(r.id)}>
                            <Undo2 className="h-3 w-3 mr-1" /> Reopen
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Reopen for revision</DialogTitle></DialogHeader>
                          <Textarea placeholder="Reason for reopening…" value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
                          <DialogFooter>
                            <Button onClick={async () => {
                              if (!reopenReason.trim()) return toast.error("Reason required");
                              await reopen.mutateAsync({ id: r.id, reason: reopenReason });
                              toast.success("Report reopened");
                              setReopenId(null);
                              setReopenReason("");
                            }}>Reopen</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </td>
                </tr>
              );
            })}
            {!reports?.length && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No periodic reports yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default DepartmentReportCompliance;
