import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useTicket, useAddMessage, useAddNote, useEscalate, useToggleSla, useUpdateTicket, useSubmitFeedback,
  type SupStatus, type SupPriority,
} from "@/hooks/admin-os/useSupport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const statuses: SupStatus[] = ["open", "assigned", "in_progress", "waiting_customer", "waiting_internal", "escalated", "resolved", "closed", "reopened"];
const priorities: SupPriority[] = ["critical", "high", "medium", "low"];
const escalationTargets = [
  { key: "verification", label: "Verification" },
  { key: "trust_safety", label: "Trust & Safety" },
  { key: "people_ops", label: "HR / People Ops" },
  { key: "security", label: "Security" },
  { key: "engineering", label: "Engineering" },
  { key: "founder_office", label: "Founder Office" },
];

const TicketWorkspace = () => {
  const { id } = useParams();
  const { data } = useTicket(id);
  const update = useUpdateTicket();
  const addMsg = useAddMessage();
  const addNote = useAddNote();
  const escalate = useEscalate();
  const toggleSla = useToggleSla();
  const submitFb = useSubmitFeedback();

  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("investigation");
  const [escTarget, setEscTarget] = useState("verification");
  const [escReason, setEscReason] = useState("");
  const [slaPolicy, setSlaPolicy] = useState("");
  const [rating, setRating] = useState(5);
  const [fbComment, setFbComment] = useState("");

  if (!data?.ticket) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const t = data.ticket;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>{t.subject}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t.ticket_number} · {t.category} · {t.source} · {t.requester_display}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t.priority}</Badge>
                <Badge variant="outline">{t.status}</Badge>
              </div>
            </div>
          </CardHeader>
          {t.description && <CardContent className="text-sm">{t.description}</CardContent>}
        </Card>

        <Tabs defaultValue="conversation">
          <TabsList>
            <TabsTrigger value="conversation">Conversation</TabsTrigger>
            <TabsTrigger value="notes">Internal notes</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="conversation" className="space-y-3">
            <Card><CardContent className="pt-4 space-y-3 text-sm">
              {data.messages.length === 0 && <p className="text-muted-foreground">No messages yet.</p>}
              {data.messages.map(m => (
                <div key={m.id} className="border rounded p-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{m.author_role}</span>
                    <span>{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                </div>
              ))}
              <div className="pt-2 space-y-2">
                <Textarea rows={3} placeholder="Write reply to customer" value={reply} onChange={e => setReply(e.target.value)} />
                <Button size="sm" disabled={!reply || addMsg.isPending}
                  onClick={() => addMsg.mutate({ ticket_id: t.id, body: reply, author_role: "agent" }, { onSuccess: () => setReply("") })}>
                  Send reply
                </Button>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-3">
            <Card><CardContent className="pt-4 space-y-3 text-sm">
              {data.notes.length === 0 && <p className="text-muted-foreground">No internal notes.</p>}
              {data.notes.map(n => (
                <div key={n.id} className="border rounded p-3 bg-amber-500/5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{n.note_type}</span>
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                </div>
              ))}
              <div className="pt-2 space-y-2">
                <div className="flex gap-2">
                  <Select value={noteType} onValueChange={setNoteType}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="investigation">Investigation</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="resolution">Resolution</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea rows={3} placeholder="Internal note (not visible to customer)" value={note} onChange={e => setNote(e.target.value)} />
                <Button size="sm" variant="outline" disabled={!note || addNote.isPending}
                  onClick={() => addNote.mutate({ ticket_id: t.id, body: note, note_type: noteType }, { onSuccess: () => setNote("") })}>
                  Save note
                </Button>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="history">
            <Card><CardContent className="pt-4 space-y-2 text-xs">
              {data.history.map(h => (
                <div key={h.id} className="flex items-center justify-between">
                  <span>{h.event_type}</span>
                  <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                </div>
              ))}
              {data.history.length === 0 && <p className="text-muted-foreground">No events.</p>}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Manage</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <Label>Status</Label>
              <Select value={t.status} onValueChange={(v) => update.mutate({ id: t.id, patch: { status: v as SupStatus } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={t.priority} onValueChange={(v) => update.mutate({ id: t.id, patch: { priority: v as SupPriority } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="pt-2 text-xs text-muted-foreground space-y-1">
              <div>First response due: {t.first_response_due_at ? new Date(t.first_response_due_at).toLocaleString() : "—"}</div>
              <div>Resolution due: {t.resolution_due_at ? new Date(t.resolution_due_at).toLocaleString() : "—"}</div>
              <div>SLA paused: {t.sla_paused ? "yes" : "no"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Escalate</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Target department</Label>
              <Select value={escTarget} onValueChange={setEscTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{escalationTargets.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Textarea rows={2} placeholder="Reason (required)" value={escReason} onChange={e => setEscReason(e.target.value)} />
            <Button className="w-full" size="sm" disabled={!escReason || escalate.isPending}
              onClick={() => escalate.mutate({ ticket_id: t.id, target_department_key: escTarget, reason: escReason }, { onSuccess: () => setEscReason("") })}>
              Escalate
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">SLA controls</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Policy ref (required)" value={slaPolicy} onChange={e => setSlaPolicy(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" disabled={!slaPolicy || t.sla_paused}
                onClick={() => toggleSla.mutate({ ticket_id: t.id, paused: true, policy_ref: slaPolicy })}>Pause</Button>
              <Button size="sm" variant="outline" className="flex-1" disabled={!slaPolicy || !t.sla_paused}
                onClick={() => toggleSla.mutate({ ticket_id: t.id, paused: false, policy_ref: slaPolicy })}>Resume</Button>
            </div>
          </CardContent>
        </Card>

        {(t.status === "resolved" || t.status === "closed") && (
          <Card>
            <CardHeader><CardTitle className="text-base">Customer feedback</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label>Rating (1-5)</Label>
                <Input type="number" min={1} max={5} value={rating} onChange={e => setRating(Number(e.target.value))} />
              </div>
              <Textarea rows={2} placeholder="Comment" value={fbComment} onChange={e => setFbComment(e.target.value)} />
              <Button size="sm" className="w-full" disabled={submitFb.isPending}
                onClick={() => submitFb.mutate({ ticket_id: t.id, rating, comment: fbComment }, { onSuccess: () => setFbComment("") })}>
                Submit feedback
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TicketWorkspace;
