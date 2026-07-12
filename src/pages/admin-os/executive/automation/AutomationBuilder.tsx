import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAutomation, useSaveAutomation } from "@/hooks/admin-os/useAutomation";

const TRIGGERS = ["schedule", "date_time", "workflow_event", "status_change", "approval_event", "employee_event", "department_event", "report_due", "security_event", "api"];
const ACTIONS = ["send_notification", "send_email", "create_task", "generate_report", "escalate_request", "assign_reviewer", "open_workflow", "close_workflow", "schedule_followup", "archive_record"];
const CATEGORIES = ["general", "hr", "security", "finance", "support", "verification", "founder_office", "compliance"];

const AutomationBuilder = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: existing } = useAutomation(id);
  const save = useSaveAutomation();

  const [form, setForm] = useState<any>({
    name: "", description: "", category: "general", priority: "normal",
    trigger_type: "schedule", trigger_config: {}, conditions: [], actions: [],
    department: "", status: "draft", is_enabled: false, tags: [],
  });
  const [actionType, setActionType] = useState("send_notification");
  const [actionPayload, setActionPayload] = useState("");
  const [conditionText, setConditionText] = useState("");

  useEffect(() => { if (existing) setForm(existing); }, [existing]);

  const addAction = () => {
    setForm((f: any) => ({ ...f, actions: [...(f.actions ?? []), { type: actionType, payload: actionPayload }] }));
    setActionPayload("");
  };
  const addCondition = () => {
    if (!conditionText) return;
    setForm((f: any) => ({ ...f, conditions: [...(f.conditions ?? []), { expr: conditionText }] }));
    setConditionText("");
  };

  const submit = () => {
    save.mutate(form, { onSuccess: () => nav("/admin-os/executive/automation/automations") });
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader><CardTitle>{id ? "Edit Automation" : "New Automation"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trigger Type</Label>
              <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Trigger Config (JSON)</Label>
            <Textarea rows={3} value={JSON.stringify(form.trigger_config ?? {}, null, 2)}
              onChange={(e) => { try { setForm({ ...form, trigger_config: JSON.parse(e.target.value) }); } catch { /* ignore */ } }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Conditions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="e.g. status == 'overdue'" value={conditionText} onChange={(e) => setConditionText(e.target.value)} />
            <Button variant="outline" onClick={addCondition}>Add</Button>
          </div>
          <ul className="text-sm space-y-1">
            {(form.conditions ?? []).map((c: any, i: number) => (
              <li key={i} className="flex justify-between px-3 py-1.5 bg-muted/30 rounded">
                <code>{c.expr}</code>
                <button className="text-xs text-destructive" onClick={() => setForm({ ...form, conditions: form.conditions.filter((_: any, j: number) => j !== i) })}>Remove</button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[1fr_2fr_auto] gap-2">
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Payload / target" value={actionPayload} onChange={(e) => setActionPayload(e.target.value)} />
            <Button variant="outline" onClick={addAction}>Add</Button>
          </div>
          <ul className="text-sm space-y-1">
            {(form.actions ?? []).map((a: any, i: number) => (
              <li key={i} className="flex justify-between px-3 py-1.5 bg-muted/30 rounded">
                <span><strong>{a.type}</strong> — {a.payload}</span>
                <button className="text-xs text-destructive" onClick={() => setForm({ ...form, actions: form.actions.filter((_: any, j: number) => j !== i) })}>Remove</button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => nav(-1)}>Cancel</Button>
        <Button onClick={submit} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : "Save Automation"}</Button>
      </div>
    </div>
  );
};

export default AutomationBuilder;
