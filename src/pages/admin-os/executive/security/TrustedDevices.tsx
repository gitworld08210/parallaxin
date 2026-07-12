import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Fingerprint } from "lucide-react";
import { useTrustedDevices, useUpsertDevice, useDeleteDevice } from "@/hooks/admin-os/useExecutiveSecurity";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-500/15 text-green-600",
  medium: "bg-amber-500/15 text-amber-600",
  high: "bg-red-500/15 text-red-600",
};

const detectBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  return "Browser";
};
const detectOS = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Win")) return "Windows";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("iPhone")) return "iOS";
  if (ua.includes("Android")) return "Android";
  return "Unknown";
};

const TrustedDevices = () => {
  const { data: devices = [] } = useTrustedDevices();
  const upsert = useUpsertDevice();
  const del = useDeleteDevice();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    device_name: "", browser: detectBrowser(), os: detectOS(),
    risk_level: "low", is_approved: true,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ device_name: "", browser: detectBrowser(), os: detectOS(), risk_level: "low", is_approved: true });
    setOpen(true);
  };
  const openEdit = (d: any) => { setEditing(d); setForm({ ...d }); setOpen(true); };
  const submit = async () => {
    await upsert.mutateAsync(editing ? { ...form, id: editing.id } : form);
    setOpen(false);
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trusted Devices</h2>
          <p className="text-xs text-muted-foreground mt-1">Register, rename and remove approved devices.</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Register this device</Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {devices.length === 0 && (
          <div className="col-span-full text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg">
            No trusted devices registered.
          </div>
        )}
        {devices.map((d: any) => (
          <Card key={d.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Fingerprint className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{d.device_name}</p>
                  <p className="text-[11px] text-muted-foreground">{d.browser} · {d.os}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Last used {d.last_used_at ? new Date(d.last_used_at).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={`text-[10px] ${RISK_COLORS[d.risk_level] ?? ""}`}>{d.risk_level}</Badge>
                {d.is_approved && <Badge variant="secondary" className="text-[10px]">Approved</Badge>}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => openEdit(d)}>Rename</Button>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Register"} Device</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Device Name</Label><Input value={form.device_name} onChange={(e) => setForm({ ...form, device_name: e.target.value })} className="mt-1" placeholder="e.g. Founder's MacBook" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Browser</Label><Input value={form.browser ?? ""} onChange={(e) => setForm({ ...form, browser: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">OS</Label><Input value={form.os ?? ""} onChange={(e) => setForm({ ...form, os: e.target.value })} className="mt-1" /></div>
            </div>
            <div>
              <Label className="text-xs">Risk Level</Label>
              <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
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

export default TrustedDevices;
