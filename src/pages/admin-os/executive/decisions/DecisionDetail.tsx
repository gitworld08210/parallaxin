/**
 * Phase 3.5 — Strategic Decision Detail: lifecycle, versions, timeline,
 * impact, participants, dependencies and attachments.
 */
import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/admin-os/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  useDecision, useDecisionVersions, useDecisionTimeline, useDecisionImpact,
  useDecisionParticipants, useDecisionAttachments, useAddParticipant,
  useRemoveParticipant, useAddImpact, useAddTimelineNote, useTransitionDecision,
  useUpdateDecision, useUploadAttachment, attachmentSignedUrl,
  type DecisionStatus,
} from "@/hooks/admin-os/useStrategicDecisions";
import {
  ChevronLeft, Gavel, GitCommit, Users, Paperclip, Activity, TrendingUp, Trash2, Upload,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_TONE: Record<DecisionStatus, "info" | "warning" | "success" | "danger" | "neutral"> = {
  draft: "neutral", discussion: "info", review: "warning", approved: "info",
  implementation: "warning", monitoring: "info", completed: "success", archived: "neutral",
};

const NEXT: Record<DecisionStatus, DecisionStatus[]> = {
  draft: ["discussion", "archived"],
  discussion: ["review", "draft"],
  review: ["approved", "discussion"],
  approved: ["implementation"],
  implementation: ["monitoring"],
  monitoring: ["completed", "implementation"],
  completed: ["archived"],
  archived: [],
};

const IMPACT_KINDS = ["expected","actual","financial","operational","employee","customer","risk","lessons"];

const DecisionDetail = () => {
  const { id = "" } = useParams();
  const { data: decision, isLoading } = useDecision(id);
  const { data: versions = [] } = useDecisionVersions(id);
  const { data: timeline = [] } = useDecisionTimeline(id);
  const { data: impacts = [] } = useDecisionImpact(id);
  const { data: participants = [] } = useDecisionParticipants(id);
  const { data: attachments = [] } = useDecisionAttachments(id);

  const transition = useTransitionDecision();
  const update = useUpdateDecision();
  const addParticipant = useAddParticipant();
  const removeParticipant = useRemoveParticipant();
  const addImpact = useAddImpact();
  const addNote = useAddTimelineNote();
  const upload = useUploadAttachment();

  const [note, setNote] = useState("");
  const [pForm, setPForm] = useState({ user_id: "", role: "contributor" });
  const [impForm, setImpForm] = useState({ kind: "expected", summary: "" });
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [editChangelog, setEditChangelog] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const editable = useMemo(() => decision, [decision]);

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!decision) return <EmptyState icon={Gavel} title="Decision not found" />;

  const nextStates = NEXT[decision.status];

  const saveEdits = async () => {
    const patch: any = {};
    for (const [k, v] of Object.entries(edit)) if (v !== undefined) patch[k] = v;
    if (Object.keys(patch).length === 0) return toast.info("Nothing to save");
    await update.mutateAsync({ id: decision.id, patch, changelog: editChangelog || undefined });
    setEdit({}); setEditChangelog("");
    toast.success("Saved as new version");
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin-os/executive/decisions"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3 w-3" /> Back to Decision Center
        </Link>
      </div>

      <PageHeader
        eyebrow={`STRATEGIC DECISION · ${decision.category.toUpperCase()}`}
        title={decision.title}
        description={`${decision.decision_code} · v${decision.current_version} · priority ${decision.priority}`}
        actions={<StatusBadge tone={STATUS_TONE[decision.status]} label={decision.status} />}
      />

      <SectionCard title="Lifecycle">
        <div className="flex flex-wrap gap-2">
          {nextStates.length === 0
            ? <p className="text-xs text-muted-foreground">Terminal state.</p>
            : nextStates.map((s) => (
                <Button key={s} size="sm"
                  variant={s === "completed" || s === "approved" ? "default" : "outline"}
                  onClick={async () => {
                    await transition.mutateAsync({ id: decision.id, to: s });
                    toast.success(`Moved to ${s}`);
                  }}>
                  → {s}
                </Button>
              ))}
        </div>
      </SectionCard>

      <Tabs defaultValue="record">
        <TabsList>
          <TabsTrigger value="record"><Gavel className="h-3.5 w-3.5 mr-1.5" />Record</TabsTrigger>
          <TabsTrigger value="timeline"><Activity className="h-3.5 w-3.5 mr-1.5" />Timeline</TabsTrigger>
          <TabsTrigger value="versions"><GitCommit className="h-3.5 w-3.5 mr-1.5" />Versions</TabsTrigger>
          <TabsTrigger value="impact"><TrendingUp className="h-3.5 w-3.5 mr-1.5" />Impact</TabsTrigger>
          <TabsTrigger value="people"><Users className="h-3.5 w-3.5 mr-1.5" />Participants</TabsTrigger>
          <TabsTrigger value="files"><Paperclip className="h-3.5 w-3.5 mr-1.5" />Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="space-y-4 pt-4">
          {([
            ["summary","Executive summary"],
            ["business_problem","Business problem"],
            ["objectives","Objectives"],
            ["alternatives_considered","Alternatives considered"],
            ["risk_assessment","Risk assessment"],
            ["expected_benefits","Expected benefits"],
          ] as const).map(([k, label]) => (
            <SectionCard key={k} title={label}>
              <Textarea rows={3}
                defaultValue={(editable as any)?.[k] ?? ""}
                onChange={(e) => setEdit((prev) => ({ ...prev, [k]: e.target.value }))} />
            </SectionCard>
          ))}
          <SectionCard title="Save changes">
            <div className="space-y-2">
              <Label>Changelog (optional)</Label>
              <Input value={editChangelog} onChange={(e) => setEditChangelog(e.target.value)}
                placeholder="What changed and why" />
              <Button onClick={saveEdits} disabled={update.isPending}>Save new version</Button>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4 pt-4">
          <SectionCard title="Add note">
            <div className="flex gap-2">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an executive note…" />
              <Button onClick={async () => {
                if (!note.trim()) return;
                await addNote.mutateAsync({ decision_id: decision.id, note });
                setNote(""); toast.success("Note added");
              }}>Add</Button>
            </div>
          </SectionCard>
          <SectionCard title="Timeline" padded={false}>
            {timeline.length === 0
              ? <div className="p-6"><EmptyState icon={Activity} title="No events yet" /></div>
              : (
                <ul className="divide-y divide-border/60">
                  {timeline.map((t) => (
                    <li key={t.id} className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{t.event_type}</span>
                        <span className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</span>
                      </div>
                      {t.note && <p className="text-sm mt-1">{t.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="versions" className="pt-4">
          <SectionCard title="Version history" description="Every version is a permanent snapshot." padded={false}>
            {versions.length === 0
              ? <div className="p-6 text-sm text-muted-foreground">No versions.</div>
              : (
                <ul className="divide-y divide-border/60">
                  {versions.map((v) => (
                    <li key={v.id} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">v{v.version}</p>
                        <span className="text-[11px] text-muted-foreground">{new Date(v.created_at).toLocaleString()}</span>
                      </div>
                      {v.changelog && <p className="text-xs text-muted-foreground mt-1">{v.changelog}</p>}
                    </li>
                  ))}
                </ul>
              )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="impact" className="space-y-4 pt-4">
          <SectionCard title="Record impact">
            <div className="grid md:grid-cols-3 gap-2">
              <Select value={impForm.kind} onValueChange={(v) => setImpForm({ ...impForm, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{IMPACT_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="md:col-span-2" placeholder="Summary"
                value={impForm.summary} onChange={(e) => setImpForm({ ...impForm, summary: e.target.value })} />
            </div>
            <Button className="mt-3" onClick={async () => {
              if (!impForm.summary) return toast.error("Summary required");
              await addImpact.mutateAsync({ decision_id: decision.id, ...impForm });
              setImpForm({ kind: "expected", summary: "" });
              toast.success("Impact recorded");
            }}>Record</Button>
          </SectionCard>
          <SectionCard title="Recorded impact" padded={false}>
            {impacts.length === 0
              ? <div className="p-6 text-sm text-muted-foreground">No impact recorded yet.</div>
              : (
                <ul className="divide-y divide-border/60">
                  {impacts.map((i) => (
                    <li key={i.id} className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge tone="info" label={i.kind} />
                        <span className="text-[11px] text-muted-foreground">{new Date(i.recorded_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm mt-1">{i.summary}</p>
                    </li>
                  ))}
                </ul>
              )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="people" className="space-y-4 pt-4">
          <SectionCard title="Add participant">
            <div className="grid md:grid-cols-3 gap-2">
              <Input className="md:col-span-2" placeholder="user id (uuid)"
                value={pForm.user_id} onChange={(e) => setPForm({ ...pForm, user_id: e.target.value })} />
              <Select value={pForm.role} onValueChange={(v) => setPForm({ ...pForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["owner","reviewer","approver","contributor","observer"].map((r) =>
                    <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="mt-3" onClick={async () => {
              if (!pForm.user_id) return toast.error("User id required");
              await addParticipant.mutateAsync({ decision_id: decision.id, ...pForm });
              setPForm({ user_id: "", role: "contributor" });
              toast.success("Participant added");
            }}>Add</Button>
          </SectionCard>
          <SectionCard title="Participants" padded={false}>
            {participants.length === 0
              ? <div className="p-6"><EmptyState icon={Users} title="No participants yet" /></div>
              : (
                <ul className="divide-y divide-border/60">
                  {participants.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="font-mono text-xs text-muted-foreground flex-1 truncate">{p.user_id}</span>
                      <StatusBadge tone="neutral" label={p.role} />
                      <Button size="icon" variant="ghost" onClick={async () => {
                        await removeParticipant.mutateAsync({ id: p.id, decision_id: decision.id });
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </li>
                  ))}
                </ul>
              )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="files" className="space-y-4 pt-4">
          <SectionCard title="Upload attachment">
            <div className="flex items-center gap-2">
              <input type="file" ref={fileRef} className="text-sm" />
              <Button onClick={async () => {
                const f = fileRef.current?.files?.[0];
                if (!f) return toast.error("Pick a file");
                await upload.mutateAsync({ decisionId: decision.id, file: f });
                if (fileRef.current) fileRef.current.value = "";
                toast.success("Uploaded");
              }} disabled={upload.isPending}>
                <Upload className="h-4 w-4 mr-1.5" />Upload
              </Button>
            </div>
          </SectionCard>
          <SectionCard title="Attachments" padded={false}>
            {attachments.length === 0
              ? <div className="p-6"><EmptyState icon={Paperclip} title="No attachments yet" /></div>
              : (
                <ul className="divide-y divide-border/60">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{a.file_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          v{a.version} · {a.mime_type ?? "—"} · {a.size_bytes ? `${Math.round(a.size_bytes / 1024)} KB` : "—"} ·
                          {" "}{new Date(a.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          const url = await attachmentSignedUrl(a.storage_path);
                          window.open(url, "_blank");
                        } catch (e: any) {
                          toast.error(e.message ?? "Cannot access file");
                        }
                      }}>Open</Button>
                    </li>
                  ))}
                </ul>
              )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DecisionDetail;
