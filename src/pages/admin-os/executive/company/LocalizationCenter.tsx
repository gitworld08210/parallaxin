import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useLocalizations, useUpsertLocalization } from "@/hooks/admin-os/useCompanyConfig";

const LocalizationCenter = () => {
  const { data: locs = [] } = useLocalizations();
  const upsert = useUpsertLocalization();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    language_code: "en", region_code: "IN", display_name: "English (India)",
    is_default: false, is_enabled: true,
    date_format: "DD/MM/YYYY", time_format: "24h", currency: "INR",
    measurement_units: "metric", timezone: "Asia/Kolkata",
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      language_code: "en", region_code: "", display_name: "",
      is_default: false, is_enabled: true,
      date_format: "YYYY-MM-DD", time_format: "24h", currency: "INR",
      measurement_units: "metric", timezone: "Asia/Kolkata",
    });
    setOpen(true);
  };
  const openEdit = (l: any) => { setEditing(l); setForm({ ...l }); setOpen(true); };
  const submit = async () => {
    await upsert.mutateAsync(editing ? { ...form, id: editing.id } : form);
    setOpen(false);
  };
  const toggle = async (l: any, field: string, value: boolean) => {
    await upsert.mutateAsync({ ...l, [field]: value });
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Localization Center</h2>
          <p className="text-xs text-muted-foreground mt-1">Languages, regions, formats and timezones for international expansion.</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Locale</Button>
      </div>

      <div className="space-y-2">
        {locs.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg">
            No locales configured.
          </div>
        )}
        {locs.map((l: any) => (
          <Card key={l.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{l.display_name}</p>
                  <Badge variant="outline" className="text-[10px]">{l.language_code}{l.region_code ? `-${l.region_code}` : ""}</Badge>
                  {l.is_default && <Badge className="text-[10px]">Default</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {l.date_format} · {l.time_format} · {l.currency} · {l.timezone}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Enabled</Label>
                  <Switch checked={l.is_enabled} onCheckedChange={(v) => toggle(l, "is_enabled", v)} />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Default</Label>
                  <Switch checked={l.is_default} onCheckedChange={(v) => toggle(l, "is_default", v)} />
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(l)}>Edit</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Locale</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Display Name</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="mt-1" />
            </div>
            <div><Label className="text-xs">Language</Label><Input value={form.language_code} onChange={(e) => setForm({ ...form, language_code: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Region</Label><Input value={form.region_code ?? ""} onChange={(e) => setForm({ ...form, region_code: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Date Format</Label><Input value={form.date_format} onChange={(e) => setForm({ ...form, date_format: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Time Format</Label><Input value={form.time_format} onChange={(e) => setForm({ ...form, time_format: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Units</Label><Input value={form.measurement_units} onChange={(e) => setForm({ ...form, measurement_units: e.target.value })} className="mt-1" /></div>
            <div className="col-span-2"><Label className="text-xs">Timezone</Label><Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="mt-1" /></div>
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

export default LocalizationCenter;
