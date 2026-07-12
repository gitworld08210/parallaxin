import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useReminders, useSaveReminder, useAckReminder, useSnoozeReminder } from "@/hooks/admin-os/useAutomation";

const CATS = ["general", "pending_approvals", "policy_reviews", "department_reports", "audit_reviews", "security_reviews", "employee_probation", "contract_expiry", "certification_expiry", "meeting"];

const RemindersPage = () => {
  const { data = [] } = useReminders();
  const save = useSaveReminder();
  const ack = useAckReminder();
  const snooze = useSnoozeReminder();
  const [form, setForm] = useState<any>({ title: "", description: "", remind_at: "", category: "general", recipient_id: "" });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>New Reminder</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Recipient User ID</Label><Input value={form.recipient_id} onChange={(e) => setForm({ ...form, recipient_id: e.target.value })} /></div>
          <div><Label>Remind At</Label><Input type="datetime-local" value={form.remind_at} onChange={(e) => setForm({ ...form, remind_at: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={() => save.mutate({ ...form, remind_at: new Date(form.remind_at).toISOString() })} disabled={!form.title || !form.remind_at}>Create Reminder</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {data.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="py-4 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{r.title}</p>
                  <Badge variant="outline">{r.category}</Badge>
                  <Badge variant={r.status === "pending" ? "default" : "secondary"}>{r.status}</Badge>
                </div>
                {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">Remind at {new Date(r.remind_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                {r.status !== "acknowledged" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => snooze.mutate({ id: r.id, until: new Date(Date.now() + 3600_000).toISOString() })}>Snooze 1h</Button>
                    <Button size="sm" onClick={() => ack.mutate(r.id)}>Acknowledge</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No reminders.</CardContent></Card>}
      </div>
    </div>
  );
};

export default RemindersPage;
