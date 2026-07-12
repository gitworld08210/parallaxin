/**
 * Phase 3.4 — Executive Authority Delegation center.
 */
import { useState } from "react";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/admin-os/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Users2, Plus } from "lucide-react";
import {
  useAuthorityDelegations, useCreateDelegation, useUpdateDelegationStatus,
} from "@/hooks/admin-os/useGovernance";
import { toast } from "sonner";

const TONE: Record<string, "info" | "warning" | "success" | "danger" | "neutral"> = {
  pending: "warning", active: "success", revoked: "danger",
  expired: "neutral", completed: "info", rejected: "danger",
};

const NewDelegation = () => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ delegate_id: "", scope: "", reason: "", end_date: "" });
  const create = useCreateDelegation();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New delegation</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Delegate authority</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Delegate user ID</Label>
            <Input value={f.delegate_id} onChange={(e) => setF({ ...f, delegate_id: e.target.value })}
              placeholder="auth.users.id" /></div>
          <div className="space-y-1.5"><Label>Scope</Label>
            <Input value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}
              placeholder="e.g. hiring_approvals, expense_up_to_10k" /></div>
          <div className="space-y-1.5"><Label>Reason</Label>
            <Textarea value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>End date</Label>
            <Input type="datetime-local" value={f.end_date}
              onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={create.isPending} onClick={async () => {
            if (!f.delegate_id || !f.scope) return toast.error("Delegate and scope required");
            await create.mutateAsync({
              delegate_id: f.delegate_id, scope: f.scope,
              reason: f.reason, end_date: f.end_date ? new Date(f.end_date).toISOString() : null,
            });
            toast.success("Delegation active");
            setOpen(false);
          }}>Delegate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DelegationCenter = () => {
  const { data: rows = [], isLoading } = useAuthorityDelegations();
  const upd = useUpdateDelegationStatus();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="GOVERNANCE · DELEGATIONS"
        title="Executive Delegations"
        description="Temporary transfer of Founder Office authority — automatically bounded by end date."
        actions={<NewDelegation />} />
      <SectionCard padded={false}>
        {isLoading ? <div className="p-8 text-sm text-muted-foreground">Loading…</div>
          : rows.length === 0 ? <div className="p-8"><EmptyState icon={Users2} title="No delegations" /></div>
          : (
            <div className="divide-y divide-border/60">
              {rows.map((d) => {
                const expired = d.end_date && new Date(d.end_date) < new Date();
                const status = expired && d.status === "active" ? "expired" : d.status;
                return (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{d.scope}</p>
                      <p className="text-xs text-muted-foreground truncate">{d.reason ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        From <span className="font-mono">{d.delegator_id?.slice(0, 8)}</span> →
                        <span className="font-mono ml-1">{d.delegate_id?.slice(0, 8)}</span>
                        {d.end_date && <span className="ml-2">until {new Date(d.end_date).toLocaleString()}</span>}
                      </p>
                    </div>
                    <StatusBadge tone={TONE[status] ?? "neutral"} label={status} />
                    {d.status === "active" && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        await upd.mutateAsync({ id: d.id, status: "revoked" });
                        toast.success("Revoked");
                      }}>Revoke</Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </SectionCard>
    </div>
  );
};

export default DelegationCenter;
