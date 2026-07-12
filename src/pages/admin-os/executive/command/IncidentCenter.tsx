import { useIncidents, useSaveIncident, useAddIncidentUpdate, useIncidentTimeline } from "@/hooks/admin-os/useCommandCenter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertOctagon, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const categories = ["security","outage","policy","bug","infrastructure","business"];
const severities = ["low","medium","high","critical"];
const statuses = ["open","investigating","mitigating","resolved","closed"];

const IncidentCenter = () => {
  const { data: rows } = useIncidents();
  const save = useSaveIncident();
  const addUpdate = useAddIncidentUpdate();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const { data: timeline } = useIncidentTimeline(detail?.id);
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState<string | undefined>();
  const [form, setForm] = useState<any>({
    title: "",
    category: "outage",
    severity: "medium",
    status: "open",
    summary: "",
  });

  const submit = async () => {
    if (!form.title) return toast.error("Title required");
    await save.mutateAsync(form);
    toast.success("Incident logged");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Track security, outage, policy, bug, infrastructure and business incidents.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New incident</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New incident</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm({...form, severity: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{severities.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Summary</Label><Textarea value={form.summary} onChange={(e) => setForm({...form, summary: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={save.isPending}>Log</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-5">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left">
            <tr className="border-b border-border/60">
              <th className="py-2">Ref</th><th>Title</th><th>Category</th><th>Severity</th><th>Status</th><th>Detected</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r: any) => (
              <tr
                key={r.id}
                className="border-b border-border/40 last:border-0 cursor-pointer hover:bg-muted/30"
                onClick={() => { setDetail(r); setNextStatus(r.status); }}
              >
                <td className="py-2 text-xs font-mono">{r.reference}</td>
                <td className="font-medium">{r.title}</td>
                <td className="capitalize text-xs">{r.category}</td>
                <td>
                  <Badge variant={r.severity === "critical" ? "destructive" : r.severity === "high" ? "secondary" : "outline"}>
                    {r.severity}
                  </Badge>
                </td>
                <td><Badge variant={r.status === "closed" || r.status === "resolved" ? "default" : "destructive"}>{r.status}</Badge></td>
                <td className="text-xs text-muted-foreground">{new Date(r.detected_at).toLocaleString()}</td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No incidents.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4" /> {detail?.reference} · {detail?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{detail?.category}</Badge>
              <Badge variant={detail?.severity === "critical" ? "destructive" : "outline"}>{detail?.severity}</Badge>
              <Badge>{detail?.status}</Badge>
            </div>
            {detail?.summary && <p className="text-sm">{detail.summary}</p>}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Add update</p>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Status update…" />
              <div className="flex items-center gap-2">
                <Select value={nextStatus} onValueChange={setNextStatus}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Change status" /></SelectTrigger>
                  <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={async () => {
                  if (!note.trim()) return toast.error("Note required");
                  await addUpdate.mutateAsync({ incident_id: detail.id, note, status: nextStatus });
                  setNote("");
                  toast.success("Update posted");
                }}>Post update</Button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Timeline</p>
              <div className="space-y-2">
                {(timeline ?? []).map((t: any) => (
                  <div key={t.id} className="border-l-2 border-primary/40 pl-3">
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString()} {t.status ? `· ${t.status}` : ""}
                    </p>
                    <p className="text-sm">{t.note}</p>
                  </div>
                ))}
                {!timeline?.length && <p className="text-sm text-muted-foreground">No updates yet.</p>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncidentCenter;
