import { useBroadcasts, useSaveBroadcast, useSendBroadcast, useBroadcastDeliveries } from "@/hooks/admin-os/useCommandCenter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Plus, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const BroadcastCenter = () => {
  const { data: rows } = useBroadcasts();
  const save = useSaveBroadcast();
  const send = useSendBroadcast();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const { data: deliveries } = useBroadcastDeliveries(detail ?? undefined);
  const [form, setForm] = useState<any>({
    title: "",
    body: "",
    audience: { type: "company" },
    delivery: "immediate",
    require_ack: false,
  });

  const submit = async () => {
    if (!form.title) return toast.error("Title required");
    await save.mutateAsync(form);
    toast.success("Broadcast queued");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Send global notifications with audience targeting and delivery tracking.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New broadcast</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New broadcast</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} /></div>
              <div><Label>Body</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({...form, body: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Audience</Label>
                  <Select value={form.audience.type} onValueChange={(v) => setForm({...form, audience: { type: v }})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Entire company</SelectItem>
                      <SelectItem value="department">Department(s)</SelectItem>
                      <SelectItem value="role">Role(s)</SelectItem>
                      <SelectItem value="level">Level(s)</SelectItem>
                      <SelectItem value="employees">Specific employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Delivery</Label>
                  <Select value={form.delivery} onValueChange={(v) => setForm({...form, delivery: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.delivery === "scheduled" && (
                <div><Label>Scheduled for</Label><Input type="datetime-local" value={form.scheduled_for ?? ""} onChange={(e) => setForm({...form, scheduled_for: e.target.value})} /></div>
              )}
              <div><Label>Expires (optional)</Label><Input type="datetime-local" value={form.expires_at ?? ""} onChange={(e) => setForm({...form, expires_at: e.target.value})} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.require_ack} onCheckedChange={(v) => setForm({...form, require_ack: v})} />
                <span className="text-sm">Require acknowledgement</span>
              </div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={save.isPending}>Queue</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-5">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left">
            <tr className="border-b border-border/60">
              <th className="py-2">Title</th><th>Audience</th><th>Delivery</th><th>Status</th><th>Created</th><th></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-border/40 last:border-0">
                <td className="py-2 font-medium">{r.title}</td>
                <td className="text-xs">{(r.audience as any)?.type ?? "company"}</td>
                <td className="text-xs">{r.delivery}</td>
                <td><Badge variant={r.status === "sent" ? "default" : "outline"}>{r.status}</Badge></td>
                <td className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => setDetail(r.id)}><Eye className="h-4 w-4" /></Button>
                  {r.status !== "sent" && (
                    <Button size="sm" onClick={async () => { await send.mutateAsync(r.id); toast.success("Broadcast sent"); }}>
                      <Send className="h-3 w-3 mr-1" /> Send
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No broadcasts.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!detail} onOpenChange={(v) => { if (!v) setDetail(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delivery tracking</DialogTitle></DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-1 text-sm">
            {(deliveries ?? []).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between border-b border-border/40 pb-1">
                <span className="text-xs font-mono">{d.user_id.slice(0, 8)}…</span>
                <Badge variant={d.status === "acknowledged" ? "default" : d.status === "delivered" ? "secondary" : "outline"}>{d.status}</Badge>
              </div>
            ))}
            {!deliveries?.length && <p className="text-muted-foreground">No deliveries yet.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BroadcastCenter;
