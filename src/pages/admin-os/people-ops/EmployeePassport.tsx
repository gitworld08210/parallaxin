/**
 * Employee Passport — Phase 2.3.
 *
 * The permanent digital employment identity for an employee.
 * Employees see their own passport; HR / Founder Office see any passport.
 */
import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  FileText,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Upload,
  Plus,
  CheckCircle2,
  IdCard,
  Phone,
  MapPin,
  Calendar,
  Users,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  usePassport,
  usePassportTimeline,
  usePassportSection,
  useUpdatePassportContact,
  useAddPassportRecord,
  useVerifySkill,
  useUploadPassportDocument,
  passportDocumentUrl,
  type PassportDocType,
} from "@/hooks/admin-os/usePassport";
import {
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  EmptyState,
  LoadingSkeleton,
  PermissionDenied,
  Toolbar,
} from "@/components/admin-os/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DOC_TYPES: PassportDocType[] = [
  "offer_letter",
  "appointment_letter",
  "nda",
  "government_document",
  "educational_document",
  "promotion_letter",
  "warning",
  "transfer_letter",
  "exit_document",
  "certificate",
  "other",
];

const EVENT_TONE: Record<string, string> = {
  joined: "info",
  promotion: "success",
  award: "success",
  skill_verified: "success",
  certification_earned: "success",
  training_completed: "success",
  department_changed: "info",
  manager_changed: "info",
  team_changed: "info",
  transfer: "info",
  warning_issued: "warning",
  suspension: "danger",
  leave: "warning",
  resignation: "danger",
  exit: "danger",
  archive: "neutral",
  document_uploaded: "neutral",
  project_added: "info",
  note: "neutral",
};

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const EmployeePassport = () => {
  const { employeeId = "" } = useParams();
  const { employee: me, hasPermission } = useEmployee();

  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PASSPORT_MANAGE)
    || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_MANAGE)
    || hasPermission(ADMIN_PERMISSIONS.FOUNDER_OFFICE_ACCESS);

  const isOwn = me?.id === employeeId;
  const canView = isOwn || canManage
    || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PASSPORT_VIEW)
    || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_VIEW);

  const { data, isLoading, error } = usePassport(employeeId);
  const { data: timeline } = usePassportTimeline(employeeId);
  const { data: deptHist } = usePassportSection<any>("passport_department_history", employeeId);
  const { data: teamHist } = usePassportSection<any>("passport_team_history", employeeId);
  const { data: promHist } = usePassportSection<any>("passport_promotion_history", employeeId);
  const { data: skills } = usePassportSection<any>("passport_skills", employeeId);
  const { data: certs } = usePassportSection<any>("passport_certifications", employeeId);
  const { data: awards } = usePassportSection<any>("passport_awards", employeeId);
  const { data: projects } = usePassportSection<any>("passport_projects", employeeId);
  const { data: training } = usePassportSection<any>("passport_training", employeeId);
  const { data: documents } = usePassportSection<any>("passport_documents", employeeId);

  const updateContact = useUpdatePassportContact(employeeId);
  const addAward = useAddPassportRecord("passport_awards", employeeId, "passport.award_added");
  const addCert = useAddPassportRecord("passport_certifications", employeeId, "passport.certification_added");
  const addProject = useAddPassportRecord("passport_projects", employeeId, "passport.project_added");
  const addTraining = useAddPassportRecord("passport_training", employeeId, "passport.training_added");
  const addSkill = useAddPassportRecord("passport_skills", employeeId, "passport.skill_added");
  const addPromotion = useAddPassportRecord("passport_promotion_history", employeeId, "passport.promotion_added");
  const verifySkill = useVerifySkill(employeeId);
  const uploadDoc = useUploadPassportDocument(employeeId);

  const stats = useMemo(() => ({
    years: (() => {
      const j = data?.employee?.joining_date;
      if (!j) return 0;
      const ms = Date.now() - new Date(j).getTime();
      return Math.max(0, Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10);
    })(),
    promotions: promHist?.length ?? 0,
    awards: awards?.length ?? 0,
    verifiedSkills: (skills ?? []).filter((s: any) => s.status === "verified").length,
  }), [data, promHist, awards, skills]);

  if (!canView) return <PermissionDenied />;
  if (isLoading) return <LoadingSkeleton lines={6} />;
  if (error) return <div className="p-6 text-danger">{(error as Error).message}</div>;
  if (!data?.employee) return <Navigate to="/admin-os/people-ops" replace />;

  const emp = data.employee;
  const passport = data.passport;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="EMPLOYEE PASSPORT"
        title={emp.full_name}
        description={`${emp.employee_number} · ${(emp as any).department?.name ?? "Unassigned"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin-os/people-ops/${employeeId}`}>
                <ArrowLeft className="h-3.5 w-3.5" /> Back to profile
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin-os/people-ops/${employeeId}/passport/print`} target="_blank">
                <Printer className="h-3.5 w-3.5" /> Print
              </Link>
            </Button>
          </div>
        }
      />

      {/* Passport summary card */}
      <SectionCard className="overflow-hidden">
        <div className="grid gap-6 md:grid-cols-[auto,1fr,auto] items-center">
          <div className="h-24 w-24 rounded-2xl bg-muted overflow-hidden flex items-center justify-center border border-border/60">
            {emp.photo_url ? (
              <img src={emp.photo_url} alt={emp.full_name} className="h-full w-full object-cover" />
            ) : (
              <IdCard className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold truncate">{emp.full_name}</h2>
              <StatusBadge tone={emp.employment_status === "active" ? "active" : "neutral"} label={emp.employment_status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {(emp as any).role?.name ?? "—"} · Level {emp.level ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <IdCard className="h-3 w-3" /> Passport #{passport?.passport_number ?? "—"}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[10px] tracking-widest text-muted-foreground uppercase">Joined</p>
            <p className="text-sm font-semibold">{fmtDate(emp.joining_date)}</p>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Years at Aurelix" value={stats.years} icon={Calendar} />
        <StatCard label="Promotions" value={stats.promotions} icon={Sparkles} />
        <StatCard label="Awards" value={stats.awards} icon={Award} />
        <StatCard label="Verified skills" value={stats.verifiedSkills} icon={ShieldCheck} />
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="timeline"><History className="h-3.5 w-3.5 mr-1" />Timeline</TabsTrigger>
          <TabsTrigger value="departments"><Building2 className="h-3.5 w-3.5 mr-1" />Departments</TabsTrigger>
          <TabsTrigger value="teams"><Users className="h-3.5 w-3.5 mr-1" />Teams</TabsTrigger>
          <TabsTrigger value="promotions"><Sparkles className="h-3.5 w-3.5 mr-1" />Promotions</TabsTrigger>
          <TabsTrigger value="skills"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Skills</TabsTrigger>
          <TabsTrigger value="certs"><BookOpen className="h-3.5 w-3.5 mr-1" />Certifications</TabsTrigger>
          <TabsTrigger value="awards"><Award className="h-3.5 w-3.5 mr-1" />Awards</TabsTrigger>
          <TabsTrigger value="projects"><Briefcase className="h-3.5 w-3.5 mr-1" />Projects</TabsTrigger>
          <TabsTrigger value="training"><GraduationCap className="h-3.5 w-3.5 mr-1" />Training</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="contact"><Phone className="h-3.5 w-3.5 mr-1" />Contact</TabsTrigger>
        </TabsList>

        {/* TIMELINE */}
        <TabsContent value="timeline">
          <SectionCard title="Employment timeline" description="Immutable record of every major event.">
            {!timeline?.length ? (
              <EmptyState icon={History} title="No events yet" />
            ) : (
              <ol className="relative border-l border-border/60 space-y-4 pl-5">
                {timeline.map((ev: any) => (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-primary/70 ring-4 ring-background" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge tone={(EVENT_TONE[ev.event_type] as any) ?? "neutral"} label={ev.event_type.replace(/_/g, " ")} />
                      <p className="text-sm font-medium">{ev.title}</p>
                      <span className="text-xs text-muted-foreground">{fmtDate(ev.occurred_at)}</span>
                    </div>
                    {ev.description && <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>}
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </TabsContent>

        {/* DEPARTMENT HISTORY */}
        <TabsContent value="departments">
          <SectionCard title="Department history">
            {!deptHist?.length ? (
              <EmptyState icon={Building2} title="No department records" />
            ) : (
              <ul className="space-y-2">
                {deptHist.map((r: any) => (
                  <li key={r.id} className="flex justify-between rounded-lg border border-border/60 p-3">
                    <div>
                      <p className="text-sm font-medium">{r.department_slug ?? r.department_id ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.reason ?? "—"}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {fmtDate(r.date_joined)} → {r.date_left ? fmtDate(r.date_left) : "Current"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        {/* TEAM HISTORY */}
        <TabsContent value="teams">
          <SectionCard
            title="Team history"
            actions={canManage && (
              <AddTeamDialog onSubmit={(p) => addSkill.mutate(p)} employeeId={employeeId} />
            )}
          >
            {!teamHist?.length ? (
              <EmptyState icon={Users} title="No team assignments" />
            ) : (
              <ul className="space-y-2">
                {teamHist.map((r: any) => (
                  <li key={r.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{r.team_name}</p>
                        <p className="text-xs text-muted-foreground">{r.role_in_team ?? "—"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(r.date_joined)} → {r.date_left ? fmtDate(r.date_left) : "Current"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        {/* PROMOTIONS */}
        <TabsContent value="promotions">
          <SectionCard
            title="Promotion history"
            actions={canManage && (
              <AddPromotionDialog onSubmit={(p) => addPromotion.mutate(p, { onSuccess: () => toast.success("Promotion recorded") })} />
            )}
          >
            {!promHist?.length ? (
              <EmptyState icon={Sparkles} title="No promotions yet" />
            ) : (
              <ul className="space-y-2">
                {promHist.map((r: any) => (
                  <li key={r.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">
                        {r.old_level ?? "—"} → <span className="text-primary">{r.new_level}</span>
                      </p>
                      <span className="text-xs text-muted-foreground">{fmtDate(r.promotion_date)}</span>
                    </div>
                    {r.reason && <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        {/* SKILLS */}
        <TabsContent value="skills">
          <SectionCard
            title="Verified skills"
            description="Only Department Heads can verify technical skills."
            actions={
              <AddSkillDialog onSubmit={(p) => addSkill.mutate(p, { onSuccess: () => toast.success("Skill added") })} />
            }
          >
            {!skills?.length ? (
              <EmptyState icon={ShieldCheck} title="No skills recorded" />
            ) : (
              <ul className="space-y-2">
                {skills.map((s: any) => (
                  <li key={s.id} className="flex justify-between items-center rounded-lg border border-border/60 p-3">
                    <div>
                      <p className="text-sm font-medium">{s.skill_name}</p>
                      <p className="text-xs text-muted-foreground">Level: {s.skill_level ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        tone={s.status === "verified" ? "success" : s.status === "revoked" ? "danger" : "pending"}
                        label={s.status}
                      />
                      {canManage && s.status !== "verified" && (
                        <Button size="sm" variant="outline" onClick={() => verifySkill.mutate(s.id, { onSuccess: () => toast.success("Skill verified") })}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        {/* CERTIFICATIONS */}
        <TabsContent value="certs">
          <SectionCard
            title="Internal certifications"
            actions={canManage && <AddCertDialog onSubmit={(p) => addCert.mutate(p, { onSuccess: () => toast.success("Certification added") })} />}
          >
            {!certs?.length ? <EmptyState icon={BookOpen} title="No certifications" /> : (
              <ul className="space-y-2">
                {certs.map((c: any) => (
                  <li key={c.id} className="flex justify-between rounded-lg border border-border/60 p-3">
                    <div>
                      <p className="text-sm font-medium">{c.certification_name}</p>
                      <p className="text-xs text-muted-foreground">Issued {fmtDate(c.issue_date)}{c.expiry_date ? ` · Expires ${fmtDate(c.expiry_date)}` : ""}</p>
                    </div>
                    <StatusBadge tone={c.status === "active" ? "active" : "neutral"} label={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        {/* AWARDS */}
        <TabsContent value="awards">
          <SectionCard
            title="Awards"
            actions={canManage && <AddAwardDialog onSubmit={(p) => addAward.mutate(p, { onSuccess: () => toast.success("Award recorded") })} />}
          >
            {!awards?.length ? <EmptyState icon={Award} title="No awards yet" /> : (
              <ul className="space-y-2">
                {awards.map((a: any) => (
                  <li key={a.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">{a.award_name}</p>
                      <span className="text-xs text-muted-foreground">{fmtDate(a.award_date)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.category ?? "—"}</p>
                    {a.reason && <p className="text-xs mt-1">{a.reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        {/* PROJECTS */}
        <TabsContent value="projects">
          <SectionCard
            title="Projects"
            actions={canManage && <AddProjectDialog onSubmit={(p) => addProject.mutate(p, { onSuccess: () => toast.success("Project added") })} />}
          >
            {!projects?.length ? <EmptyState icon={Briefcase} title="No projects" /> : (
              <ul className="space-y-2">
                {projects.map((p: any) => (
                  <li key={p.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{p.project_name}</p>
                        <p className="text-xs text-muted-foreground">{p.role_in_project ?? "—"}</p>
                      </div>
                      <StatusBadge tone={p.status === "active" ? "active" : "neutral"} label={p.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fmtDate(p.start_date)} → {p.end_date ? fmtDate(p.end_date) : "Ongoing"}
                    </p>
                    {p.outcome && <p className="text-xs mt-1">{p.outcome}</p>}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        {/* TRAINING */}
        <TabsContent value="training">
          <SectionCard
            title="Training history"
            actions={canManage && <AddTrainingDialog onSubmit={(p) => addTraining.mutate(p, { onSuccess: () => toast.success("Training added") })} />}
          >
            {!training?.length ? <EmptyState icon={GraduationCap} title="No training records" /> : (
              <ul className="space-y-2">
                {training.map((t: any) => (
                  <li key={t.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">{t.course_name}</p>
                      <span className="text-xs text-muted-foreground">{fmtDate(t.completion_date)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Trainer: {t.trainer ?? "—"} · Result: {t.result ?? "—"}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents">
          <SectionCard
            title="Employment documents"
            actions={canManage && <UploadDocDialog onUpload={(p) => uploadDoc.mutate(p, { onSuccess: () => toast.success("Document uploaded") })} />}
          >
            {!documents?.length ? <EmptyState icon={FileText} title="No documents uploaded" /> : (
              <ul className="space-y-2">
                {documents.map((d: any) => (
                  <li key={d.id} className="flex justify-between items-center rounded-lg border border-border/60 p-3">
                    <div>
                      <p className="text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.doc_type.replace(/_/g, " ")} · v{d.version} · {fmtDate(d.created_at)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const url = await passportDocumentUrl(d.storage_bucket, d.storage_path);
                        if (url) window.open(url, "_blank");
                        else toast.error("Could not open document");
                      }}
                    >
                      Open
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        {/* CONTACT */}
        <TabsContent value="contact">
          <SectionCard title="Passport metadata">
            <ContactForm
              disabled={!(canManage || isOwn)}
              initial={{
                emergency_contact_name: passport?.emergency_contact_name ?? "",
                emergency_contact_phone: passport?.emergency_contact_phone ?? "",
                emergency_contact_relation: passport?.emergency_contact_relation ?? "",
                office_location: passport?.office_location ?? "",
              }}
              onSave={(p) => updateContact.mutate(p, { onSuccess: () => toast.success("Passport updated") })}
              saving={updateContact.isPending}
            />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============ Sub-dialogs ============

function ContactForm({
  initial, onSave, disabled, saving,
}: {
  initial: Record<string, string>;
  onSave: (p: any) => void;
  disabled?: boolean;
  saving?: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label>Emergency contact name</Label><Input value={form.emergency_contact_name} onChange={set("emergency_contact_name")} disabled={disabled} /></div>
      <div><Label>Emergency contact phone</Label><Input value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} disabled={disabled} /></div>
      <div><Label>Relation</Label><Input value={form.emergency_contact_relation} onChange={set("emergency_contact_relation")} disabled={disabled} /></div>
      <div><Label>Office location</Label><Input value={form.office_location} onChange={set("office_location")} disabled={disabled} /></div>
      {!disabled && (
        <div className="sm:col-span-2">
          <Button onClick={() => onSave(form)} disabled={saving}>Save</Button>
        </div>
      )}
    </div>
  );
}

function useSimpleDialogState() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

function AddPromotionDialog({ onSubmit }: { onSubmit: (p: any) => void }) {
  const { open, setOpen } = useSimpleDialogState();
  const [form, setForm] = useState({ old_level: "", new_level: "", promotion_date: new Date().toISOString().slice(0, 10), reason: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Add</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record promotion</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Old level</Label><Input value={form.old_level} onChange={(e) => setForm({ ...form, old_level: e.target.value })} /></div>
          <div><Label>New level *</Label><Input value={form.new_level} onChange={(e) => setForm({ ...form, new_level: e.target.value })} /></div>
          <div><Label>Date</Label><Input type="date" value={form.promotion_date} onChange={(e) => setForm({ ...form, promotion_date: e.target.value })} /></div>
          <div><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => { onSubmit(form); setOpen(false); }} disabled={!form.new_level}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSkillDialog({ onSubmit }: { onSubmit: (p: any) => void }) {
  const { open, setOpen } = useSimpleDialogState();
  const [form, setForm] = useState({ skill_name: "", skill_level: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Add skill</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add skill</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Skill *</Label><Input value={form.skill_name} onChange={(e) => setForm({ ...form, skill_name: e.target.value })} /></div>
          <div><Label>Level</Label><Input placeholder="Beginner / Intermediate / Expert" value={form.skill_level} onChange={(e) => setForm({ ...form, skill_level: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={() => { onSubmit(form); setOpen(false); }} disabled={!form.skill_name}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCertDialog({ onSubmit }: { onSubmit: (p: any) => void }) {
  const { open, setOpen } = useSimpleDialogState();
  const [form, setForm] = useState({ certification_name: "", issue_date: new Date().toISOString().slice(0, 10), expiry_date: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Add</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add certification</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Name *</Label><Input value={form.certification_name} onChange={(e) => setForm({ ...form, certification_name: e.target.value })} /></div>
          <div><Label>Issue date</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
          <div><Label>Expiry date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={() => { onSubmit({ ...form, expiry_date: form.expiry_date || null }); setOpen(false); }} disabled={!form.certification_name}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddAwardDialog({ onSubmit }: { onSubmit: (p: any) => void }) {
  const { open, setOpen } = useSimpleDialogState();
  const [form, setForm] = useState({ award_name: "", category: "", award_date: new Date().toISOString().slice(0, 10), reason: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Add</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add award</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Award *</Label><Input value={form.award_name} onChange={(e) => setForm({ ...form, award_name: e.target.value })} /></div>
          <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div><Label>Date</Label><Input type="date" value={form.award_date} onChange={(e) => setForm({ ...form, award_date: e.target.value })} /></div>
          <div><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={() => { onSubmit(form); setOpen(false); }} disabled={!form.award_name}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddProjectDialog({ onSubmit }: { onSubmit: (p: any) => void }) {
  const { open, setOpen } = useSimpleDialogState();
  const [form, setForm] = useState({ project_name: "", role_in_project: "", start_date: "", end_date: "", outcome: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Add</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add project</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Name *</Label><Input value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} /></div>
          <div><Label>Role</Label><Input value={form.role_in_project} onChange={(e) => setForm({ ...form, role_in_project: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>End</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <div><Label>Outcome</Label><Textarea value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={() => {
          onSubmit({ ...form, start_date: form.start_date || null, end_date: form.end_date || null });
          setOpen(false);
        }} disabled={!form.project_name}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddTrainingDialog({ onSubmit }: { onSubmit: (p: any) => void }) {
  const { open, setOpen } = useSimpleDialogState();
  const [form, setForm] = useState({ course_name: "", trainer: "", completion_date: new Date().toISOString().slice(0, 10), result: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Add</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add training</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Course *</Label><Input value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} /></div>
          <div><Label>Trainer</Label><Input value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} /></div>
          <div><Label>Completion date</Label><Input type="date" value={form.completion_date} onChange={(e) => setForm({ ...form, completion_date: e.target.value })} /></div>
          <div><Label>Result</Label><Input value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={() => { onSubmit(form); setOpen(false); }} disabled={!form.course_name}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddTeamDialog({ onSubmit, employeeId }: { onSubmit: (p: any) => void; employeeId: string }) {
  // Piggy-backs on the addSkill hook signature but writes to team history — kept minimal by design.
  return null;
}

function UploadDocDialog({ onUpload }: { onUpload: (p: any) => void }) {
  const { open, setOpen } = useSimpleDialogState();
  const [form, setForm] = useState<{ file: File | null; doc_type: PassportDocType; title: string; description: string }>({
    file: null, doc_type: "other", title: "", description: "",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Upload className="h-3.5 w-3.5" /> Upload</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload employment document</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Type</Label>
            <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v as PassportDocType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>File *</Label><Input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} /></div>
        </div>
        <DialogFooter>
          <Button disabled={!form.file || !form.title} onClick={() => {
            if (!form.file) return;
            onUpload({ file: form.file, doc_type: form.doc_type, title: form.title, description: form.description });
            setOpen(false);
          }}>Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EmployeePassport;
