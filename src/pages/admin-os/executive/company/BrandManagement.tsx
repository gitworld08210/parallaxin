import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useBrandAssets, useUpsertBrandAsset, useDeleteBrandAsset } from "@/hooks/admin-os/useCompanyConfig";
import { Plus, Trash2, Palette } from "lucide-react";

const ASSET_TYPES = [
  { value: "logo", label: "Logo" },
  { value: "color_primary", label: "Primary Color" },
  { value: "color_secondary", label: "Secondary Color" },
  { value: "color_accent", label: "Accent Color" },
  { value: "typography_heading", label: "Heading Font" },
  { value: "typography_body", label: "Body Font" },
  { value: "email_banner", label: "Email Banner" },
  { value: "login_background", label: "Login Background" },
  { value: "system_icon", label: "System Icon" },
];

const BrandManagement = () => {
  const { data: assets = [] } = useBrandAssets();
  const upsert = useUpsertBrandAsset();
  const del = useDeleteBrandAsset();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    asset_type: "logo", name: "", url: "", value: "", is_dark_mode: false, is_active: true,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ asset_type: "logo", name: "", url: "", value: "", is_dark_mode: false, is_active: true });
    setOpen(true);
  };
  const openEdit = (a: any) => {
    setEditing(a);
    setForm({ ...a });
    setOpen(true);
  };
  const submit = async () => {
    await upsert.mutateAsync(editing ? { ...form, id: editing.id } : form);
    setOpen(false);
  };

  const isColor = form.asset_type?.startsWith("color_");

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Brand Management</h2>
          <p className="text-xs text-muted-foreground mt-1">Logos, colors, typography and brand assets propagate across Admin OS.</p>
        </div>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> New Asset</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {assets.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-10 border border-dashed rounded-lg">
            No brand assets yet.
          </div>
        )}
        {assets.map((a: any) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {a.asset_type?.startsWith("color_") && a.value ? (
                  <div className="w-8 h-8 rounded border" style={{ backgroundColor: a.value }} />
                ) : (
                  <Palette className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">{a.asset_type}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {a.is_dark_mode && <Badge variant="secondary" className="text-[9px]">Dark</Badge>}
                {a.is_active && <Badge className="text-[9px]">Active</Badge>}
              </div>
            </div>
            {a.url && <p className="text-[10px] text-muted-foreground mt-2 truncate">{a.url}</p>}
            {a.value && !a.asset_type?.startsWith("color_") && <p className="text-[10px] mt-1 truncate">{a.value}</p>}
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => openEdit(a)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(a.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "New"} Brand Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.asset_type} onValueChange={(v) => setForm({ ...form, asset_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            {isColor ? (
              <div>
                <Label className="text-xs">Color (hex)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={form.value ?? ""} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="#3b82f6" />
                  <input type="color" value={form.value || "#000000"} onChange={(e) => setForm({ ...form, value: e.target.value })} className="w-12 h-9 rounded border" />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-xs">URL (optional)</Label>
                  <Input value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Value (optional)</Label>
                  <Input value={form.value ?? ""} onChange={(e) => setForm({ ...form, value: e.target.value })} className="mt-1" />
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Dark mode variant</Label>
              <Switch checked={form.is_dark_mode} onCheckedChange={(v) => setForm({ ...form, is_dark_mode: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Active</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
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

export default BrandManagement;
