import {
  useReportDefinitions,
  useCreateReportDefinition,
  useSavedReports,
  useSaveReport,
  useDeleteSavedReport,
  useRunReport,
  useReportHistory,
} from "@/hooks/admin-os/useExecutiveReports";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Play, Trash2, Bookmark } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const scopes = ["company","department","hr","finance","security","support","verification","engineering","custom"];

const ReportLibrary = () => {
  const { data: defs } = useReportDefinitions();
  const { data: saved } = useSavedReports();
  const { data: history } = useReportHistory(20);
  const create = useCreateReportDefinition();
  const save = useSaveReport();
  const del = useDeleteSavedReport();
  const run = useRunReport();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ code: "", name: "", category: "operational", scope: "company", visibility: "founder_only" });

  const submit = async () => {
    if (!form.code || !form.name) return toast.error("Code and name required");
    await create.mutateAsync(form);
    toast.success("Report definition created");
    setOpen(false);
    setForm({ code: "", name: "", category: "operational", scope: "company", visibility: "founder_only" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage report definitions, saved reports, and view generation history.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Definition</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New report definition</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} /></div>
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} /></div>
                <div>
                  <Label>Scope</Label>
                  <Select value={form.scope} onValueChange={(v) => setForm({...form, scope: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{scopes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Visibility</Label>
                  <Select value={form.visibility} onValueChange={(v) => setForm({...form, visibility: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="founder_only">Founder only</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Source module</Label><Input value={form.source_module ?? ""} onChange={(e) => setForm({...form, source_module: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={create.isPending}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Report Definitions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left">
              <tr className="border-b border-border/60">
                <th className="py-2">Name</th><th>Category</th><th>Scope</th><th>Visibility</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(defs ?? []).map((d: any) => (
                <tr key={d.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2">
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.code}</p>
                  </td>
                  <td>{d.category}</td>
                  <td><Badge variant="secondary">{d.scope}</Badge></td>
                  <td className="text-xs">{d.visibility}</td>
                  <td className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={async () => {
                      await run.mutateAsync({ definition_id: d.id, format: "pdf" });
                      toast.success("Report queued");
                    }}><Play className="h-3 w-3 mr-1" /> Run</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      await save.mutateAsync({ definition_id: d.id, title: d.name, filters: {} });
                      toast.success("Saved");
                    }}><Bookmark className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
              {!defs?.length && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No report definitions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Saved Reports</h2>
          <div className="space-y-2">
            {(saved ?? []).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.definition?.name ?? "custom"} · {new Date(s.updated_at).toLocaleDateString()}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {!saved?.length && <p className="text-sm text-muted-foreground">No saved reports.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-3">Recent Generations</h2>
          <div className="space-y-2">
            {(history ?? []).map((h: any) => (
              <div key={h.id} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 text-sm">
                <div>
                  <p className="font-medium">{h.definition?.name ?? "Ad-hoc"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.generated_at).toLocaleString()}</p>
                </div>
                <Badge variant={h.status === "success" ? "default" : "destructive"}>{h.status}</Badge>
              </div>
            ))}
            {!history?.length && <p className="text-sm text-muted-foreground">No runs yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReportLibrary;
