import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useMetadata, useUpsertMetadata, useDeleteMetadata } from "@/hooks/admin-os/useCompanyConfig";

const MetadataManager = () => {
  const { data: items = [] } = useMetadata();
  const upsert = useUpsertMetadata();
  const del = useDeleteMetadata();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    key: "", name: "", description: "", prefix: "", format_pattern: "", current_sequence: 0,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ key: "", name: "", description: "", prefix: "", format_pattern: "", current_sequence: 0 });
    setOpen(true);
  };
  const openEdit = (m: any) => { setEditing(m); setForm({ ...m }); setOpen(true); };
  const submit = async () => {
    await upsert.mutateAsync(editing ? { ...form, id: editing.id } : form);
    setOpen(false);
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Company Metadata</h2>
          <p className="text-xs text-muted-foreground mt-1">Organization IDs, document prefixes, certificate formats and reference numbering.</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Metadata</Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {items.length === 0 && (
          <div className="col-span-full text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg">
            No metadata configured.
          </div>
        )}
        {items.map((m: any) => (
          <Card key={m.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{m.name}</p>
                  <Badge variant="outline" className="text-[10px] font-mono">{m.key}</Badge>
                </div>
                {m.description && <p className="text-xs text-muted-foreground mt-1">{m.description}</p>}
                <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5">
                  {m.prefix && <p>Prefix: <span className="font-mono">{m.prefix}</span></p>}
                  {m.format_pattern && <p>Pattern: <span className="font-mono">{m.format_pattern}</span></p>}
                  <p>Sequence: {m.current_sequence}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(m)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Metadata</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Key</Label><Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} className="mt-1 font-mono" disabled={!!editing} /></div>
            <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Prefix</Label><Input value={form.prefix ?? ""} onChange={(e) => setForm({ ...form, prefix: e.target.value })} className="mt-1 font-mono" /></div>
              <div><Label className="text-xs">Sequence</Label><Input type="number" value={form.current_sequence} onChange={(e) => setForm({ ...form, current_sequence: Number(e.target.value) })} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Format Pattern</Label><Input value={form.format_pattern ?? ""} onChange={(e) => setForm({ ...form, format_pattern: e.target.value })} className="mt-1 font-mono" placeholder="e.g. AURELIX-{prefix}-{seq:0000}" /></div>
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

export default MetadataManager;
