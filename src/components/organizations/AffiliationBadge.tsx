import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BadgeCheck, Building2 } from "lucide-react";
import { labelForRole } from "@/lib/affiliationRoles";

export type AffiliationChipData = {
  id: string;
  role: string;
  started_on: string | null;
  issued_at?: string | null;
  org: {
    id: string;
    name: string;
    username: string;
    logo_url: string | null;
    verified: boolean;
    org_type?: string | null;
  } | null;
};

const formatMonth = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

export const AffiliationChip = ({ data }: { data: AffiliationChipData }) => {
  const [open, setOpen] = useState(false);
  if (!data.org) return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-secondary/70 border border-border px-2 py-0.5 text-[11px] font-medium hover:border-primary/60 transition-colors"
        aria-label={`${labelForRole(data.role)} at ${data.org.name}`}
      >
        {data.org.logo_url ? (
          <img src={data.org.logo_url} alt="" className="h-4 w-4 rounded-full object-cover" />
        ) : (
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="truncate max-w-[120px]">{data.org.name}</span>
        {data.org.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="sr-only">Affiliation</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center gap-3 pt-1">
            {data.org.logo_url ? (
              <img src={data.org.logo_url} alt="" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-border" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-secondary grid place-items-center">
                <Building2 className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="text-base font-bold inline-flex items-center gap-1.5">
                {data.org.name}
                {data.org.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
              </p>
              <p className="text-xs text-muted-foreground">Affiliated with</p>
            </div>
          </div>

          <div className="mt-2 rounded-2xl border border-border divide-y divide-border text-sm">
            <Row label="Role" value={labelForRole(data.role)} />
            <Row label="Issued by" value={data.org.name} />
            {data.org.org_type && <Row label="Organization" value={data.org.org_type.replace(/_/g, " ")} />}
            <Row label="Since" value={formatMonth(data.started_on)} />
            {data.issued_at && <Row label="Issued on" value={formatMonth(data.issued_at)} />}
            <Row label="Status" value="Active" tone="primary" />
            <Row label="Verification" value={data.org.verified ? "Verified" : "Unverified"} />
          </div>

          <Link
            to={`/u/${data.org.username}`}
            onClick={() => setOpen(false)}
            className="mt-2 block w-full text-center py-3 rounded-2xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow"
          >
            Visit organization
          </Link>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Row = ({ label, value, tone }: { label: string; value: string; tone?: "primary" }) => (
  <div className="flex items-center justify-between px-3 py-2.5">
    <span className="text-muted-foreground">{label}</span>
    <span className={tone === "primary" ? "text-primary font-semibold" : "font-medium"}>{value}</span>
  </div>
);
