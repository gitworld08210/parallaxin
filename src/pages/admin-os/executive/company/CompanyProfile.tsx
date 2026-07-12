import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyConfigurations, useUpsertConfiguration } from "@/hooks/admin-os/useCompanyConfig";

const PROFILE_FIELDS: { key: string; label: string; type?: "text" | "textarea" | "email" | "url" }[] = [
  { key: "company_name", label: "Company Name" },
  { key: "legal_name", label: "Legal Name" },
  { key: "website", label: "Website", type: "url" },
  { key: "support_email", label: "Support Email", type: "email" },
  { key: "official_phone", label: "Official Phone" },
  { key: "headquarters", label: "Headquarters" },
  { key: "registration_number", label: "Business Registration Number" },
  { key: "tax_id", label: "Tax ID / GSTIN" },
  { key: "description", label: "Company Description", type: "textarea" },
];

const CompanyProfile = () => {
  const { data: cfgs = [] } = useCompanyConfigurations("company_profile");
  const upsert = useUpsertConfiguration();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const v: Record<string, string> = {};
    cfgs.forEach((c: any) => { v[c.key] = c.value?.value ?? ""; });
    setValues(v);
  }, [cfgs]);

  const save = async (key: string, label: string) => {
    const existing = cfgs.find((c: any) => c.key === key);
    await upsert.mutateAsync({
      id: existing?.id,
      category: "company_profile",
      key,
      description: label,
      value: { value: values[key] ?? "" },
    });
  };

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Company Profile</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Manage official company identity and contact information. All changes are versioned.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {PROFILE_FIELDS.map((f) => (
          <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
            <Label className="text-xs">{f.label}</Label>
            {f.type === "textarea" ? (
              <Textarea
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                rows={4}
                className="mt-1"
              />
            ) : (
              <Input
                type={f.type ?? "text"}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                className="mt-1"
              />
            )}
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => save(f.key, f.label)} disabled={upsert.isPending}>
                Save
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default CompanyProfile;
