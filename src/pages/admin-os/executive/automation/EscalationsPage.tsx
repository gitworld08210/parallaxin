import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAutomationEscalations, useSaveEscalation, useResolveEscalation } from "@/hooks/admin-os/useAutomation";

const SOURCES = ["overdue_approval", "missing_report", "unresolved_incident", "policy_violation", "security_alert", "long_pending_task", "custom"];

const EscalationsPage = () => {
  const { data = [] } = useAutomationEscalations();
  const save = useSaveEscalation();
  const resolve = useResolveEscalation();
  const [form, setForm] = useState<any>({ source_type: "custom", reason: "", level: 1 });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>New Escalation</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Source</Label>
            <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Level</Label>
            <Input type="number" min={1} max={5} value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-2">
            <Label>Reason</Label>
            <Textarea rows={1} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button onClick={() => save.mutate(form)} disabled={!form.reason}>Create Escalation</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {data.map((e: any) => (
          <Card key={e.id}>
            <CardContent className="py-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">L{e.level}</Badge>
                  <Badge variant="outline">{e.source_type}</Badge>
                  <Badge variant={e.status === "open" ? "default" : "secondary"}>{e.status}</Badge>
                </div>
                <p className="text-sm mt-2">{e.reason}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(e.created_at).toLocaleString()}</p>
              </div>
              {e.status === "open" && (
                <Button size="sm" onClick={() => resolve.mutate({ id: e.id })}>Resolve</Button>
              )}
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No escalations.</CardContent></Card>}
      </div>
    </div>
  );
};

export default EscalationsPage;
