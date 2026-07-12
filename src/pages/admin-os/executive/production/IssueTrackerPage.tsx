import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIssues, useCreateIssue, useResolveIssue, MODULE_LIST } from "@/hooks/admin-os/useProductionReadiness";
import { format } from "date-fns";

const IssueTrackerPage = () => {
  const { data: issues = [] } = useIssues();
  const create = useCreateIssue();
  const resolve = useResolveIssue();
  const [form, setForm] = useState({ title: "", module: MODULE_LIST[0] as string, severity: "medium", description: "" });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Log Issue</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select value={form.module} onValueChange={(v) => setForm({ ...form, module: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MODULE_LIST.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
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
          <Button disabled={!form.title || create.isPending}
            onClick={() => { create.mutate(form); setForm({ title: "", module: MODULE_LIST[0], severity: "medium", description: "" }); }}>
            Log Issue
          </Button>
          <Textarea placeholder="Description" className="md:col-span-2" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Issues ({issues.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {issues.length === 0 && <p className="text-sm text-muted-foreground">No issues logged.</p>}
          {issues.map((i: any) => (
            <div key={i.id} className="flex items-center justify-between border rounded p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{i.title}</span>
                  <Badge variant="outline">{i.module}</Badge>
                  <Badge variant={i.severity === "critical" ? "destructive" : "secondary"}>{i.severity}</Badge>
                  <Badge variant={i.status === "resolved" ? "default" : "outline"}>{i.status}</Badge>
                </div>
                {i.description && <p className="text-xs text-muted-foreground mt-1">{i.description}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">{format(new Date(i.created_at), "PPp")}</p>
              </div>
              {i.status !== "resolved" && (
                <Button size="sm" variant="outline" onClick={() => resolve.mutate(i.id)}>Resolve</Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default IssueTrackerPage;
