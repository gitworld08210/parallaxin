export const AFFILIATION_ROLES = [
  { value: "founder", label: "Founder" },
  { value: "co_founder", label: "Co-Founder" },
  { value: "ceo", label: "CEO" },
  { value: "cto", label: "CTO" },
  { value: "employee", label: "Employee" },
  { value: "brand_ambassador", label: "Brand Ambassador" },
  { value: "official_representative", label: "Official Representative" },
  { value: "advisor", label: "Advisor" },
  { value: "investor", label: "Investor" },
  { value: "moderator", label: "Moderator" },
] as const;

export type AffiliationRole = (typeof AFFILIATION_ROLES)[number]["value"];

export const labelForRole = (r: string) =>
  AFFILIATION_ROLES.find((x) => x.value === r)?.label ?? r;

export const ORG_TYPES = [
  { value: "company", label: "Company" },
  { value: "startup", label: "Startup" },
  { value: "education", label: "Educational Institution" },
  { value: "ngo", label: "NGO" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
] as const;
export type OrgType = (typeof ORG_TYPES)[number]["value"];
