/**
 * Phase 3.4 — Authority Matrix editor.
 */
import { useState } from "react";
import { PageHeader, SectionCard, EmptyState } from "@/components/admin-os/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, Plus, Trash2 } from "lucide-react";
import { useAuthorityMatrix, useUpsertAuthority, useDeleteAuthority } from "@/hooks/admin-os/useGovernance";
import { toast } from "sonner";

const LEVELS = ["none", "view", "recommend", "approve", "veto", "delegate", "full"];
const ROLES = ["founder_office", "department_head", "deputy_head", "team_lead", "hr", "finance", "security", "legal"];

const NewAuthorityDialog = () => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ role_key: "department_head", scope: "", authority_level: "approve", description: "", is_active: true });
  const upsert = useUpsertAuthority();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New authority</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New authority</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Role</Label>
              <Select value={f.role_key} onValueChange={(v) => setF({ ...f, role_key: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Level</Label>
              <Select value={f.authority_level} onValueChange={(v) => setF({ ...f, authority_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEVELS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Scope</Label>
            <Input value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}
              placeholder="e.g. hiring, payroll, security_incidents" /></div>
          <div className="space-y-1.5"><Label>Description</Label>
            <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={async () => {
            if (!f.scope) return toast.error("Scope required");
            await upsert.mutateAsync(f);
            toast.success("Authority created");
            setOpen(false);
          }} disabled={upsert.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AuthorityMatrix = () => {
  const { data: rows = [], isLoading } = useAuthorityMatrix();
  const del = useDeleteAuthority();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="GOVERNANCE · AUTHORITY"
        title="Authority Matrix"
        description="Configurable authority definitions for every role across the company."
        actions={<NewAuthorityDialog />} />
      <SectionCard padded={false}>
        {isLoading ? <div className="p-8 text-sm text-muted-foreground">Loading…</div>
          : rows.length === 0 ? <div className="p-8"><EmptyState icon={Shield} title="No authority rows" /></div>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase text-muted-foreground border-b border-border/60">
                  <th className="text-left px-5 py-2">Role</th>
                  <th className="text-left py-2">Scope</th>
                  <th className="text-left py-2">Level</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Active</th>
                  <th className="text-right px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="px-5 py-2 font-mono text-xs">{r.role_key}</td>
                    <td className="py-2">{r.scope}</td>
                    <td className="py-2 font-semibold">{r.authority_level}</td>
                    <td className="py-2 text-muted-foreground truncate max-w-xs">{r.description}</td>
                    <td className="py-2">{r.is_active ? "Yes" : "No"}</td>
                    <td className="px-5 py-2 text-right">
                      <Button size="icon" variant="ghost" onClick={async () => {
                        if (!confirm("Delete authority row?")) return;
                        await del.mutateAsync(r.id);
                        toast.success("Deleted");
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </SectionCard>
    </div>
  );
};

export default AuthorityMatrix;
