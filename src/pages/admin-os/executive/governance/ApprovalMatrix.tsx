/**
 * Phase 3.4 — Approval Matrix editor.
 */
import { useState } from "react";
import { PageHeader, SectionCard, EmptyState } from "@/components/admin-os/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { GitBranch, Plus, Trash2 } from "lucide-react";
import { useApprovalMatrix, useUpsertApprovalRule, useDeleteApprovalRule } from "@/hooks/admin-os/useGovernance";
import { toast } from "sonner";

const NewRuleDialog = () => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    request_type: "", scope: "company", approver_role: "founder_office",
    recommender_role: "", reviewer_role: "", delegate_role: "",
    notify_roles: "", threshold_amount: "", description: "",
  });
  const upsert = useUpsertApprovalRule();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New approval rule</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New approval rule</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["request_type","Request type"],["scope","Scope"],
            ["approver_role","Approver role"],["recommender_role","Recommender role"],
            ["reviewer_role","Reviewer role"],["delegate_role","Delegate role"],
            ["notify_roles","Notify roles (comma-sep)"],["threshold_amount","Threshold amount"],
          ].map(([k, label]) => (
            <div key={k} className="space-y-1.5"><Label>{label}</Label>
              <Input value={(f as any)[k]}
                onChange={(e) => setF({ ...f, [k]: e.target.value } as any)} /></div>
          ))}
          <div className="space-y-1.5 col-span-2"><Label>Description</Label>
            <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={upsert.isPending} onClick={async () => {
            if (!f.request_type) return toast.error("Request type required");
            await upsert.mutateAsync({
              ...f,
              notify_roles: f.notify_roles.split(",").map((s) => s.trim()).filter(Boolean),
              threshold_amount: f.threshold_amount ? Number(f.threshold_amount) : null,
            });
            toast.success("Approval rule saved");
            setOpen(false);
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ApprovalMatrix = () => {
  const { data: rows = [], isLoading } = useApprovalMatrix();
  const del = useDeleteApprovalRule();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="GOVERNANCE · APPROVALS"
        title="Approval Matrix"
        description="Who approves, recommends, reviews, delegates and is notified for each request type."
        actions={<NewRuleDialog />} />
      <SectionCard padded={false}>
        {isLoading ? <div className="p-8 text-sm text-muted-foreground">Loading…</div>
          : rows.length === 0 ? <div className="p-8"><EmptyState icon={GitBranch} title="No approval rules" /></div>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase text-muted-foreground border-b border-border/60">
                  <th className="text-left px-5 py-2">Request type</th>
                  <th className="text-left py-2">Scope</th>
                  <th className="text-left py-2">Approver</th>
                  <th className="text-left py-2">Recommender</th>
                  <th className="text-left py-2">Reviewer</th>
                  <th className="text-left py-2">Threshold</th>
                  <th className="text-right px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="px-5 py-2 font-mono text-xs">{r.request_type}</td>
                    <td className="py-2">{r.scope}</td>
                    <td className="py-2">{r.approver_role ?? "—"}</td>
                    <td className="py-2">{r.recommender_role ?? "—"}</td>
                    <td className="py-2">{r.reviewer_role ?? "—"}</td>
                    <td className="py-2">{r.threshold_amount ?? "—"}</td>
                    <td className="px-5 py-2 text-right">
                      <Button size="icon" variant="ghost" onClick={async () => {
                        if (!confirm("Delete rule?")) return;
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

export default ApprovalMatrix;
