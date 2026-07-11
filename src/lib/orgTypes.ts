// Canonical organization-type option list. Used by every form/select that
// needs a labelled dropdown for `organizations.org_type`. Values must match
// the `OrgType` union in `@/types/organization/organization`.
import type { OrgType } from "@/types/organization/organization";

export const ORG_TYPES: ReadonlyArray<{ value: OrgType; label: string }> = [
  { value: "company", label: "Company" },
  { value: "startup", label: "Startup" },
  { value: "ngo", label: "Nonprofit / NGO" },
  { value: "community", label: "Community" },
  { value: "government", label: "Government" },
  { value: "education", label: "Educational Institution" },
  { value: "creator", label: "Creator" },
  { value: "other", label: "Other" },
];

export const labelForOrgType = (v: string | null | undefined) =>
  ORG_TYPES.find((o) => o.value === v)?.label ?? "";
