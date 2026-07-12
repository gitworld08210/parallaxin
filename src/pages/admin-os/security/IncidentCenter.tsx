import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useCreateIncident, useSecurityIncidents } from "@/hooks/admin-os/useSecurity";

const severityColor: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive",
  high: "bg-amber-500/15 text-amber-600",
  medium: "bg-primary/15 text-primary",
  low: "bg-muted text-muted-foreground",
};

const IncidentCenter = () => {
  const [status, setStatus] = useState<string>("all");
  const { data: incidents = [], isLoading } = useSecurityIncidents(status);
  const createIncident = useCreateIncident();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "medium", category: "" });

  const submit = async () => {
    if (!form.title.trim()) return;
    await createIncident.mutateAsync(form);
    setOpen(false);
    setForm({ title: "", description: "", severity: "medium", category: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="contained">Contained</SelectItem>
              <SelectItem value="recovered">Recovered</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Open Incident</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Security Incident</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="Category (e.g. account_takeover)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={createIncident.isPending}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Incidents</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {incidents.map((i) => (
            <Link
              key={i.id}
              to={`/admin-os/security/incidents/${i.id}`}
              className="flex items-center justify-between rounded-md border border-border/60 p-3 text-sm hover:bg-muted/40"
            >
              <div>
                <p className="font-medium">{i.title}</p>
                <p className="text-xs text-muted-foreground">{i.incident_code} · {i.category ?? "uncategorized"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${severityColor[i.severity] ?? ""}`}>{i.severity}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{i.status}</span>
              </div>
            </Link>
          ))}
          {!isLoading && incidents.length === 0 && <p className="text-sm text-muted-foreground">No incidents.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default IncidentCenter;
