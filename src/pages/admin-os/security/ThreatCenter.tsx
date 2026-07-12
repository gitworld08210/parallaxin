import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ShieldCheck } from "lucide-react";
import { useCreateThreatEvent, useResolveThreat, useThreatEvents } from "@/hooks/admin-os/useSecurity";

const THREAT_TYPES = [
  "brute_force",
  "credential_stuffing",
  "account_takeover",
  "bot_activity",
  "api_abuse",
  "data_leakage",
  "privilege_escalation",
  "suspicious_behaviour",
];

const ThreatCenter = () => {
  const { data: threats = [] } = useThreatEvents();
  const createThreat = useCreateThreatEvent();
  const resolve = useResolveThreat();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ threat_type: "brute_force", severity: "medium", source_ip: "", target_resource: "" });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Log threat</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Threat Event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.threat_type} onValueChange={(v) => setForm({ ...form, threat_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {THREAT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Source IP" value={form.source_ip} onChange={(e) => setForm({ ...form, source_ip: e.target.value })} />
              <Input placeholder="Target resource" value={form.target_resource} onChange={(e) => setForm({ ...form, target_resource: e.target.value })} />
            </div>
            <DialogFooter>
              <Button onClick={async () => { await createThreat.mutateAsync(form); setOpen(false); }}>Log</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Threat Events</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {threats.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-md border border-border/60 p-3 text-sm">
              <div>
                <p className="font-medium capitalize">{t.threat_type.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">{t.threat_code} · {t.severity} · {t.source_ip ?? "unknown IP"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{t.status}</span>
                {t.status !== "resolved" && (
                  <Button size="sm" variant="ghost" onClick={() => resolve.mutate(t.id)}>
                    <ShieldCheck className="mr-1 h-3 w-3" />Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
          {threats.length === 0 && <p className="text-sm text-muted-foreground">No threats detected.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ThreatCenter;
