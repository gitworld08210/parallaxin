import { useEmergencyEvents, useActivateEmergency, useEndEmergency, useActiveEmergency } from "@/hooks/admin-os/useCommandCenter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const EmergencyPanel = () => {
  const { data: events } = useEmergencyEvents();
  const { data: active } = useActiveEmergency();
  const activate = useActivateEmergency();
  const end = useEndEmergency();
  const [open, setOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [endReason, setEndReason] = useState("");
  const [form, setForm] = useState<any>({
    mode: "emergency",
    reason: "",
    expected_duration_minutes: 60,
    effects: { read_only: false, disable_new_logins: false, force_logout: false, disable_modules: [] },
  });

  const submit = async () => {
    if (!form.reason.trim()) return toast.error("Reason required");
    await activate.mutateAsync(form);
    toast.success("Emergency mode activated");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card className={`p-5 ${active ? "border-red-500/40 bg-red-500/5" : ""}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className={`h-5 w-5 ${active ? "text-red-500" : "text-muted-foreground"}`} />
              <h2 className="font-semibold">Emergency Mode</h2>
            </div>
            {active ? (
              <div className="mt-2 text-sm">
                <p className="font-medium">{active.reason}</p>
                <p className="text-xs text-muted-foreground">
                  Activated {new Date(active.activated_at).toLocaleString()}
                  {active.expected_duration_minutes ? ` · expected ${active.expected_duration_minutes}m` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(active.effects as any)?.read_only && <Badge variant="destructive">Read-only</Badge>}
                  {(active.effects as any)?.disable_new_logins && <Badge variant="destructive">No new logins</Badge>}
                  {(active.effects as any)?.force_logout && <Badge variant="destructive">Force logout</Badge>}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No active emergency. All systems operating normally.</p>
            )}
          </div>
          {active ? (
            <Dialog open={endOpen} onOpenChange={setEndOpen}>
              <DialogTrigger asChild><Button variant="destructive">End emergency</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>End emergency mode</DialogTitle></DialogHeader>
                <Textarea placeholder="Reason for ending…" value={endReason} onChange={(e) => setEndReason(e.target.value)} />
                <DialogFooter>
                  <Button onClick={async () => {
                    if (!endReason.trim()) return toast.error("Reason required");
                    await end.mutateAsync({ id: active.id, end_reason: endReason });
                    toast.success("Emergency ended");
                    setEndOpen(false);
                    setEndReason("");
                  }}>Confirm end</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button variant="destructive">Activate emergency</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Activate emergency mode</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Mode</Label>
                    <Select value={form.mode} onValueChange={(v) => setForm({...form, mode: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="elevated">Elevated alert</SelectItem>
                        <SelectItem value="drill">Drill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} /></div>
                  <div><Label>Expected duration (minutes)</Label><Input type="number" value={form.expected_duration_minutes} onChange={(e) => setForm({...form, expected_duration_minutes: Number(e.target.value)})} /></div>
                  <div className="space-y-2 rounded-lg border border-border/60 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Effects</p>
                    {[
                      { key: "read_only", label: "Read-only mode" },
                      { key: "disable_new_logins", label: "Disable new logins" },
                      { key: "force_logout", label: "Force logout of all sessions" },
                      { key: "restrict_critical_ops", label: "Restrict critical operations" },
                    ].map((e) => (
                      <div key={e.key} className="flex items-center justify-between text-sm">
                        <span>{e.label}</span>
                        <Switch
                          checked={!!form.effects?.[e.key]}
                          onCheckedChange={(v) => setForm({...form, effects: {...form.effects, [e.key]: v}})}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter><Button variant="destructive" onClick={submit} disabled={activate.isPending}>Activate</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">History</h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left">
            <tr className="border-b border-border/60">
              <th className="py-2">Mode</th><th>Reason</th><th>Activated</th><th>Ended</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((e: any) => (
              <tr key={e.id} className="border-b border-border/40 last:border-0">
                <td className="py-2 capitalize">{e.mode}</td>
                <td className="max-w-xs truncate">{e.reason}</td>
                <td className="text-xs text-muted-foreground">{new Date(e.activated_at).toLocaleString()}</td>
                <td className="text-xs text-muted-foreground">{e.ended_at ? new Date(e.ended_at).toLocaleString() : "—"}</td>
                <td><Badge variant={e.status === "active" ? "destructive" : "outline"}>{e.status}</Badge></td>
              </tr>
            ))}
            {!events?.length && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No emergency events recorded.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default EmergencyPanel;
