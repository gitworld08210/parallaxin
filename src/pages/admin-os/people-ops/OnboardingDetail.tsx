import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  KeyRound,
  Mail,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ActivityItem,
  ConfirmDialog,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/components/admin-os/ds";
import {
  useActivateEmployee,
  useChecklist,
  useIssueTemporaryPassword,
  useManagerHistory,
  useOnboardingSession,
  useSendWelcomeEmail,
  useToggleChecklistItem,
  useWelcomeEmailHistory,
  type IssuedCredential,
} from "@/hooks/admin-os/useOnboarding";

export default function OnboardingDetail() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const { data: session, isLoading } = useOnboardingSession(employeeId);
  const { data: checklist = [] } = useChecklist(employeeId);
  const { data: welcomeHistory = [] } = useWelcomeEmailHistory(employeeId);
  const { data: managerHistory = [] } = useManagerHistory(employeeId);

  const toggleItem = useToggleChecklistItem();
  const issue = useIssueTemporaryPassword();
  const sendEmail = useSendWelcomeEmail();
  const activate = useActivateEmployee();

  const [issued, setIssued] = useState<IssuedCredential | null>(null);
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [activateOpen, setActivateOpen] = useState(false);

  if (isLoading) return <div className="p-6"><LoadingSkeleton rows={5} /></div>;
  if (!session)
    return (
      <div className="p-6">
        <EmptyState
          title="Onboarding not found"
          description="This employee has no active onboarding session."
          action={<Button asChild><Link to="/admin-os/people-ops/onboarding">Back to queue</Link></Button>}
        />
      </div>
    );

  const emp = session.employee!;
  const hrItems = checklist.filter((c) => c.owner === "hr");
  const empItems = checklist.filter((c) => c.owner === "employee");

  const hrDone = hrItems.filter((i) => i.completed).length;
  const empDone = empItems.filter((i) => i.completed).length;

  const canIssueCreds =
    !!session &&
    (session.stage === "hr_review" || session.stage === "account_provisioning" || session.stage === "background_check");

  const handleIssue = async () => {
    const cred = await issue.mutateAsync({
      employee_id: emp.id,
      employee_number: emp.employee_number,
      company_email: emp.company_email,
      session_id: session.id,
    });
    setIssued(cred);
    setEmailSubject(`Welcome to Aurelix — your account is ready`);
    setEmailBody(defaultWelcomeEmail(emp, cred));
    toast.success("Temporary password generated. Copy it now — it will not be shown again.");
  };

  const handleSend = async () => {
    if (!emailBody.trim() || !emailSubject.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    await sendEmail.mutateAsync({
      employee_id: emp.id,
      session_id: session.id,
      sent_to: emp.company_email,
      subject: emailSubject,
      body: emailBody,
    });
    setIssued(null);
    setEmailBody("");
    toast.success("Welcome email recorded");
  };

  const handleActivate = async () => {
    await activate.mutateAsync({ employee_id: emp.id, session_id: session.id });
    setActivateOpen(false);
    toast.success(`${emp.full_name} is now active`);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow={`Onboarding · ${emp.employee_number}`}
        title={emp.full_name}
        description={`${emp.department?.name ?? "No department"} · ${emp.role?.name ?? "No role"}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin-os/people-ops/onboarding"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to={`/admin-os/people-ops/employees/${emp.id}`}>Open passport</Link>
            </Button>
          </>
        }
      />

      <SectionCard title="Status">
        <div className="flex flex-wrap items-center gap-4">
          <StatusBadge tone="info" label={`Stage: ${session.stage.replace(/_/g, " ")}`} />
          <StatusBadge tone={emp.employment_status === "active" ? "active" : "pending"} label={`Employee: ${emp.employment_status}`} />
          <span className="text-sm text-muted-foreground">
            Joining: {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : "TBD"}
          </span>
          <span className="text-sm text-muted-foreground">
            Manager: {emp.reporting_manager?.full_name ?? "Unassigned"}
          </span>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={`HR checklist · ${hrDone}/${hrItems.length}`}>
          <ul className="space-y-2">
            {hrItems.map((it) => (
              <li key={it.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3">
                <Checkbox
                  checked={it.completed}
                  onCheckedChange={(v) =>
                    toggleItem.mutate({ id: it.id, employee_id: emp.id, completed: !!v, item_key: it.item_key })
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className={it.completed ? "text-sm line-through text-muted-foreground" : "text-sm"}>
                    {it.label}
                  </div>
                  {it.completed_at ? (
                    <div className="text-xs text-muted-foreground">
                      Completed {new Date(it.completed_at).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={`Employee checklist · ${empDone}/${empItems.length}`}>
          <ul className="space-y-2">
            {empItems.map((it) => (
              <li key={it.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3">
                <Checkbox
                  checked={it.completed}
                  onCheckedChange={(v) =>
                    toggleItem.mutate({ id: it.id, employee_id: emp.id, completed: !!v, item_key: it.item_key })
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className={it.completed ? "text-sm line-through text-muted-foreground" : "text-sm"}>
                    {it.label}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Credentials & welcome email"
        description="HR issues a one-time temporary password, previews the welcome email, then sends it. Credentials are hashed at rest — copy them from the panel below immediately."
      >
        {!issued ? (
          <Button onClick={handleIssue} disabled={!canIssueCreds || issue.isPending}>
            <KeyRound className="mr-2 h-4 w-4" />
            {issue.isPending ? "Generating…" : "Generate temporary password"}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-warning">
                <ShieldCheck className="h-4 w-4" /> One-time credentials · expires{" "}
                {new Date(issued.expires_at).toLocaleString()}
              </div>
              <div className="grid gap-2 text-sm">
                <CredRow label="Employee ID" value={issued.employee_number} />
                <CredRow label="Login email" value={issued.company_email} />
                <CredRow label="Temporary password" value={issued.temporary_password} mono />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subj">Email subject</Label>
              <input
                id="subj"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Email body (preview)</Label>
              <Textarea
                id="body"
                rows={12}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleSend} disabled={sendEmail.isPending}>
                <Mail className="mr-2 h-4 w-4" />
                {sendEmail.isPending ? "Recording…" : "Send welcome email"}
              </Button>
              <Button variant="ghost" onClick={() => setIssued(null)}>Discard</Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Activation"
        description="Only run this after credentials are issued, welcome email is sent, and the employee has confirmed first-day readiness."
      >
        <Button
          variant="default"
          disabled={session.stage === "completed"}
          onClick={() => setActivateOpen(true)}
        >
          <UserCheck className="mr-2 h-4 w-4" />
          {session.stage === "completed" ? "Already active" : "Activate employee"}
        </Button>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Welcome email history">
          {welcomeHistory.length === 0 ? (
            <EmptyState title="Not sent yet" description="Welcome emails will appear here after HR sends them." />
          ) : (
            <div className="space-y-2">
              {welcomeHistory.map((w: any) => (
                <ActivityItem
                  key={w.id}
                  icon={Mail}
                  title={w.subject}
                  meta={`To ${w.sent_to}`}
                  timestamp={new Date(w.sent_at).toLocaleString()}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Manager assignment history">
          {managerHistory.length === 0 ? (
            <EmptyState title="No changes yet" description="Every reporting-manager change is logged here." />
          ) : (
            <div className="space-y-2">
              {managerHistory.map((h: any) => (
                <ActivityItem
                  key={h.id}
                  title={`${h.previous?.full_name ?? "—"} → ${h.next?.full_name ?? "—"}`}
                  meta={h.reason ?? "No reason provided"}
                  timestamp={new Date(h.changed_at).toLocaleString()}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <ConfirmDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        title={`Activate ${emp.full_name}?`}
        description="This marks the employee as active and closes the onboarding session. Access is granted immediately based on their assigned role."
        confirmLabel="Activate"
        onConfirm={handleActivate}
        loading={activate.isPending}
      />
    </div>
  );
}

function CredRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className={mono ? "rounded bg-muted px-2 py-1 font-mono text-sm" : "text-sm"}>{value}</code>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Copied");
          }}
          aria-label={`Copy ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function defaultWelcomeEmail(
  emp: NonNullable<ReturnType<typeof useOnboardingSession>["data"]>["employee"] & object,
  cred: IssuedCredential,
): string {
  return `Hi ${emp.full_name.split(" ")[0]},

Welcome to Aurelix! We're excited to have you on the team.

Your account is ready. Please sign in at https://app.aurelix.io using the details below and change your password immediately.

Employee ID: ${cred.employee_number}
Login email: ${cred.company_email}
Temporary password: ${cred.temporary_password}
Password expires: ${new Date(cred.expires_at).toLocaleString()}

Joining date: ${emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : "TBD"}
Department: ${emp.department?.name ?? "—"}
Reporting manager: ${emp.reporting_manager?.full_name ?? "—"}

First-day checklist:
  1. Sign in and change your password
  2. Enable two-factor authentication
  3. Complete your profile
  4. Accept the company policies

If you have any trouble, reply to this email and People Ops will help you out.

— Aurelix People Ops`;
}
