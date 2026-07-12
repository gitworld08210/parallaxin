/**
 * Phase 3.4 — Department Charters editor.
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
import { Building2, Plus, CheckCircle2 } from "lucide-react";
import { useCharters, useUpsertCharter, useApproveCharter } from "@/hooks/admin-os/useGovernance";
import { toast } from "sonner";

const CharterDialog = ({ existing }: { existing?: any }) => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(() => ({
    id: existing?.id, department_id: existing?.department_id ?? "",
    version: existing?.version ?? 1, mission: existing?.mission ?? "",
    responsibilities: existing?.responsibilities ?? "", kpis: existing?.kpis ?? "",
    approval_rights: existing?.approval_rights ?? "", escalation_path: existing?.escalation_path ?? "",
    reporting_structure: existing?.reporting_structure ?? "",
    training_standards: existing?.training_standards ?? "",
    documentation_standards: existing?.documentation_standards ?? "",
    status: existing?.status ?? "draft",
  }));
  const upsert = useUpsertCharter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={existing ? "outline" : "default"}>
          {existing ? "Edit" : <><Plus className="h-4 w-4 mr-1.5" />New charter</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{existing ? "Edit charter" : "New department charter"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-1.5"><Label>Department ID</Label>
            <Input value={f.department_id}
              onChange={(e) => setF({ ...f, department_id: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Version</Label>
            <Input type="number" value={f.version}
              onChange={(e) => setF({ ...f, version: Number(e.target.value) })} /></div>
          {(["mission","responsibilities","kpis","approval_rights","escalation_path",
             "reporting_structure","training_standards","documentation_standards"] as const).map((k) => (
            <div key={k} className="space-y-1.5 col-span-2">
              <Label className="capitalize">{k.replaceAll("_"," ")}</Label>
              <Textarea rows={2} value={(f as any)[k]}
                onChange={(e) => setF({ ...f, [k]: e.target.value } as any)} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={upsert.isPending} onClick={async () => {
            if (!f.department_id) return toast.error("Department required");
            await upsert.mutateAsync(f);
            toast.success("Charter saved");
            setOpen(false);
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TONE: Record<string, "info" | "warning" | "success" | "neutral"> = {
  draft: "neutral", review: "warning", approved: "success", archived: "neutral",
};

const DepartmentCharters = () => {
  const { data: rows = [], isLoading } = useCharters();
  const approve = useApproveCharter();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="GOVERNANCE · CHARTERS"
        title="Department Charters"
        description="Each department publishes a charter under Founder Office approval."
        actions={<CharterDialog />} />
      <SectionCard padded={false}>
        {isLoading ? <div className="p-8 text-sm text-muted-foreground">Loading…</div>
          : rows.length === 0 ? <div className="p-8"><EmptyState icon={Building2} title="No charters yet" /></div>
          : (
            <div className="divide-y divide-border/60">
              {rows.map((c: any) => (
                <div key={c.id} className="px-5 py-4 flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{c.department?.name ?? c.department_id}</p>
                      <span className="text-[11px] text-muted-foreground">v{c.version}</span>
                      <StatusBadge tone={TONE[c.status] ?? "neutral"} label={c.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.mission || "No mission set"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CharterDialog existing={c} />
                    {c.status !== "approved" && (
                      <Button size="sm" onClick={async () => {
                        await approve.mutateAsync(c.id);
                        toast.success("Charter approved");
                      }}>
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />Approve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </SectionCard>
    </div>
  );
};

export default DepartmentCharters;
