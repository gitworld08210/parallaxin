/**
 * Phase 3.4 — Policy detail: version history, transitions, revisions, acknowledgement.
 */
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/admin-os/ds";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  usePolicy, usePolicyVersions, useTransitionPolicy,
  useCreatePolicyRevision, useAcknowledgePolicy, useUpdatePolicy,
  type PolicyStatus,
} from "@/hooks/admin-os/useGovernance";
import { ChevronLeft, GitCommit, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_TONE: Record<PolicyStatus, "info" | "warning" | "success" | "danger" | "neutral"> = {
  draft: "neutral", review: "warning", approved: "info",
  published: "success", revision: "warning", archived: "neutral",
};

const NEXT: Record<PolicyStatus, PolicyStatus[]> = {
  draft: ["review", "archived"],
  review: ["approved", "draft"],
  approved: ["published", "revision"],
  published: ["revision", "archived"],
  revision: ["review", "draft"],
  archived: [],
};

const RevisionDialog = ({ policyId }: { policyId: string }) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [changelog, setChangelog] = useState("");
  const rev = useCreatePolicyRevision();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">New revision</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New policy revision</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Changelog</Label>
            <Input value={changelog} onChange={(e) => setChangelog(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Content</Label>
            <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={async () => {
            await rev.mutateAsync({ policyId, content, changelog });
            toast.success("Revision drafted");
            setOpen(false);
          }} disabled={rev.isPending}>Create revision</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PolicyDetail = () => {
  const { id = "" } = useParams();
  const { data: policy, isLoading } = usePolicy(id);
  const { data: versions = [] } = usePolicyVersions(id);
  const transition = useTransitionPolicy();
  const update = useUpdatePolicy();
  const ack = useAcknowledgePolicy();

  const [effective, setEffective] = useState<string>("");
  const [review, setReview] = useState<string>("");

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!policy) return <EmptyState icon={GitCommit} title="Policy not found" />;

  const nextStates = NEXT[policy.status];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin-os/executive/governance/policies"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3 w-3" /> Back to Policy Center
        </Link>
      </div>
      <PageHeader
        eyebrow={`GOVERNANCE · ${policy.category.toUpperCase()}`}
        title={policy.title}
        description={`${policy.code} · v${policy.current_version}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={STATUS_TONE[policy.status]} label={policy.status} />
            {policy.status === "published" && (
              <Button size="sm" variant="outline" onClick={async () => {
                await ack.mutateAsync({ policyId: policy.id, version: policy.current_version });
                toast.success("Policy acknowledged");
              }}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />Acknowledge
              </Button>
            )}
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Summary">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{policy.summary ?? "—"}</p>
          </SectionCard>

          <SectionCard title="Version history" description="Every change is versioned and permanent.">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No versions.</p>
            ) : (
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">v{v.version} · {v.status}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                      </p>
                    </div>
                    {v.changelog && <p className="mt-1 text-xs text-muted-foreground">{v.changelog}</p>}
                    {v.content && (
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-foreground/80 font-sans">
                        {v.content}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Lifecycle" description="Move the policy through its workflow.">
            <div className="flex flex-wrap gap-2">
              {nextStates.length === 0 && <p className="text-xs text-muted-foreground">Terminal state.</p>}
              {nextStates.map((s) => (
                <Button key={s} size="sm" variant={s === "published" ? "default" : "outline"}
                  onClick={async () => {
                    await transition.mutateAsync({ id: policy.id, to: s });
                    toast.success(`Moved to ${s}`);
                  }}>
                  → {s}
                </Button>
              ))}
              <RevisionDialog policyId={policy.id} />
            </div>
          </SectionCard>

          <SectionCard title="Dates">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Effective date</Label>
                <Input type="date" defaultValue={policy.effective_date ?? ""}
                  onChange={(e) => setEffective(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Review date</Label>
                <Input type="date" defaultValue={policy.review_date ?? ""}
                  onChange={(e) => setReview(e.target.value)} />
              </div>
              <Button size="sm" onClick={async () => {
                await update.mutateAsync({ id: policy.id, patch: {
                  effective_date: effective || policy.effective_date,
                  review_date: review || policy.review_date,
                } as any });
                toast.success("Dates updated");
              }}>Save dates</Button>
            </div>
          </SectionCard>

          <SectionCard title="Metadata">
            <dl className="text-xs space-y-1.5">
              <div className="flex justify-between"><dt className="text-muted-foreground">Code</dt><dd className="font-mono">{policy.code}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Category</dt><dd>{policy.category}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Version</dt><dd>v{policy.current_version}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Published</dt>
                <dd>{policy.published_at ? new Date(policy.published_at).toLocaleDateString() : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Updated</dt>
                <dd>{new Date(policy.updated_at).toLocaleDateString()}</dd></div>
            </dl>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default PolicyDetail;
