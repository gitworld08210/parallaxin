import { useState } from "react";
import {
  Activity,
  BadgeCheck,
  Building2,
  Download,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ActivityItem,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  PermissionDenied,
  SectionCard,
  StatCard,
  StatusBadge,
  Toolbar,
  TONE_LABELS,
  type DataTableColumn,
  type StatusTone,
} from "@/components/admin-os/ds";

const TONES: StatusTone[] = [
  "active",
  "pending",
  "approved",
  "rejected",
  "suspended",
  "archived",
  "completed",
  "cancelled",
  "info",
  "warning",
  "danger",
  "inactive",
];

interface SampleRow {
  id: string;
  name: string;
  role: string;
  status: StatusTone;
}

const SAMPLE_ROWS: SampleRow[] = [
  { id: "1", name: "Aditi Sharma", role: "Head, People Ops", status: "active" },
  { id: "2", name: "Rahul Verma",  role: "Trust & Safety Lead", status: "pending" },
  { id: "3", name: "Meera Iyer",   role: "Finance Ops", status: "suspended" },
];

const COLUMNS: DataTableColumn<SampleRow>[] = [
  { key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
  { key: "role", header: "Role", cell: (r) => r.role },
  {
    key: "status",
    header: "Status",
    align: "right",
    cell: (r) => <StatusBadge tone={r.status} />,
  },
];

export default function DesignSystem() {
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Phase 1.13"
        title="Design System"
        description="The single source of truth for every Admin OS module. Every screen composes these primitives — no duplicate UI."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> Export tokens
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> New component
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Employees" value="248" delta="+12 this month" deltaTone="up" icon={Users} />
        <StatCard label="Departments" value="14" icon={Building2} />
        <StatCard label="Verifications" value="1,204" delta="+3.2%" deltaTone="up" icon={BadgeCheck} />
        <StatCard label="Active workflows" value={loadingValue()} loading icon={Activity} />
      </div>

      <SectionCard
        title="Status system"
        description="One tone scale used across every module. Extend tokens.ts to add a new tone."
      >
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <StatusBadge key={t} tone={t} label={TONE_LABELS[t]} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Data table"
        description="Uniform table shell. Callers supply columns + rows; loading and empty states are built in."
        actions={
          <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)}>
            Bulk archive
          </Button>
        }
      >
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search employees…"
          actions={<Button size="sm" variant="outline">Filters</Button>}
          className="mb-3"
        />
        <DataTable
          columns={COLUMNS}
          rows={SAMPLE_ROWS.filter((r) =>
            r.name.toLowerCase().includes(search.toLowerCase()),
          )}
          rowKey={(r) => r.id}
          empty={{ title: "No matches", description: "Adjust the search or filters." }}
        />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Activity feed" description="Uniform row for audit and activity streams.">
          <div className="space-y-2">
            <ActivityItem
              title="Meera Iyer approved a payout request"
              meta="Finance · Approval #2041"
              timestamp="2m ago"
            />
            <ActivityItem
              title="New verification submitted"
              meta="Verification · Case V-8814"
              timestamp="14m ago"
            />
            <ActivityItem
              title="Workflow 'Onboarding v3' updated"
              meta="Platform · Workflow Engine"
              timestamp="1h ago"
            />
          </div>
        </SectionCard>

        <SectionCard title="Loading & empty states">
          <div className="space-y-4">
            <LoadingSkeleton rows={2} />
            <EmptyState
              title="Nothing here yet"
              description="When items are created, they'll show up in this list."
              action={<Button size="sm">Create item</Button>}
            />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Error state">
          <ErrorState onRetry={() => undefined} />
        </SectionCard>
        <SectionCard title="Permission denied">
          <PermissionDenied />
        </SectionCard>
      </div>

      <SectionCard
        title="Confirmations"
        description="Every destructive action must route through ConfirmDialog."
      >
        <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
          Trigger confirm
        </Button>
      </SectionCard>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Archive selected employees?"
        description="Archived employees lose access immediately. This action is reversible for 30 days."
        destructive
        confirmLabel="Archive"
        onConfirm={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function loadingValue(): string {
  return "—";
}
