import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useVerApplication, useAddReview, useIssueBadge, useUpdateApplicationStatus,
  type VerStatus, type BadgeKind,
} from "@/hooks/admin-os/useVerification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const decisionOpts: VerStatus[] = ["under_review", "info_required", "approved", "rejected", "suspended", "revoked"];
const badgeOpts: BadgeKind[] = ["blue", "creator", "organization", "business", "employee_affiliation", "public_figure"];

const CaseWorkspace = () => {
  const { id } = useParams();
  const { data } = useVerApplication(id);
  const addReview = useAddReview();
  const issueBadge = useIssueBadge();
  const updateStatus = useUpdateApplicationStatus();

  const [decision, setDecision] = useState<VerStatus>("approved");
  const [reason, setReason] = useState("");
  const [policyRefs, setPolicyRefs] = useState("VP-CORE-01");
  const [badgeKind, setBadgeKind] = useState<BadgeKind>("blue");

  if (!data?.application) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const app = data.application;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{app.subject_display_name}</CardTitle>
                <p className="text-xs text-muted-foreground">{app.application_number} · {app.ver_type}</p>
              </div>
              <Badge variant="outline">{app.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {app.submission_notes && <p>{app.submission_notes}</p>}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: app.id, status: "under_review" })}>Start review</Button>
              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: app.id, status: "info_required" })}>Request info</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Supporting documents</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.documents.length === 0 && <p className="text-muted-foreground">No documents attached.</p>}
            {data.documents.map(d => (
              <div key={d.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <div className="font-medium">{d.doc_type}</div>
                  <div className="text-xs text-muted-foreground">{d.file_name || d.file_url}</div>
                </div>
                <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs underline">Open</a>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Reviews</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.reviews.length === 0 && <p className="text-muted-foreground">No reviews yet.</p>}
            {data.reviews.map(r => (
              <div key={r.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{r.decision}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2">{r.reason}</p>
                <p className="text-xs text-muted-foreground mt-1">Policies: {(r.policy_refs || []).join(", ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Record decision</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Decision</Label>
              <Select value={decision} onValueChange={(v) => setDecision(v as VerStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {decisionOpts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Policy references (comma-sep)</Label>
              <Input value={policyRefs} onChange={(e) => setPolicyRefs(e.target.value)} />
            </div>
            <Button
              className="w-full"
              disabled={addReview.isPending || !reason}
              onClick={() => addReview.mutate({
                application_id: app.id, decision, reason,
                policy_refs: policyRefs.split(",").map(s => s.trim()).filter(Boolean),
              })}
            >Save decision</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Issue badge</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Badge</Label>
              <Select value={badgeKind} onValueChange={(v) => setBadgeKind(v as BadgeKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {badgeOpts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={issueBadge.isPending || app.status !== "approved"}
              onClick={() => issueBadge.mutate({ application_id: app.id, badge_kind: badgeKind })}
            >Issue badge</Button>
            {app.status !== "approved" && <p className="text-xs text-muted-foreground">Approve the application first.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            {data.history.map(h => (
              <div key={h.id} className="flex items-center justify-between">
                <span>{h.event_type}</span>
                <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
              </div>
            ))}
            {data.history.length === 0 && <p className="text-muted-foreground">No events.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CaseWorkspace;
