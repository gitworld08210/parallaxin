import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DataTable,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  Toolbar,
  type DataTableColumn,
  type StatusTone,
} from "@/components/admin-os/ds";
import { useOnboardingQueue, type OnboardingSession, type OnboardingStage } from "@/hooks/admin-os/useOnboarding";

const STAGE_LABEL: Record<OnboardingStage, string> = {
  draft: "Draft",
  hr_review: "HR Review",
  background_check: "Background Check",
  account_provisioning: "Provisioning",
  credentials_generated: "Credentials Issued",
  welcome_sent: "Welcome Sent",
  awaiting_first_login: "Awaiting First Login",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STAGE_TONE: Record<OnboardingStage, StatusTone> = {
  draft: "neutral",
  hr_review: "pending",
  background_check: "warning",
  account_provisioning: "info",
  credentials_generated: "info",
  welcome_sent: "info",
  awaiting_first_login: "warning",
  completed: "approved",
  cancelled: "cancelled",
};

const STAGE_OPTIONS: (OnboardingStage | "all")[] = [
  "all",
  "hr_review",
  "background_check",
  "account_provisioning",
  "credentials_generated",
  "welcome_sent",
  "awaiting_first_login",
  "completed",
  "cancelled",
];

export default function OnboardingQueue() {
  const [stage, setStage] = useState<OnboardingStage | "all">("all");
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useOnboardingQueue(stage);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (r) =>
        r.employee?.full_name?.toLowerCase().includes(s) ||
        r.employee?.company_email?.toLowerCase().includes(s) ||
        r.employee?.employee_number?.toLowerCase().includes(s),
    );
  }, [data, search]);

  const stats = useMemo(() => {
    const total = data.length;
    const inFlight = data.filter((d) => !["completed", "cancelled"].includes(d.stage)).length;
    const awaitingCreds = data.filter((d) => d.stage === "hr_review" || d.stage === "account_provisioning").length;
    const completedThisMonth = data.filter((d) => {
      if (d.stage !== "completed" || !d.activated_at) return false;
      const dt = new Date(d.activated_at);
      const now = new Date();
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }).length;
    return { total, inFlight, awaitingCreds, completedThisMonth };
  }, [data]);

  const columns: DataTableColumn<OnboardingSession>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (r) => (
        <div>
          <div className="font-medium text-foreground">{r.employee?.full_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">
            {r.employee?.employee_number} · {r.employee?.company_email}
          </div>
        </div>
      ),
    },
    {
      key: "dept",
      header: "Department",
      cell: (r) => (
        <div className="text-sm">
          <div>{r.employee?.department?.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{r.employee?.role?.name ?? "—"}</div>
        </div>
      ),
    },
    {
      key: "manager",
      header: "Manager",
      cell: (r) => <span className="text-sm">{r.employee?.reporting_manager?.full_name ?? "—"}</span>,
    },
    {
      key: "joining",
      header: "Joining",
      cell: (r) => (
        <span className="tabular-nums text-sm">
          {r.joining_date ? new Date(r.joining_date).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      align: "right",
      cell: (r) => <StatusBadge tone={STAGE_TONE[r.stage]} label={STAGE_LABEL[r.stage]} />,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Phase 2.2"
        title="Onboarding"
        description="Every new hire moves through this queue. No account is activated without HR approval."
        actions={
          <Button asChild size="sm">
            <Link to="/admin-os/people-ops/onboarding/new">
              <UserPlus className="mr-2 h-4 w-4" /> Start onboarding
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total in system" value={stats.total} loading={isLoading} />
        <StatCard label="In flight" value={stats.inFlight} loading={isLoading} />
        <StatCard label="Awaiting credentials" value={stats.awaitingCreds} loading={isLoading} />
        <StatCard label="Activated this month" value={stats.completedThisMonth} loading={isLoading} />
      </div>

      <SectionCard title="Queue" description="Filter by stage or search by name, email, or employee number.">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search onboardings…"
          filters={
            <Select value={stage} onValueChange={(v) => setStage(v as OnboardingStage | "all")}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All stages" : STAGE_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/admin-os/people-ops/onboarding/new">
                <Plus className="mr-2 h-4 w-4" /> New
              </Link>
            </Button>
          }
          className="mb-3"
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={isLoading}
          empty={{ title: "No onboardings", description: "Start a new onboarding to add someone to this queue." }}
          onRowClick={(r) => {
            window.location.href = `/admin-os/people-ops/onboarding/${r.employee_id}`;
          }}
        />
      </SectionCard>
    </div>
  );
}
