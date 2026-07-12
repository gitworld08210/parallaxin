import {
  useScheduledReports,
  useSaveScheduledReport,
  useDeleteScheduledReport,
  useReportDefinitions,
} from "@/hooks/admin-os/useExecutiveReports";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const freqs = ["daily","weekly","monthly","quarterly","annual","custom"];
const formats = ["pdf","excel","csv","json"];

const ScheduledReports = () => {
  const { data: rows } = useScheduledReports();
  const { data: defs } = useReportDefinitions();
  const save = useSaveScheduledReport();
  const del = useDeleteScheduledReport();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ definition_id: "", name: "", frequency: "weekly", format: "pdf", is_active: true });

  const submit = async () => {
    if (!form.definition_id || !form.name) return toast.error("Definition and name required");
    await save.mutateAsync(form);
    toast.success("Schedule saved");
    setOpen(false);
    setForm({ definition_id: "", name: "", frequency: "weekly", format: "pdf", is_active: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Schedule reports for automatic generation via the scheduler engine.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Schedule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New scheduled report</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Report definition</Label>
                <Select value={form.definition_id} onValueChange={(v) => setForm({...form, definition_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Choose report…" /></SelectTrigger>
                  <SelectContent>{(defs ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={(v) => setForm({...form, frequency: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{freqs.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Format</Label>
                  <Select value={form.format} onValueChange={(v) => setForm({...form, format: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{formats.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {form.frequency === "custom" && (
                <div><Label>Cron expression</Label><Input value={form.cron_expression ?? ""} onChange={(e) => setForm({...form, cron_expression: e.target.value})} placeholder="0 8 * * MON" /></div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({...form, is_active: v})} />
                <span className="text-sm">Active</span>
              </div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={save.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-5">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left">
            <tr className="border-b border-border/60">
              <th className="py-2">Schedule</th><th>Report</th><th>Frequency</th><th>Format</th><th>Next Run</th><th>Active</th><th></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-border/40 last:border-0">
                <td className="py-2 font-medium">{r.name}</td>
                <td>{r.definition?.name ?? "—"}</td>
                <td>{r.frequency}</td>
                <td>{r.format}</td>
                <td className="text-xs text-muted-foreground">{r.next_run_at ? new Date(r.next_run_at).toLocaleString() : "—"}</td>
                <td>{r.is_active ? "Yes" : "No"}</td>
                <td className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No schedules configured.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default ScheduledReports;
