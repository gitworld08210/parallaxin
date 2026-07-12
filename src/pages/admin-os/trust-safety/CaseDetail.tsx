import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useTsCase, useTsEvidence, useTsNotes, useTsTimeline, useTsEnforcement, useTsAppeals, useTsPolicies,
  useAssignCase, useAddEvidence, useAddNote, useApplyEnforcement, useUpdateCase, useReviewAppeal,
  TS_ENFORCEMENT_TYPES, TS_STATUSES,
} from "@/hooks/admin-os/useTrustSafety";
import { ArrowLeft, Lock, Shield, Gavel } from "lucide-react";
import { format } from "date-fns";

const CaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: c } = useTsCase(id);
  const { data: evidence = [] } = useTsEvidence(id);
  const { data: notes = [] } = useTsNotes(id);
  const { data: timeline = [] } = useTsTimeline(id);
  const { data: enforcement = [] } = useTsEnforcement(id);
  const { data: appeals = [] } = useTsAppeals(id);
  const { data: policies = [] } = useTsPolicies();

  const assign = useAssignCase();
  const addEvidence = useAddEvidence();
  const addNote = useAddNote();
  const apply = useApplyEnforcement();
  const updateCase = useUpdateCase();
  const reviewAppeal = useReviewAppeal();

  const [evForm, setEvForm] = useState({ evidence_type: "screenshot", content: "", description: "" });
  const [noteText, setNoteText] = useState("");
  const [enfForm, setEnfForm] = useState({
    action_type: "warning", target_type: "user", reason: "", policy_reference: "",
  });
  const [appealForm, setAppealForm] = useState<Record<string, { decision: string; notes: string }>>({});

  if (!c) return <p className="text-sm text-muted-foreground">Loading case...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin-os/trust-safety/queue"><ArrowLeft className="h-4 w-4 mr-1" />Back to queue</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground">{c.case_number}</span>
                <Badge variant="outline">{c.category}</Badge>
                <Badge variant={c.severity === "critical" ? "destructive" : "secondary"}>{c.severity}</Badge>
                <Badge>{c.status}</Badge>
                {c.requires_founder_review && <Badge variant="destructive">Founder review</Badge>}
              </div>
              <CardTitle className="text-xl mt-2">{c.title}</CardTitle>
              {c.description && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{c.description}</p>}
            </div>
            <div className="flex gap-2">
              {!c.assigned_to && (
                <Button size="sm" onClick={() => assign.mutate(c.id)}><Shield className="h-4 w-4 mr-1" />Assign to me</Button>
              )}
              <Select value={c.status} onValueChange={(v) => updateCase.mutate({ id: c.id, patch: { status: v } })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{TS_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="investigation">
        <TabsList>
          <TabsTrigger value="investigation">Investigation</TabsTrigger>
          <TabsTrigger value="evidence">Evidence ({evidence.length})</TabsTrigger>
          <TabsTrigger value="enforcement">Enforcement ({enforcement.length})</TabsTrigger>
          <TabsTrigger value="appeals">Appeals ({appeals.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="investigation" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Internal Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
              {notes.map((n: any) => (
                <div key={n.id} className="border rounded p-3">
                  <p className="text-sm whitespace-pre-wrap">{n.note}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{format(new Date(n.created_at), "PPp")}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <Textarea placeholder="Add investigation note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                <Button disabled={!noteText || addNote.isPending}
                  onClick={async () => { await addNote.mutateAsync({ case_id: c.id, note: noteText }); setNoteText(""); }}>Add</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Evidence Log</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {evidence.length === 0 && <p className="text-sm text-muted-foreground">No evidence submitted.</p>}
              {evidence.map((e: any) => (
                <div key={e.id} className="border rounded p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{e.evidence_type}</Badge>
                    {e.is_locked && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
                  </div>
                  {e.description && <p className="text-sm mt-2">{e.description}</p>}
                  {e.content && <pre className="text-xs bg-muted/30 rounded p-2 mt-2 whitespace-pre-wrap">{e.content}</pre>}
                  {e.file_url && <a href={e.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Open file</a>}
                  <p className="text-[11px] text-muted-foreground mt-1">{format(new Date(e.submitted_at), "PPp")}</p>
                </div>
              ))}
              <div className="border rounded p-3 space-y-2 bg-muted/20">
                <p className="text-sm font-medium">Add evidence (locked once submitted)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={evForm.evidence_type} onValueChange={(v) => setEvForm({ ...evForm, evidence_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["screenshot", "video", "link", "message", "document", "other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Description" value={evForm.description}
                    onChange={(e) => setEvForm({ ...evForm, description: e.target.value })} />
                </div>
                <Textarea placeholder="Content / URL / notes" value={evForm.content}
                  onChange={(e) => setEvForm({ ...evForm, content: e.target.value })} />
                <Button size="sm" disabled={!evForm.content || addEvidence.isPending}
                  onClick={async () => { await addEvidence.mutateAsync({ case_id: c.id, ...evForm }); setEvForm({ evidence_type: "screenshot", content: "", description: "" }); }}>
                  Submit evidence
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enforcement" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Gavel className="h-4 w-4" />Enforcement Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {enforcement.map((a: any) => (
                <div key={a.id} className="border rounded p-3">
                  <div className="flex items-center gap-2">
                    <Badge>{a.action_type}</Badge>
                    <Badge variant="outline">{a.target_type}</Badge>
                    <Badge variant="secondary">Policy: {a.policy_reference}</Badge>
                  </div>
                  <p className="text-sm mt-2">{a.reason}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{format(new Date(a.created_at), "PPp")}</p>
                </div>
              ))}
              <div className="border rounded p-3 space-y-2 bg-muted/20">
                <p className="text-sm font-medium">Apply enforcement</p>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={enfForm.action_type} onValueChange={(v) => setEnfForm({ ...enfForm, action_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TS_ENFORCEMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={enfForm.target_type} onValueChange={(v) => setEnfForm({ ...enfForm, target_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["user", "content", "organization", "creator"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Select value={enfForm.policy_reference} onValueChange={(v) => setEnfForm({ ...enfForm, policy_reference: v })}>
                  <SelectTrigger><SelectValue placeholder="Select policy reference (required)" /></SelectTrigger>
                  <SelectContent>
                    {policies.map((p: any) => <SelectItem key={p.code} value={p.code}>{p.code} — {p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Reason (required)" value={enfForm.reason}
                  onChange={(e) => setEnfForm({ ...enfForm, reason: e.target.value })} />
                <Button size="sm"
                  disabled={!enfForm.reason || !enfForm.policy_reference || apply.isPending}
                  onClick={async () => {
                    await apply.mutateAsync({ case_id: c.id, ...enfForm });
                    setEnfForm({ action_type: "warning", target_type: "user", reason: "", policy_reference: "" });
                  }}>Apply</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appeals" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Appeals</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {appeals.length === 0 && <p className="text-sm text-muted-foreground">No appeals filed.</p>}
              {appeals.map((a: any) => {
                const s = appealForm[a.id] ?? { decision: "upheld", notes: "" };
                return (
                  <div key={a.id} className="border rounded p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{a.status}</Badge>
                      {a.decision && <Badge>{a.decision}</Badge>}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{a.reason}</p>
                    {a.decision_notes && <p className="text-xs text-muted-foreground">Decision: {a.decision_notes}</p>}
                    {a.status !== "decided" && (
                      <div className="grid grid-cols-[150px_1fr_auto] gap-2 items-start">
                        <Select value={s.decision} onValueChange={(v) => setAppealForm({ ...appealForm, [a.id]: { ...s, decision: v } })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upheld">Upheld</SelectItem>
                            <SelectItem value="overturned">Overturned</SelectItem>
                            <SelectItem value="modified">Modified</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input placeholder="Decision notes" value={s.notes}
                          onChange={(e) => setAppealForm({ ...appealForm, [a.id]: { ...s, notes: e.target.value } })} />
                        <Button size="sm" disabled={!s.notes || reviewAppeal.isPending}
                          onClick={() => reviewAppeal.mutate({ id: a.id, decision: s.decision, decision_notes: s.notes, case_id: c.id })}>
                          Decide
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-2">
          {timeline.length === 0 && <p className="text-sm text-muted-foreground">No events.</p>}
          {timeline.map((t: any) => (
            <div key={t.id} className="border-l-2 border-primary/40 pl-3 py-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t.event_type}</Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(t.created_at), "PPp")}</span>
              </div>
              {t.description && <p className="text-sm mt-1">{t.description}</p>}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CaseDetail;
