import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAutomations, useAutomationSchedules, useSaveSchedule, useDeleteSchedule } from "@/hooks/admin-os/useAutomation";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

const FREQ = ["hourly", "daily", "weekly", "monthly", "quarterly", "yearly", "custom"];

const SchedulesPage = () => {
  const { data: schedules = [] } = useAutomationSchedules();
  const { data: autos = [] } = useAutomations();
  const save = useSaveSchedule();
  const del = useDeleteSchedule();
  const [form, setForm] = useState<any>({ automation_id: "", frequency: "daily", cron_expression: "", timezone: "UTC", is_active: true });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>New Schedule</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <Label>Automation</Label>
            <Select value={form.automation_id} onValueChange={(v) => setForm({ ...form, automation_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{autos.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Frequency</Label>
            <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FREQ.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cron (custom)</Label>
            <Input placeholder="* * * * *" value={form.cron_expression} onChange={(e) => setForm({ ...form, cron_expression: e.target.value })} />
          </div>
          <Button onClick={() => save.mutate(form)} disabled={!form.automation_id}>Add Schedule</Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {schedules.map((s: any) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{s.executive_automations?.name ?? s.automation_id}</p>
                <div className="flex gap-2 mt-1 items-center text-xs text-muted-foreground">
                  <Badge variant="outline">{s.frequency}</Badge>
                  {s.cron_expression && <code>{s.cron_expression}</code>}
                  <span>{s.timezone}</span>
                  <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "active" : "paused"}</Badge>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
        {schedules.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No schedules yet.</CardContent></Card>}
      </div>
    </div>
  );
};

export default SchedulesPage;
