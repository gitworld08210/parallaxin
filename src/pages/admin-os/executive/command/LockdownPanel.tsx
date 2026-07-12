import { useLockdowns, useActivateLockdown, useEndLockdown } from "@/hooks/admin-os/useCommandCenter";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const useDepartments = () =>
  useQuery({
    queryKey: ["admin-departments-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_departments").select("id,name");
      if (error) throw error;
      return data ?? [];
    },
  });

const LockdownPanel = () => {
  const { data: rows } = useLockdowns();
  const { data: depts } = useDepartments();
  const activate = useActivateLockdown();
  const end = useEndLockdown();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    department_id: "",
    reason: "",
    duration_hours: 4,
    restrictions: { freeze_approvals: true, restrict_operations: true, disable_sensitive_actions: true },
  });

  const submit = async () => {
    if (!form.department_id || !form.reason.trim()) return toast.error("Department and reason required");
    await activate.mutateAsync(form);
    toast.success("Lockdown activated");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Temporarily restrict department operations. All lockdowns are audited.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" variant="destructive"><Plus className="h-4 w-4 mr-1" /> New lockdown</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Activate department lockdown</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Department</Label>
                <Select value={form.department_id} onValueChange={(v) => setForm({...form, department_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Choose department" /></SelectTrigger>
                  <SelectContent>{(depts ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} /></div>
              <div><Label>Duration (hours)</Label><Input type="number" value={form.duration_hours} onChange={(e) => setForm({...form, duration_hours: Number(e.target.value)})} /></div>
              <div className="space-y-2 rounded-lg border border-border/60 p-3">
                <p className="text-xs font-medium text-muted-foreground">Restrictions</p>
                {[
                  { key: "freeze_approvals", label: "Freeze approvals" },
                  { key: "restrict_operations", label: "Restrict operations" },
                  { key: "disable_sensitive_actions", label: "Disable sensitive actions" },
                ].map((e) => (
                  <div key={e.key} className="flex items-center justify-between text-sm">
                    <span>{e.label}</span>
                    <Switch
                      checked={!!form.restrictions?.[e.key]}
                      onCheckedChange={(v) => setForm({...form, restrictions: {...form.restrictions, [e.key]: v}})}
                    />
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter><Button variant="destructive" onClick={submit} disabled={activate.isPending}>Activate</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-5">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left">
            <tr className="border-b border-border/60">
              <th className="py-2">Department</th><th>Reason</th><th>Duration</th><th>Activated</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-border/40 last:border-0">
                <td className="py-2 font-medium flex items-center gap-2"><Lock className="h-3 w-3" /> {r.department?.name ?? "—"}</td>
                <td className="max-w-xs truncate text-xs">{r.reason}</td>
                <td className="text-xs">{r.duration_hours ? `${r.duration_hours}h` : "—"}</td>
                <td className="text-xs text-muted-foreground">{new Date(r.activated_at).toLocaleString()}</td>
                <td><Badge variant={r.status === "active" ? "destructive" : "outline"}>{r.status}</Badge></td>
                <td className="text-right">
                  {r.status === "active" && (
                    <Button size="icon" variant="ghost" onClick={async () => { await end.mutateAsync(r.id); toast.success("Lockdown ended"); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No lockdowns.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default LockdownPanel;
