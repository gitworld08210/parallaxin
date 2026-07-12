import { useSystemStatus, useUpdateSystemStatus } from "@/hooks/admin-os/useCommandCenter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statuses = ["operational","degraded","partial_outage","major_outage","maintenance"];
const color = (s: string) =>
  s === "operational" ? "bg-emerald-500"
  : s === "degraded" ? "bg-amber-500"
  : s === "maintenance" ? "bg-blue-500"
  : s === "partial_outage" ? "bg-orange-500"
  : "bg-red-500";

const SystemStatusDashboard = () => {
  const { data: rows } = useSystemStatus();
  const update = useUpdateSystemStatus();
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState<any>({ status: "operational", message: "" });
  const overall = (rows ?? []).some((r: any) => r.status !== "operational")
    ? "Some services affected" : "All systems operational";

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Platform Health</p>
            <p className="text-lg font-semibold">{overall}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {(rows ?? []).map((s: any) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${color(s.status)}`} />
                <p className="font-medium capitalize">{s.service.replace(/_/g, " ")}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEdit(s);
                  setForm({ status: s.status, message: s.message ?? "" });
                }}
              >
                Update
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {s.message ?? "—"} · checked {new Date(s.last_checked_at).toLocaleTimeString()}
            </p>
          </Card>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update {edit?.service}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Message</Label><Input value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button onClick={async () => {
              await update.mutateAsync({ id: edit.id, ...form });
              toast.success("Status updated");
              setEdit(null);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemStatusDashboard;
