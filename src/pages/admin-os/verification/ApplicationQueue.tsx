import { useState } from "react";
import { Link } from "react-router-dom";
import { useVerApplications, useCreateVerApplication, type VerStatus, type VerType } from "@/hooks/admin-os/useVerification";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const statusOptions: { label: string; value: VerStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Under review", value: "under_review" },
  { label: "Info required", value: "info_required" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const typeOptions: { label: string; value: VerType }[] = [
  { label: "Individual", value: "individual" },
  { label: "Creator", value: "creator" },
  { label: "Organization", value: "organization" },
  { label: "Business", value: "business" },
  { label: "Employee", value: "employee" },
  { label: "Public figure", value: "public_figure" },
];

const ApplicationQueue = () => {
  const [status, setStatus] = useState<VerStatus | "all">("all");
  const { data: apps = [] } = useVerApplications(status !== "all" ? { status } : undefined);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ver_type: "individual" as VerType, subject_display_name: "", submission_notes: "" });
  const create = useCreateVerApplication();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as VerStatus | "all")}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New application</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit verification application</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <Select value={form.ver_type} onValueChange={(v) => setForm(f => ({ ...f, ver_type: v as VerType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject display name</Label>
                <Input value={form.subject_display_name} onChange={(e) => setForm(f => ({ ...f, subject_display_name: e.target.value }))} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={form.submission_notes} onChange={(e) => setForm(f => ({ ...f, submission_notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!form.subject_display_name || create.isPending}
                onClick={() => create.mutate(form, { onSuccess: () => { setOpen(false); setForm({ ver_type: "individual", subject_display_name: "", submission_notes: "" }); } })}
              >Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0 divide-y">
        {apps.length === 0 && <div className="p-6 text-sm text-muted-foreground">No applications.</div>}
        {apps.map(a => (
          <Link key={a.id} to={`/admin-os/verification/applications/${a.id}`}
            className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
            <div>
              <div className="font-medium">{a.subject_display_name}</div>
              <div className="text-xs text-muted-foreground">{a.application_number} · {a.ver_type}</div>
            </div>
            <Badge variant="outline">{a.status}</Badge>
          </Link>
        ))}
      </CardContent></Card>
    </div>
  );
};

export default ApplicationQueue;
