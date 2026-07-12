import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Plus, Bug as BugIcon, Loader2 } from "lucide-react";
import {
  useEngProjects, useEngBugs, useCreateEngBug, useUpdateEngBug,
} from "@/hooks/admin-os/useEngineering";

const severityTone: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-orange-500/10 text-orange-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-slate-500/10 text-slate-600",
};

const BugCenter = () => {
  const { data: projects } = useEngProjects();
  const [filterProject, setFilterProject] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const filters: any = {};
  if (filterProject !== "all") filters.projectId = filterProject;
  if (filterSeverity !== "all") filters.severity = filterSeverity;
  const { data, isLoading } = useEngBugs(filters);
  const create = useCreateEngBug();
  const update = useUpdateEngBug();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    project_id: "", title: "", description: "", severity: "medium", environment: "production",
    reproduction_steps: "", status: "open", priority: "medium",
  });

  const submit = async () => {
    if (!form.project_id || !form.title) return;
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ project_id: "", title: "", description: "", severity: "medium", environment: "production", reproduction_steps: "", status: "open", priority: "medium" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Bug Center</h2>
        <div className="flex items-center gap-2">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {(projects ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> File Bug</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>File a bug</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Project</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose project" /></SelectTrigger>
                    <SelectContent>
                      {(projects ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Severity</Label>
                    <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Environment</Label>
                    <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="development">Development</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Reproduction steps</Label>
                  <Textarea value={form.reproduction_steps} onChange={(e) => setForm({ ...form, reproduction_steps: e.target.value })} rows={4} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={create.isPending}>
                  {create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}File
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><BugIcon className="mx-auto mb-3 h-8 w-8 opacity-50" />No bugs match.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((b: any) => (
            <Card key={b.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{b.bug_id}</span>
                    <Badge className={severityTone[b.severity] ?? ""}>{b.severity}</Badge>
                    <Badge variant="outline" className="text-[10px]">{b.environment}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{b.title}</p>
                </div>
                <Select value={b.status} onValueChange={(v) => update.mutate({ id: b.id, status: v, ...(v === "resolved" ? { resolved_at: new Date().toISOString() } : {}) })}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="triaged">Triaged</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="wont_fix">Won't Fix</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BugCenter;
