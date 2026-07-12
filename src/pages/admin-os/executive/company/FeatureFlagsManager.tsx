import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useFeatureFlags, useUpsertFeatureFlag, useDeleteFeatureFlag } from "@/hooks/admin-os/useCompanyConfig";

const FeatureFlagsManager = () => {
  const { data: flags = [] } = useFeatureFlags();
  const upsert = useUpsertFeatureFlag();
  const del = useDeleteFeatureFlag();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    key: "", name: "", description: "", is_enabled: false,
    rollout_percentage: 0, target_departments: [], is_beta: false, is_internal: false,
  });
  const [deptInput, setDeptInput] = useState("");

  const openNew = () => {
    setEditing(null);
    setForm({ key: "", name: "", description: "", is_enabled: false, rollout_percentage: 0, target_departments: [], is_beta: false, is_internal: false });
    setDeptInput("");
    setOpen(true);
  };
  const openEdit = (f: any) => {
    setEditing(f);
    setForm({ ...f, target_departments: f.target_departments ?? [] });
    setDeptInput((f.target_departments ?? []).join(", "));
    setOpen(true);
  };
  const submit = async () => {
    const target_departments = deptInput.split(",").map((s) => s.trim()).filter(Boolean);
    await upsert.mutateAsync(editing ? { ...form, target_departments, id: editing.id } : { ...form, target_departments });
    setOpen(false);
  };
  const toggleFlag = async (f: any, v: boolean) => {
    await upsert.mutateAsync({ ...f, is_enabled: v });
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Feature Flags</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Enable, disable and stage feature rollouts. Every change is audited.
          </p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Flag</Button>
      </div>

      <div className="space-y-2">
        {flags.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg">
            No feature flags yet.
          </div>
        )}
        {flags.map((f: any) => (
          <Card key={f.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{f.name}</p>
                  <Badge variant="outline" className="text-[10px] font-mono">{f.key}</Badge>
                  {f.is_beta && <Badge variant="secondary" className="text-[10px]">Beta</Badge>}
                  {f.is_internal && <Badge variant="secondary" className="text-[10px]">Internal</Badge>}
                  {f.rollout_percentage > 0 && f.rollout_percentage < 100 && (
                    <Badge className="text-[10px]">{f.rollout_percentage}% rollout</Badge>
                  )}
                </div>
                {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
                {(f.target_departments ?? []).length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">Targets: {f.target_departments.join(", ")}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Enabled</Label>
                  <Switch checked={f.is_enabled} onCheckedChange={(v) => toggleFlag(f, v)} />
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(f)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Feature Flag</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Key</Label><Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} className="mt-1 font-mono" placeholder="feature.key" disabled={!!editing} /></div>
            <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Rollout %</Label><Input type="number" min={0} max={100} value={form.rollout_percentage} onChange={(e) => setForm({ ...form, rollout_percentage: Number(e.target.value) })} className="mt-1" /></div>
            <div><Label className="text-xs">Target Departments (comma separated)</Label><Input value={deptInput} onChange={(e) => setDeptInput(e.target.value)} className="mt-1" placeholder="hr, finance" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center justify-between"><Label className="text-xs">Enabled</Label><Switch checked={form.is_enabled} onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Beta</Label><Switch checked={form.is_beta} onCheckedChange={(v) => setForm({ ...form, is_beta: v })} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Internal</Label><Switch checked={form.is_internal} onCheckedChange={(v) => setForm({ ...form, is_internal: v })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FeatureFlagsManager;
