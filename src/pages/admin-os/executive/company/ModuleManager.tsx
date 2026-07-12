import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useModules, useUpsertModule } from "@/hooks/admin-os/useCompanyConfig";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-600",
  disabled: "bg-red-500/15 text-red-600",
  maintenance: "bg-amber-500/15 text-amber-600",
  archived: "bg-muted text-muted-foreground",
};

const ModuleManager = () => {
  const { data: mods = [] } = useModules();
  const upsert = useUpsertModule();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    module_key: "", name: "", description: "", status: "active", is_visible: true, dependencies: [],
  });
  const [depInput, setDepInput] = useState("");

  const openNew = () => {
    setEditing(null);
    setForm({ module_key: "", name: "", description: "", status: "active", is_visible: true, dependencies: [] });
    setDepInput("");
    setOpen(true);
  };
  const openEdit = (m: any) => {
    setEditing(m);
    setForm({ ...m });
    setDepInput((m.dependencies ?? []).join(", "));
    setOpen(true);
  };
  const submit = async () => {
    const dependencies = depInput.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      await upsert.mutateAsync(editing ? { ...form, dependencies, id: editing.id } : { ...form, dependencies });
      setOpen(false);
    } catch {}
  };
  const changeStatus = async (m: any, status: string) => {
    try { await upsert.mutateAsync({ ...m, status }); } catch {}
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Module Management</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Enable, disable and archive modules. Dependencies are validated before status changes.
          </p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Module</Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {mods.length === 0 && (
          <div className="col-span-full text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg">
            No modules registered.
          </div>
        )}
        {mods.map((m: any) => (
          <Card key={m.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{m.name}</p>
                  <Badge className={`text-[10px] ${STATUS_COLORS[m.status] ?? ""}`}>{m.status}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{m.module_key}</p>
                {m.description && <p className="text-xs text-muted-foreground mt-1">{m.description}</p>}
                {(m.dependencies ?? []).length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">Depends on: {m.dependencies.join(", ")}</p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => openEdit(m)}>Edit</Button>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              {["active", "disabled", "maintenance", "archived"].map((s) => (
                <Button key={s} size="sm" variant={m.status === s ? "default" : "outline"} onClick={() => changeStatus(m, s)}>
                  {s}
                </Button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Module</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Module Key</Label><Input value={form.module_key} onChange={(e) => setForm({ ...form, module_key: e.target.value })} className="mt-1 font-mono" disabled={!!editing} /></div>
            <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Dependencies (comma-separated module keys)</Label><Input value={depInput} onChange={(e) => setDepInput(e.target.value)} className="mt-1 font-mono" /></div>
            <div className="flex items-center justify-between"><Label className="text-xs">Visible in navigation</Label><Switch checked={form.is_visible} onCheckedChange={(v) => setForm({ ...form, is_visible: v })} /></div>
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

export default ModuleManager;
