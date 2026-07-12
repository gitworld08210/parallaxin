import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanyConfigurations, useUpsertConfiguration } from "@/hooks/admin-os/useCompanyConfig";

const PREF_FIELDS: { key: string; label: string; type: string; options?: { v: string; l: string }[] }[] = [
  { key: "default_landing_page", label: "Default Landing Page", type: "text" },
  { key: "default_dashboard_layout", label: "Default Dashboard Layout", type: "select", options: [
    { v: "grid", l: "Grid" }, { v: "list", l: "List" }, { v: "compact", l: "Compact" },
  ]},
  { key: "session_timeout_minutes", label: "Session Timeout (minutes)", type: "number" },
  { key: "password_min_length", label: "Password Minimum Length", type: "number" },
  { key: "password_require_symbol", label: "Password Require Symbol", type: "select", options: [
    { v: "true", l: "Yes" }, { v: "false", l: "No" },
  ]},
  { key: "file_upload_max_mb", label: "Max File Upload (MB)", type: "number" },
  { key: "date_format", label: "Date Format", type: "select", options: [
    { v: "YYYY-MM-DD", l: "YYYY-MM-DD" }, { v: "DD/MM/YYYY", l: "DD/MM/YYYY" }, { v: "MM/DD/YYYY", l: "MM/DD/YYYY" },
  ]},
  { key: "time_format", label: "Time Format", type: "select", options: [
    { v: "24h", l: "24-hour" }, { v: "12h", l: "12-hour" },
  ]},
  { key: "default_currency", label: "Default Currency", type: "text" },
  { key: "measurement_units", label: "Measurement Units", type: "select", options: [
    { v: "metric", l: "Metric" }, { v: "imperial", l: "Imperial" },
  ]},
  { key: "notification_channels_default", label: "Default Notification Channels", type: "text" },
];

const PlatformPreferences = () => {
  const { data: cfgs = [] } = useCompanyConfigurations("platform_preferences");
  const upsert = useUpsertConfiguration();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const v: Record<string, string> = {};
    cfgs.forEach((c: any) => { v[c.key] = c.value?.value ?? ""; });
    setValues(v);
  }, [cfgs]);

  const save = async (f: typeof PREF_FIELDS[number]) => {
    const existing = cfgs.find((c: any) => c.key === f.key);
    await upsert.mutateAsync({
      id: existing?.id,
      category: "platform_preferences",
      key: f.key,
      description: f.label,
      value: { value: values[f.key] ?? "" },
    });
  };

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Platform Preferences</h2>
        <p className="text-xs text-muted-foreground mt-1">Session, security, formats, notifications and defaults.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {PREF_FIELDS.map((f) => (
          <div key={f.key}>
            <Label className="text-xs">{f.label}</Label>
            {f.type === "select" ? (
              <Select value={values[f.key] ?? ""} onValueChange={(v) => setValues({ ...values, [f.key]: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose..." /></SelectTrigger>
                <SelectContent>
                  {f.options?.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={f.type}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                className="mt-1"
              />
            )}
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => save(f)} disabled={upsert.isPending}>Save</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default PlatformPreferences;
