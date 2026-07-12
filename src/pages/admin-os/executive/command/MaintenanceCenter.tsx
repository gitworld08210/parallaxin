import { useMaintenanceWindows, useSaveMaintenance, useCancelMaintenance } from "@/hooks/admin-os/useCommandCenter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const kinds = ["scheduled","emergency","department","module"];

const MaintenanceCenter = () => {
  const { data: rows } = useMaintenanceWindows();
  const save = useSaveMaintenance();
  const cancel = useCancelMaintenance();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [form, setForm] = useState<any>({
    kind: "scheduled",
    title: "",
    message: "",
    starts_at: now.toISOString().slice(0, 16),
    ends_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
    status: "scheduled",
  });

  const submit = async () => {
    if (!form.title) return toast.error("Title required");
    await save.mutateAsync({
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
    });
    toast.success("Maintenance saved");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Schedule and communicate maintenance windows across the platform.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Schedule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule maintenance</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Kind</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm({...form, kind: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{kinds.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Target (module / department)</Label><Input value={form.target ?? ""} onChange={(e) => setForm({...form, target: e.target.value})} /></div>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} /></div>
              <div><Label>Message</Label><Textarea value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({...form, starts_at: e.target.value})} /></div>
                <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({...form, ends_at: e.target.value})} /></div>
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
              <th className="py-2">Title</th><th>Kind</th><th>Target</th><th>Window</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-border/40 last:border-0">
                <td className="py-2 font-medium">{r.title}</td>
                <td className="capitalize">{r.kind}</td>
                <td>{r.target ?? "—"}</td>
                <td className="text-xs text-muted-foreground">
                  {new Date(r.starts_at).toLocaleString()} → {new Date(r.ends_at).toLocaleString()}
                </td>
                <td><Badge variant={r.status === "active" ? "default" : r.status === "cancelled" ? "destructive" : "secondary"}>{r.status}</Badge></td>
                <td className="text-right">
                  {r.status !== "cancelled" && r.status !== "completed" && (
                    <Button size="icon" variant="ghost" onClick={() => cancel.mutate(r.id)}><X className="h-4 w-4" /></Button>
                  )}
                </td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No maintenance windows scheduled.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default MaintenanceCenter;
