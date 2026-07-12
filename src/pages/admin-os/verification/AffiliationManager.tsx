import { useState } from "react";
import { useVerAffiliations, useCreateAffiliation } from "@/hooks/admin-os/useVerification";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

type Kind = "employee_org" | "creator_brand" | "executive_company" | "partner_org";

const AffiliationManager = () => {
  const { data: rows = [] } = useVerAffiliations();
  const create = useCreateAffiliation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ affiliation_kind: Kind; organization_name: string; role_label: string; effective_to: string }>({
    affiliation_kind: "employee_org", organization_name: "", role_label: "", effective_to: "",
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />New affiliation</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record affiliation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Kind</Label>
                <Select value={form.affiliation_kind} onValueChange={(v) => setForm(f => ({ ...f, affiliation_kind: v as Kind }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee_org">Employee ↔ Organization</SelectItem>
                    <SelectItem value="creator_brand">Creator ↔ Brand</SelectItem>
                    <SelectItem value="executive_company">Executive ↔ Company</SelectItem>
                    <SelectItem value="partner_org">Partner ↔ Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Organization name</Label><Input value={form.organization_name} onChange={e => setForm(f => ({ ...f, organization_name: e.target.value }))} /></div>
              <div><Label>Role label</Label><Input value={form.role_label} onChange={e => setForm(f => ({ ...f, role_label: e.target.value }))} /></div>
              <div><Label>Expiry (optional)</Label><Input type="date" value={form.effective_to} onChange={e => setForm(f => ({ ...f, effective_to: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button
                disabled={!form.organization_name || create.isPending}
                onClick={() => create.mutate(
                  { ...form, effective_to: form.effective_to || null },
                  { onSuccess: () => { setOpen(false); setForm({ affiliation_kind: "employee_org", organization_name: "", role_label: "", effective_to: "" }); } }
                )}
              >Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0 divide-y">
        {rows.length === 0 && <div className="p-6 text-sm text-muted-foreground">No affiliations recorded.</div>}
        {rows.map(a => (
          <div key={a.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{a.organization_name}</div>
              <div className="text-xs text-muted-foreground">
                {a.affiliation_kind} · {a.role_label || "—"} · from {a.effective_from}
                {a.effective_to ? ` to ${a.effective_to}` : ""}
              </div>
            </div>
            <Badge variant="outline">{a.status}</Badge>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
};

export default AffiliationManager;
