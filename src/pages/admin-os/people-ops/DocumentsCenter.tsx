import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  PageHeader,
  SectionCard,
  DataTable,
  type DataTableColumn,
  EmptyState,
} from "@/components/admin-os/ds";

const DOC_TYPE_LABELS: Record<string, string> = {
  offer_letter: "Offer Letter",
  appointment_letter: "Appointment Letter",
  nda: "NDA",
  government_id: "Government ID",
  education: "Education",
  experience: "Experience",
  promotion_letter: "Promotion Letter",
  warning: "Warning",
  exit_document: "Exit Document",
  other: "Other",
};

interface DocRow {
  id: string;
  employee_id: string;
  doc_type: string;
  title: string;
  version: number;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
  employee: { full_name: string; employee_number: string } | null;
}

const useAllDocuments = () =>
  useQuery({
    queryKey: ["admin-os", "documents-center"],
    queryFn: async (): Promise<DocRow[]> => {
      const { data, error } = await supabase
        .from("passport_documents")
        .select(
          `id, employee_id, doc_type, title, version, storage_bucket, storage_path, created_at,
           employee:employees!passport_documents_employee_id_fkey(full_name, employee_number)`,
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as DocRow[];
    },
  });

const DocumentsCenter = () => {
  const { hasPermission } = useEmployee();
  const { data: docs, isLoading, error } = useAllDocuments();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("");

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_VIEW))
    return <Navigate to="/admin-os/no-access" replace />;

  const filtered = useMemo(() => {
    let arr = docs ?? [];
    if (type) arr = arr.filter((d) => d.doc_type === type);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.employee?.full_name.toLowerCase().includes(q) ||
          d.employee?.employee_number.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [docs, search, type]);

  const download = async (row: DocRow) => {
    const { data, error } = await supabase.storage
      .from(row.storage_bucket)
      .createSignedUrl(row.storage_path, 60);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank");
  };

  const columns: DataTableColumn<DocRow>[] = [
    {
      key: "title",
      header: "Document",
      cell: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-medium">{r.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {DOC_TYPE_LABELS[r.doc_type] ?? r.doc_type} · v{r.version}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "employee",
      header: "Employee",
      cell: (r) =>
        r.employee ? (
          <Link
            to={`/admin-os/people-ops/${r.employee_id}/passport`}
            className="hover:underline"
          >
            <span className="font-medium">{r.employee.full_name}</span>
            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
              {r.employee.employee_number}
            </span>
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "created_at",
      header: "Uploaded",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {new Date(r.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <button
          type="button"
          onClick={() => download(r)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" /> Open
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Documents"
        title="Employment Documents Center"
        description="Every document uploaded across the workforce, versioned and access-controlled."
      />

      <SectionCard title="Filters" padded>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, employee, or ID"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
          >
            <option value="">All document types</option>
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      {error ? (
        <EmptyState title="Could not load documents" description={(error as Error).message} />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          loading={isLoading}
          empty={{
            title: "No documents yet",
            description: "Documents uploaded from any employee passport will appear here.",
          }}
        />
      )}
    </div>
  );
};

export default DocumentsCenter;
