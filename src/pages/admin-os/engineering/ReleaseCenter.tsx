import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Plus, PackageCheck, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import {
  useEngProjects, useEngReleases, useCreateEngRelease,
  useApproveReleaseQA, useApproveReleaseFounder, useUpdateEngRelease,
} from "@/hooks/admin-os/useEngineering";

const ReleaseCenter = () => {
  const { data: projects } = useEngProjects();
  const { data, isLoading } = useEngReleases();
  const create = useCreateEngRelease();
  const qa = useApproveReleaseQA();
  const founder = useApproveReleaseFounder();
  const update = useUpdateEngRelease();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    project_id: "", version: "", title: "", release_notes: "", is_production: false, status: "draft",
  });

  const submit = async () => {
    if (!form.project_id || !form.version || !form.title || !form.release_notes.trim()) return;
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ project_id: "", version: "", title: "", release_notes: "", is_production: false, status: "draft" });
  };

  const markReleased = (id: string) => update.mutate({ id, status: "released", released_at: new Date().toISOString() });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Release Center</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Release</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create release</DialogTitle></DialogHeader>
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Version</Label>
                  <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="v1.2.0" />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Release notes (required)</Label>
                <Textarea rows={5} value={form.release_notes} onChange={(e) => setForm({ ...form, release_notes: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <p className="text-sm font-medium">Production release</p>
                  <p className="text-xs text-muted-foreground">Requires Founder Office approval</p>
                </div>
                <Switch checked={form.is_production} onCheckedChange={(v) => setForm({ ...form, is_production: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><PackageCheck className="mx-auto mb-3 h-8 w-8 opacity-50" />No releases yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((r: any) => {
            const canRelease = r.qa_approved && (!r.is_production || r.founder_approved) && r.status !== "released";
            return (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{r.release_id}</span>
                        <Badge variant="outline">{r.version}</Badge>
                        {r.is_production && <Badge variant="destructive">production</Badge>}
                      </div>
                      <p className="mt-1 font-semibold">{r.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground whitespace-pre-wrap">{r.release_notes}</p>
                    </div>
                    <Badge>{r.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={r.qa_approved ? "default" : "outline"} className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> QA {r.qa_approved ? "approved" : "pending"}
                    </Badge>
                    {r.is_production && (
                      <Badge variant={r.founder_approved ? "default" : "outline"} className="gap-1">
                        <ShieldCheck className="h-3 w-3" /> Founder {r.founder_approved ? "approved" : "pending"}
                      </Badge>
                    )}
                    <div className="ml-auto flex gap-2">
                      {!r.qa_approved && (
                        <Button size="sm" variant="outline" onClick={() => qa.mutate(r.id)}>QA approve</Button>
                      )}
                      {r.is_production && !r.founder_approved && (
                        <Button size="sm" variant="outline" onClick={() => founder.mutate(r.id)}>Founder approve</Button>
                      )}
                      {canRelease && (
                        <Button size="sm" onClick={() => markReleased(r.id)}>Mark released</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReleaseCenter;
