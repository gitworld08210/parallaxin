// OrganizationMemberChip — compact badge showing a user's active membership
// in an organization. Clicking navigates to that organization's dashboard.
// Data-source only: organization_members, organization_roles, organizations
// (surfaced through memberService.listUserMemberships). No affiliation queries.
import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Building2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface OrganizationMemberChipData {
  id: string;
  joined_at: string | null;
  role_names: string[];
  is_owner: boolean;
  organization: {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    verified: boolean;
    org_type: string | null;
  } | null;
}

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

const primaryRoleName = (data: OrganizationMemberChipData) => {
  if (data.is_owner) return "Owner";
  return data.role_names[0] ?? "Member";
};

export const OrganizationMemberChip = ({ data }: { data: OrganizationMemberChipData }) => {
  const [open, setOpen] = useState(false);
  const org = data.organization;
  if (!org) return null;

  const roleLabel = primaryRoleName(data);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-[11px] font-medium transition-colors hover:border-primary/60"
        aria-label={`${roleLabel} at ${org.name}`}
      >
        {org.logo_url ? (
          <img src={org.logo_url} alt="" className="h-4 w-4 rounded-full object-cover" />
        ) : (
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="max-w-[120px] truncate">{org.name}</span>
        {org.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="sr-only">Organization membership</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3 pt-1 text-center">
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover ring-1 ring-border"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary">
                <Building2 className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="inline-flex items-center gap-1.5 text-base font-bold">
                {org.name}
                {org.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
              </p>
              <p className="text-xs text-muted-foreground">Organization</p>
            </div>
          </div>

          <div className="mt-2 divide-y divide-border rounded-2xl border border-border text-sm">
            <Row label="Role" value={roleLabel} tone={data.is_owner ? "primary" : undefined} />
            {org.org_type && (
              <Row label="Type" value={org.org_type.replace(/_/g, " ")} />
            )}
            <Row label="Joined" value={formatDate(data.joined_at)} />
            <Row label="Status" value="Active" tone="primary" />
            <Row label="Verification" value={org.verified ? "Verified" : "Unverified"} />
          </div>

          <Link
            to={`/organization/${org.slug}/dashboard`}
            onClick={() => setOpen(false)}
            className="mt-2 block w-full rounded-2xl bg-gradient-primary py-3 text-center text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Open organization
          </Link>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Row = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary";
}) => (
  <div className="flex items-center justify-between px-3 py-2.5">
    <span className="text-muted-foreground">{label}</span>
    <span className={tone === "primary" ? "font-semibold text-primary" : "font-medium"}>
      {value}
    </span>
  </div>
);

export default OrganizationMemberChip;
