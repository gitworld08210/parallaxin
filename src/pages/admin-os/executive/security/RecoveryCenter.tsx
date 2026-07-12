import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, LifeBuoy, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  useRecoveryMethods, useUpsertRecoveryMethod, useDeleteRecoveryMethod,
  useRecoveryCodes, useGenerateRecoveryCodes,
} from "@/hooks/admin-os/useExecutiveSecurity";

const RecoveryCenter = () => {
  const { data: methods = [] } = useRecoveryMethods();
  const { data: codes = [] } = useRecoveryCodes();
  const upsert = useUpsertRecoveryMethod();
  const del = useDeleteRecoveryMethod();
  const generate = useGenerateRecoveryCodes();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ method_type: "email", label: "", value: "", is_active: true, is_verified: false });
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null);

  const openNew = () => {
    setForm({ method_type: "email", label: "", value: "", is_active: true, is_verified: false });
    setOpen(true);
  };
  const submit = async () => {
    await upsert.mutateAsync(form);
    setOpen(false);
  };
  const generateNew = async () => {
    const codes = await generate.mutateAsync();
    setGeneratedCodes(codes);
  };
  const copyAll = () => {
    if (!generatedCodes) return;
    navigator.clipboard.writeText(generatedCodes.join("\n"));
    toast.success("Copied to clipboard");
  };

  const remaining = codes.filter((c: any) => !c.is_used).length;

  return (
    <div className="space-y-5">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><LifeBuoy className="h-5 w-5" /> Recovery Methods</h2>
            <p className="text-xs text-muted-foreground mt-1">Recovery routes require founder approval before activation.</p>
          </div>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Method</Button>
        </div>

        <div className="space-y-2">
          {methods.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
              No recovery methods configured.
            </div>
          )}
          {methods.map((m: any) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{m.method_type}</Badge>
                    <p className="font-medium text-sm truncate">{m.label || m.value}</p>
                    {m.is_verified && <Badge className="text-[10px]">Verified</Badge>}
                    {!m.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  </div>
                  {m.value && m.label && <p className="text-[11px] text-muted-foreground mt-1 truncate">{m.value}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recovery Codes</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {remaining} of {codes.length} codes remain. Regenerating invalidates all existing codes.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={generateNew} disabled={generate.isPending}>
            <RefreshCw className="h-4 w-4 mr-1" /> Generate new set
          </Button>
        </div>

        {generatedCodes && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Store these codes safely — they will not be shown again.
              </p>
              <Button size="sm" variant="outline" onClick={copyAll}><Copy className="h-3.5 w-3.5 mr-1" /> Copy all</Button>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {generatedCodes.map((c) => (<div key={c} className="rounded bg-background px-2 py-1">{c}</div>))}
            </div>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Recovery Method</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.method_type} onValueChange={(v) => setForm({ ...form, method_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Recovery Email</SelectItem>
                  <SelectItem value="phone">Recovery Phone</SelectItem>
                  <SelectItem value="trusted_contact">Trusted Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="mt-1" placeholder="e.g. Personal Email" /></div>
            <div><Label className="text-xs">Value</Label><Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecoveryCenter;
