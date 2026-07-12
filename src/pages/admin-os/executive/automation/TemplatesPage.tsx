import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAutomationTemplates, useSaveTemplate, useCreateFromTemplate } from "@/hooks/admin-os/useAutomation";

const CATEGORIES = ["general", "hr", "security", "finance", "support", "verification", "founder_office", "compliance"];
const TRIGGERS = ["schedule", "workflow_event", "status_change", "approval_event", "employee_event", "report_due", "security_event"];

const TemplatesPage = () => {
  const { data = [] } = useAutomationTemplates();
  const save = useSaveTemplate();
  const create = useCreateFromTemplate();
  const [form, setForm] = useState<any>({ name: "", description: "", category: "general", trigger_type: "schedule", actions: [], trigger_config: {} });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>New Template</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Trigger</Label>
            <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="md:col-span-3 flex justify-end">
            <Button onClick={() => save.mutate(form)} disabled={!form.name}>Save Template</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {data.map((t: any) => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {t.name}
                <Badge variant="outline">{t.category}</Badge>
                {t.is_system && <Badge>system</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <p className="text-xs text-muted-foreground">Trigger: {t.trigger_type}</p>
              <Button size="sm" variant="outline" onClick={() => {
                const name = window.prompt("Name for the new automation:", `${t.name} (copy)`);
                if (name) create.mutate({ templateId: t.id, name });
              }}>Create Automation</Button>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No templates yet.</CardContent></Card>}
      </div>
    </div>
  );
};

export default TemplatesPage;
