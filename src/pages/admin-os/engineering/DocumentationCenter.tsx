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
import { Plus, FileText, Loader2 } from "lucide-react";
import {
  useEngProjects, useEngDocuments, useCreateEngDocument,
} from "@/hooks/admin-os/useEngineering";

const DocumentationCenter = () => {
  const { data: projects } = useEngProjects();
  const { data, isLoading } = useEngDocuments();
  const create = useCreateEngDocument();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    project_id: "", title: "", doc_type: "spec", content: "",
  });

  const submit = async () => {
    if (!form.title) return;
    const payload = { ...form };
    if (!payload.project_id) delete payload.project_id;
    await create.mutateAsync(payload);
    setOpen(false);
    setForm({ project_id: "", title: "", doc_type: "spec", content: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Documentation Center</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Doc</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New engineering document</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Project (optional)</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                  <SelectContent>
                    {(projects ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spec">Spec</SelectItem>
                    <SelectItem value="architecture">Architecture</SelectItem>
                    <SelectItem value="rfc">RFC</SelectItem>
                    <SelectItem value="runbook">Runbook</SelectItem>
                    <SelectItem value="postmortem">Postmortem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Content</Label>
                <Textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><FileText className="mx-auto mb-3 h-8 w-8 opacity-50" />No documents yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map((d: any) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <p className="font-semibold">{d.title}</p>
                  <Badge variant="outline">{d.doc_type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">{d.content}</p>
                <p className="text-[10px] text-muted-foreground">v{d.version} · updated {new Date(d.updated_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentationCenter;
